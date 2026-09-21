import {
  InteractionResponseType,
  MessageFlags,
  Routes,
} from 'discord-api-types/v10';
import type {
  APIChatInputApplicationCommandInteraction,
  APIEmbed,
  APIInteraction,
  APIInteractionResponseCallbackData,
  APIMessage,
  APIMessageComponentInteraction,
  APIModalSubmitInteraction,
  APIUser,
} from 'discord-api-types/v10';
import type { REST } from '@discordjs/rest';

export interface ConfirmOptions {
  title?: string;
  description: string;
  fields?: APIEmbed['fields'];
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  timeoutMs?: number;
}

export interface PaginateOptions<T> {
  items: T[];
  render(page: T[], pageIndex: number, totalPages: number): APIEmbed;
  pageSize?: number;
  emptyText?: string;
  timeoutMs?: number;
}

export interface ModalField {
  id: string;
  label: string;
  style?: 'short' | 'paragraph';
  value?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}

export interface ModalOptions {
  title: string;
  fields: ModalField[];
  timeoutMs?: number;
}

export interface PromptOptions {
  content: string;
  timeoutMs?: number;
  filter?: (message: APIMessage) => boolean;
}

/** Implemented by the session store (created in sessions.ts). */
export interface SessionApi {
  confirm(interaction: APIInteraction, options: ConfirmOptions): Promise<boolean>;
  paginate<T>(interaction: APIInteraction, options: PaginateOptions<T>): Promise<void>;
  modal(
    interaction: APIInteraction,
    options: ModalOptions
  ): Promise<Record<string, string> | null>;
  prompt(interaction: APIInteraction, options: PromptOptions): Promise<APIMessage | null>;
}

type Interaction =
  | APIChatInputApplicationCommandInteraction
  | APIMessageComponentInteraction
  | APIModalSubmitInteraction;

type ReplyData = APIInteractionResponseCallbackData | string;

export interface CommandContext<
  TOptions = Record<string, unknown>,
  TSubcommand extends string = string,
  TGroup extends string = string,
> {
  readonly interaction: APIChatInputApplicationCommandInteraction;
  readonly command: string;
  readonly subcommand?: TSubcommand;
  readonly subcommandGroup?: TGroup;
  readonly options: TOptions;
  readonly guildId?: string;
  readonly user: APIUser;

  reply(data: ReplyData, ephemeral?: boolean): Promise<void>;
  success(description: string): Promise<void>;
  error(description: string): Promise<void>;
  defer(ephemeral?: boolean): Promise<void>;
  followUp(data: ReplyData): Promise<void>;
  editReply(data: ReplyData): Promise<void>;

  confirm(options: ConfirmOptions): Promise<boolean>;
  paginate<T>(options: PaginateOptions<T>): Promise<void>;
  modal(options: ModalOptions): Promise<Record<string, string> | null>;
  prompt(options: PromptOptions): Promise<APIMessage | null>;
}

export interface ComponentContext {
  readonly interaction: APIMessageComponentInteraction | APIModalSubmitInteraction;
  readonly customId: string;
  readonly params: Record<string, string>;
  readonly guildId?: string;
  readonly user: APIUser;

  reply(data: ReplyData, ephemeral?: boolean): Promise<void>;
  update(data: ReplyData): Promise<void>;
  deferUpdate(): Promise<void>;
  followUp(data: ReplyData): Promise<void>;

  confirm(options: ConfirmOptions): Promise<boolean>;
  paginate<T>(options: PaginateOptions<T>): Promise<void>;
  modal(options: ModalOptions): Promise<Record<string, string> | null>;
  prompt(options: PromptOptions): Promise<APIMessage | null>;
}

const EMBED_OK = 0x57f287;
const EMBED_ERR = 0xed4245;

function normalize(data: ReplyData): APIInteractionResponseCallbackData {
  return typeof data === 'string' ? { content: data } : data;
}

function interactionUser(i: Interaction): APIUser {
  const user = i.user ?? i.member?.user;
  if (!user) throw new Error('interaction has no user');
  return user;
}

function baseMethods(rest: REST, appId: string, sessions: SessionApi, i: Interaction) {
  return {
    reply: (data: ReplyData, ephemeral = false) =>
      rest.post(Routes.interactionCallback(i.id, i.token), {
        body: {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            ...normalize(data),
            ...(ephemeral ? { flags: MessageFlags.Ephemeral } : {}),
          },
        },
      }) as Promise<unknown> as Promise<void>,

    defer: (ephemeral = false) =>
      rest.post(Routes.interactionCallback(i.id, i.token), {
        body: {
          type: InteractionResponseType.DeferredChannelMessageWithSource,
          data: ephemeral ? { flags: MessageFlags.Ephemeral } : undefined,
        },
      }) as Promise<unknown> as Promise<void>,

    followUp: (data: ReplyData) =>
      rest.post(Routes.webhook(appId, i.token), {
        body: normalize(data),
      }) as Promise<unknown> as Promise<void>,

    editReply: (data: ReplyData) =>
      rest.patch(Routes.webhookMessage(appId, i.token, '@original'), {
        body: normalize(data),
      }) as Promise<unknown> as Promise<void>,

    confirm: (options: ConfirmOptions) => sessions.confirm(i, options),
    paginate: <T>(options: PaginateOptions<T>) => sessions.paginate(i, options),
    modal: (options: ModalOptions) => sessions.modal(i, options),
    prompt: (options: PromptOptions) => sessions.prompt(i, options),
  };
}

export interface CommandRoute {
  command: string;
  subcommand?: string;
  subcommandGroup?: string;
  options: Record<string, unknown>;
}

export function buildCommandContext(
  rest: REST,
  appId: string,
  sessions: SessionApi,
  interaction: APIChatInputApplicationCommandInteraction,
  route: CommandRoute
): CommandContext {
  const base = baseMethods(rest, appId, sessions, interaction);
  return {
    interaction,
    command: route.command,
    subcommand: route.subcommand,
    subcommandGroup: route.subcommandGroup,
    options: route.options,
    guildId: interaction.guild_id,
    user: interactionUser(interaction),
    ...base,

    success: (description) =>
      base.reply({ embeds: [{ title: '✅', description, color: EMBED_OK }] }),
    error: (description) =>
      base.reply(
        { embeds: [{ title: '❌', description, color: EMBED_ERR }] },
        true
      ),
  };
}

export function buildComponentContext(
  rest: REST,
  appId: string,
  sessions: SessionApi,
  interaction: APIMessageComponentInteraction | APIModalSubmitInteraction,
  params: Record<string, string>
): ComponentContext {
  const base = baseMethods(rest, appId, sessions, interaction);
  return {
    interaction,
    customId: interaction.data.custom_id,
    params,
    guildId: interaction.guild_id,
    user: interactionUser(interaction),
    ...base,

    update: (data: ReplyData) =>
      rest.post(Routes.interactionCallback(interaction.id, interaction.token), {
        body: {
          type: InteractionResponseType.UpdateMessage,
          data: normalize(data),
        },
      }) as Promise<unknown> as Promise<void>,

    deferUpdate: () =>
      rest.post(Routes.interactionCallback(interaction.id, interaction.token), {
        body: { type: InteractionResponseType.DeferredMessageUpdate },
      }) as Promise<unknown> as Promise<void>,
  };
}
