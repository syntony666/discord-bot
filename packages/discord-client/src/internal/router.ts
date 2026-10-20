import {
  ApplicationCommandType,
  InteractionResponseType,
  InteractionType,
  MessageFlags,
} from 'discord-api-types/v10';
import type {
  APIApplicationCommandInteractionDataOption,
  APIChatInputApplicationCommandInteraction,
  APIInteraction,
  APIMessageComponentInteraction,
  APIModalSubmitInteraction,
} from 'discord-api-types/v10';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';
import type { Resources } from './resources';
import { buildCommandContext, buildComponentContext, interactionUser } from './context';
import type { SessionApi } from './sessions/store.type';
import { COMPONENT_MAX_AGE_MS } from './sessions/store';
import type {
  CommandHandler,
  CommandRoute,
  ComponentHandler,
  ComponentRoute,
  SessionDispatcher,
} from './router.type';
import type { CommandDef } from '../commands.type';
import { usernameOf, withEmbedDefaults, type EmbedTheme } from './embeds';

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

const isChatInput = (i: APIInteraction): i is APIChatInputApplicationCommandInteraction =>
  i.type === InteractionType.ApplicationCommand && i.data.type === ApplicationCommandType.ChatInput;

const parseRoute = (i: APIChatInputApplicationCommandInteraction): CommandRoute => {
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
  resources: Resources,
  appId: string,
  sessions: SessionApi & SessionDispatcher,
  onError: (err: unknown) => void,
  theme: EmbedTheme,
  isOwner: (userId: string) => boolean = () => false
) {
  const commands = new Map<string, { def: CommandDef; handlers: Record<string, CommandHandler> }>();
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

  const addComponent = (
    pattern: string,
    handler: ComponentHandler,
    opts?: { sameUser?: boolean }
  ) => {
    const compiled = compilePattern(pattern);
    components.push({ ...compiled, handler, sameUser: opts?.sameUser });
  };

  const handleChatInput = async (i: APIChatInputApplicationCommandInteraction) => {
    const entry = commands.get(i.data.name);
    if (!entry) return false;
    const route = parseRoute(i);
    const key = [route.subcommandGroup, route.subcommand].filter(Boolean).join('.');
    const handler = entry.handlers[key || route.command];
    if (!handler) return false;

    const ctx = buildCommandContext(resources, appId, sessions, i, route, theme);
    if (entry.def.ownerOnly && !isOwner(ctx.user.id)) {
      await ctx.reply(
        {
          embeds: [
            {
              title: '🔒',
              description: '此指令僅限機器人作者使用',
              color: theme.colors.error,
            },
          ],
        },
        true
      );
      return true;
    }
    try {
      await handler(ctx);
    } catch (err) {
      onError(err);
      // Surface a generic error to the user instead of leaving the
      // interaction unacknowledged ("application did not respond").
      const data = {
        embeds: [
          {
            title: '❌ 錯誤',
            description: '指令執行時發生錯誤，請稍後再試。',
            color: theme.colors.error,
          },
        ],
        components: [],
      };
      await ctx
        .editReply(data)
        .catch(() => ctx.reply(data, true))
        .catch(() => undefined);
    }
    return true;
  };

  const handleComponent = async (i: APIMessageComponentInteraction | APIModalSubmitInteraction) => {
    const customId = i.data.custom_id;
    for (const route of components) {
      const m = route.pattern.exec(customId);
      if (!m) continue;
      // Route components expire with their host message; strip dead buttons
      // and tell the clicker (covers process restarts — timers are in-memory).
      if (i.type === InteractionType.MessageComponent) {
        const ts = i.message?.timestamp;
        if (ts && Date.now() - Date.parse(ts) > COMPONENT_MAX_AGE_MS) {
          await resources
            .interaction(i.id, i.token)
            .respond({ type: InteractionResponseType.UpdateMessage, data: { components: [] } })
            .catch(() => undefined);
          await resources
            .webhook(appId, i.token)
            .execute({
              embeds: [
                withEmbedDefaults(
                  {
                    title: '❌ 操作已過期',
                    description: '請重新執行指令。',
                    color: theme.colors.error,
                  },
                  usernameOf(i),
                  theme
                ),
              ],
              flags: MessageFlags.Ephemeral,
            })
            .catch(() => undefined);
          return true;
        }
      }
      const params: Record<string, string> = {};
      route.params.forEach((name, idx) => {
        params[name] = m[idx + 1]!;
      });
      const ctx = buildComponentContext(resources, appId, sessions, i, params, theme);
      if (route.sameUser) {
        // Owner of the message this component lives on — resolvable only for
        // message-component interactions. Fail closed when unresolvable.
        const owner =
          i.type === InteractionType.MessageComponent
            ? (i.message?.interaction_metadata?.user?.id ?? i.message?.interaction?.user?.id)
            : undefined;
        if (!owner || interactionUser(i).id !== owner) {
          await ctx.reply(
            {
              embeds: [
                {
                  title: '🔒',
                  description: '此操作僅限指令原使用者',
                  color: theme.colors.error,
                },
              ],
            },
            true
          );
          return true;
        }
      }
      await route.handler(ctx);
      return true;
    }
    return false;
  };

  const handle = async (i: APIInteraction): Promise<boolean> => {
    if (i.type === InteractionType.MessageComponent || i.type === InteractionType.ModalSubmit) {
      if (await sessions.dispatch(i)) return true;
      return handleComponent(i);
    }
    if (isChatInput(i)) return handleChatInput(i);
    return false;
  };

  const claims = (i: APIInteraction): boolean => {
    if (i.type === InteractionType.MessageComponent || i.type === InteractionType.ModalSubmit) {
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
