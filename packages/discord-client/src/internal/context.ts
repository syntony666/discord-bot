import { InteractionResponseType, MessageFlags } from 'discord-api-types/v10';
import type {
  APIChatInputApplicationCommandInteraction,
  APIInteractionResponse,
  APIMessageComponentInteraction,
  APIModalSubmitInteraction,
  APIUser,
} from 'discord-api-types/v10';
import type {
  CommandContext,
  ComponentContext,
  ConfirmOptions,
  ModalOptions,
  PaginateOptions,
  PromptOptions,
  ReplyData,
} from '../context.type';
import type { CommandRoute, Interaction, SessionApi } from './context.type';
import { ORIGINAL_MESSAGE, type Resources } from './resources';
import { withEmbedDefaults, type EmbedTheme } from './embeds';

function normalize(data: ReplyData) {
  return typeof data === 'string' ? { content: data } : data;
}

function interactionUser(i: Interaction): APIUser {
  const user = i.user ?? i.member?.user;
  if (!user) throw new Error('interaction has no user');
  return user;
}

function baseMethods(
  resources: Resources,
  appId: string,
  sessions: SessionApi,
  i: Interaction,
  theme: EmbedTheme
) {
  let responded = false;
  const username = interactionUser(i).username;

  const withTheme = (data: ReplyData) => {
    const d = normalize(data);
    if (!d.embeds?.length) return d;
    return { ...d, embeds: d.embeds.map((e) => withEmbedDefaults(e, username, theme)) };
  };

  const callback = (body: APIInteractionResponse) =>
    resources
      .interaction(i.id, i.token)
      .respond(body)
      .then(() => {
        responded = true;
      });

  return {
    reply: (data: ReplyData, ephemeral = false) =>
      callback({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          ...withTheme(data),
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
        data: withTheme(data),
      }),

    deferUpdate: () => callback({ type: InteractionResponseType.DeferredMessageUpdate }),

    followUp: (data: ReplyData) =>
      resources
        .webhook(appId, i.token)
        .execute(withTheme(data))
        .then(() => undefined),

    editReply: (data: ReplyData) =>
      resources
        .webhook(appId, i.token)
        .message(ORIGINAL_MESSAGE)
        .edit(withTheme(data))
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
  route: CommandRoute,
  theme: EmbedTheme
): CommandContext {
  const base = baseMethods(resources, appId, sessions, interaction, theme);
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
      base.reply({ embeds: [{ title: '✅', description, color: theme.colors.success }] }),
    error: (description) =>
      base.reply({ embeds: [{ title: '❌ 錯誤', description, color: theme.colors.error }] }, true),
  };
}

export function buildComponentContext(
  resources: Resources,
  appId: string,
  sessions: SessionApi,
  interaction: APIMessageComponentInteraction | APIModalSubmitInteraction,
  params: Record<string, string>,
  theme: EmbedTheme
): ComponentContext {
  const base = baseMethods(resources, appId, sessions, interaction, theme);
  return {
    interaction,
    customId: interaction.data.custom_id,
    params,
    guildId: interaction.guild_id,
    user: interactionUser(interaction),
    ...base,
  };
}
