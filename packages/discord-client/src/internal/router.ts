import { ApplicationCommandType, InteractionType } from 'discord-api-types/v10';
import type {
  APIApplicationCommandInteractionDataOption,
  APIChatInputApplicationCommandInteraction,
  APIInteraction,
  APIMessageComponentInteraction,
  APIModalSubmitInteraction,
} from 'discord-api-types/v10';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';
import type { REST } from '@discordjs/rest';
import { buildCommandContext, buildComponentContext } from './context';
import type {
  CommandContext,
  CommandRoute,
  ComponentContext,
  SessionApi,
} from './context';
import type { CommandDef } from '../commands';

export type CommandHandler = (ctx: CommandContext) => void | Promise<void>;
export type ComponentHandler = (ctx: ComponentContext) => void | Promise<void>;

interface ComponentRoute {
  pattern: RegExp;
  params: string[];
  handler: ComponentHandler;
}

interface SessionDispatcher {
  claims(customId: string): boolean;
  dispatch(interaction: APIInteraction): Promise<boolean>;
}

/** Handler keys a command def accepts: 'add', 'panel.create', or the command
 *  name itself when it has no subcommands. */
export function handlerKeys(def: CommandDef): string[] {
  const keys: string[] = [];
  for (const sub of def.subcommands ?? []) keys.push(sub.name);
  for (const group of def.groups ?? []) {
    for (const sub of group.subcommands) keys.push(`${group.name}.${sub.name}`);
  }
  return keys.length ? keys : [def.command];
}

const flattenOptions = (
  options: APIApplicationCommandInteractionDataOption[] | undefined,
  resolved: APIChatInputApplicationCommandInteraction['data']['resolved']
): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const o of options ?? []) {
    if (!('value' in o)) continue;
    switch (o.type) {
      case ApplicationCommandOptionType.User:
        out[o.name] = resolved?.users?.[o.value] ?? o.value;
        break;
      case ApplicationCommandOptionType.Role:
        out[o.name] = resolved?.roles?.[o.value] ?? o.value;
        break;
      case ApplicationCommandOptionType.Channel:
        out[o.name] = resolved?.channels?.[o.value] ?? o.value;
        break;
      case ApplicationCommandOptionType.Attachment:
        out[o.name] = resolved?.attachments?.[o.value] ?? o.value;
        break;
      case ApplicationCommandOptionType.Mentionable: {
        const v = resolved?.users?.[o.value] ?? resolved?.roles?.[o.value];
        out[o.name] = v ?? o.value;
        break;
      }
      default:
        out[o.name] = o.value;
    }
  }
  return out;
};

const isChatInput = (
  i: APIInteraction
): i is APIChatInputApplicationCommandInteraction =>
  i.type === InteractionType.ApplicationCommand &&
  i.data.type === ApplicationCommandType.ChatInput;

const parseRoute = (
  i: APIChatInputApplicationCommandInteraction
): CommandRoute => {
  const [first] = i.data.options ?? [];
  const resolved = i.data.resolved;

  if (first?.type === ApplicationCommandOptionType.SubcommandGroup) {
    const sub = first.options?.[0];
    return {
      command: i.data.name,
      subcommandGroup: first.name,
      subcommand: sub?.name,
      options: flattenOptions(sub?.options, resolved),
    };
  }
  if (first?.type === ApplicationCommandOptionType.Subcommand) {
    return {
      command: i.data.name,
      subcommand: first.name,
      options: flattenOptions(first.options, resolved),
    };
  }
  return {
    command: i.data.name,
    options: flattenOptions(i.data.options, resolved),
  };
};

/** 'rr:role:{panel}:{role}' → /^rr:role:([^:]+):([^:]+)$/ + ['panel','role'] */
const compilePattern = (pattern: string) => {
  const params: string[] = [];
  const source = pattern.replace(/\{(\w+)\}/g, (_, name) => {
    params.push(name);
    return '([^:]+)';
  });
  return { pattern: new RegExp(`^${source}$`), params };
};

export function createCommandRouter(
  rest: REST,
  appId: string,
  sessions: SessionApi & SessionDispatcher,
  onError: (err: unknown) => void
) {
  const commands = new Map<
    string,
    { def: CommandDef; handlers: Record<string, CommandHandler> }
  >();
  const components: ComponentRoute[] = [];

  const addCommand = (def: CommandDef, handlers: Record<string, CommandHandler>) => {
    const valid = new Set(handlerKeys(def));
    for (const key of Object.keys(handlers)) {
      if (!valid.has(key)) {
        throw new Error(`unknown handler key '${key}' for /${def.command}`);
      }
    }
    commands.set(def.command, { def, handlers });
  };

  const addComponent = (pattern: string, handler: ComponentHandler) => {
    const compiled = compilePattern(pattern);
    components.push({ ...compiled, handler });
  };

  const handleChatInput = async (
    i: APIChatInputApplicationCommandInteraction
  ) => {
    const entry = commands.get(i.data.name);
    if (!entry) return false;
    const route = parseRoute(i);
    const key = [route.subcommandGroup, route.subcommand]
      .filter(Boolean)
      .join('.');
    const handler = entry.handlers[key || route.command];
    if (!handler) return false;

    const ctx = buildCommandContext(rest, appId, sessions, i, route);
    await handler(ctx);
    return true;
  };

  const handleComponent = async (
    i: APIMessageComponentInteraction | APIModalSubmitInteraction
  ) => {
    const customId = i.data.custom_id;
    for (const route of components) {
      const m = route.pattern.exec(customId);
      if (!m) continue;
      const params: Record<string, string> = {};
      route.params.forEach((name, idx) => {
        params[name] = m[idx + 1]!;
      });
      const ctx = buildComponentContext(rest, appId, sessions, i, params);
      await route.handler(ctx);
      return true;
    }
    return false;
  };

  const handle = async (i: APIInteraction): Promise<boolean> => {
    if (
      i.type === InteractionType.MessageComponent ||
      i.type === InteractionType.ModalSubmit
    ) {
      if (await sessions.dispatch(i)) return true;
      return handleComponent(i);
    }
    if (isChatInput(i)) return handleChatInput(i);
    return false;
  };

  const claims = (i: APIInteraction): boolean => {
    if (
      i.type === InteractionType.MessageComponent ||
      i.type === InteractionType.ModalSubmit
    ) {
      const customId = i.data.custom_id;
      if (sessions.claims(customId)) return true;
      return components.some((r) => r.pattern.test(customId));
    }
    return isChatInput(i) && commands.has(i.data.name);
  };

  return {
    addCommand,
    addComponent,
    claims,
    handle: (i: APIInteraction) => handle(i).catch((err) => (onError(err), true)),
  };
}

export type CommandRouter = ReturnType<typeof createCommandRouter>;
