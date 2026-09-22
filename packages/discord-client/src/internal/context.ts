import { InteractionResponseType, MessageFlags } from 'discord-api-types/v10';
import type {
  APIChatInputApplicationCommandInteraction,
  APIInteraction,
  APIInteractionResponse,
  APIMessage,
  APIMessageComponentInteraction,
  APIModalSubmitInteraction,
  APIUser,
  RESTPatchAPIWebhookWithTokenMessageJSONBody,
  RESTPostAPIWebhookWithTokenJSONBody,
} from 'discord-api-types/v10';
import type {
  CommandContext,
  ComponentContext,
  ConfirmOptions,
  ModalOptions,
  PaginateOptions,
  PromptOptions,
  ReplyData,
} from '../context';
import type { Resources } from './resources';

/** Implemented by the session store (created in sessions.ts). */
export interface SessionApi {
  confirm(
    interaction: APIInteraction,
    options: ConfirmOptions,
    responded: boolean
  ): Promise<boolean>;
  paginate<T>(
    interaction: APIInteraction,
    options: PaginateOptions<T>,
    responded: boolean
  ): Promise<void>;
  modal(
    interaction: APIInteraction,
    options: ModalOptions,
    responded: boolean
  ): Promise<Record<string, string> | null>;
  prompt(
    interaction: APIInteraction,
    options: PromptOptions,
    responded: boolean
  ): Promise<APIMessage | null>;
}

type Interaction =
  | APIChatInputApplicationCommandInteraction
  | APIMessageComponentInteraction
  | APIModalSubmitInteraction;

export interface CommandRoute {
  command: string;
  subcommand?: string;
  subcommandGroup?: string;
  options: Record<string, unknown>;
}

const EMBED_OK = 0x57f287;
const EMBED_ERR = 0xed4245;

function normalize(data: ReplyData) {
  return typeof data === 'string' ? { content: data } : data;
}

function interactionUser(i: Interaction): APIUser {
  const user = i.user ?? i.member?.user;
  if (!user) throw new Error('interaction has no user');
  return user;
}

function baseMethods(resources: Resources, appId: string, sessions: SessionApi, i: Interaction) {
  let responded = false;

  const callback = (body: APIInteractionResponse) =>
    resources.interaction(i.id, i.token).respond(body).then(() => {
      responded = true;
    });

  return {
    reply: (data: ReplyData, ephemeral = false) =>
      callback({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          ...normalize(data),
          ...(ephemeral ? { flags: MessageFlags.Ephemeral } : {}),
        },
      }),

    defer: (ephemeral = false) =>
      callback({
        type: InteractionResponseType.DeferredChannelMessageWithSource,
        data: ephemeral ? { flags: MessageFlags.Ephemeral } : undefined,
      }),

    update: (data: ReplyData) =>
      callback({
        type: InteractionResponseType.UpdateMessage,
        data: normalize(data),
      }),

    deferUpdate: () =>
      callback({ type: InteractionResponseType.DeferredMessageUpdate }),

    followUp: (data: ReplyData) =>
      resources
        .webhook(appId, i.token)
        .execute(normalize(data) as RESTPostAPIWebhookWithTokenJSONBody)
        .then(() => undefined),

    editReply: (data: ReplyData) =>
      resources
        .webhook(appId, i.token)
        .message('@original')
        .edit(normalize(data) as RESTPatchAPIWebhookWithTokenMessageJSONBody)
        .then(() => undefined),

    confirm: (options: ConfirmOptions) => sessions.confirm(i, options, responded),
    paginate: <T>(options: PaginateOptions<T>) => sessions.paginate(i, options, responded),
    modal: (options: ModalOptions) => sessions.modal(i, options, responded),
    prompt: (options: PromptOptions) => sessions.prompt(i, options, responded),
  };
}

export function buildCommandContext(
  resources: Resources,
  appId: string,
  sessions: SessionApi,
  interaction: APIChatInputApplicationCommandInteraction,
  route: CommandRoute
): CommandContext {
  const base = baseMethods(resources, appId, sessions, interaction);
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
  resources: Resources,
  appId: string,
  sessions: SessionApi,
  interaction: APIMessageComponentInteraction | APIModalSubmitInteraction,
  params: Record<string, string>
): ComponentContext {
  const base = baseMethods(resources, appId, sessions, interaction);
  return {
    interaction,
    customId: interaction.data.custom_id,
    params,
    guildId: interaction.guild_id,
    user: interactionUser(interaction),
    ...base,
  };
}
