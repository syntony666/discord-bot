import { ComponentType, InteractionResponseType, MessageFlags } from 'discord-api-types/v10';
import type {
  APIChatInputApplicationCommandInteraction,
  APIEmbed,
  APIInteractionResponse,
  APIMessage,
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
import { avatarUrlOf, withEmbedDefaults, type EmbedTheme } from './embeds';
import { COMPONENT_MAX_AGE_MS } from './sessions/store';

function normalize(data: ReplyData) {
  return typeof data === 'string' ? { content: data } : data;
}

const hasInteractiveComponents = (data: ReplyData): boolean =>
  (normalize(data).components ?? []).some(
    (r) =>
      r.type === ComponentType.ActionRow &&
      r.components.some((c) => 'custom_id' in c && !!c.custom_id)
  );

export function interactionUser(i: Interaction): APIUser {
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
  const iUser = interactionUser(i);
  const username = iUser.username;

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

  const reply = (data: ReplyData, ephemeral = false) =>
    callback({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        ...withTheme(data),
        ...(ephemeral ? { flags: MessageFlags.Ephemeral } : {}),
      },
    }).then(() => {
      if (hasInteractiveComponents(data)) {
        sessions.expireComponents(i.token, ORIGINAL_MESSAGE, COMPONENT_MAX_AGE_MS);
      }
    });

  const editReply = (data: ReplyData) =>
    resources
      .webhook(appId, i.token)
      .message(ORIGINAL_MESSAGE)
      .edit(withTheme(data))
      .then(() => undefined);

  const confirm = (options: ConfirmOptions) => sessions.confirm(i, options, responded);

  const followUp = (data: ReplyData) => {
    const interactive = hasInteractiveComponents(data);
    return resources
      .webhook(appId, i.token)
      .execute(withTheme(data), interactive)
      .then((msg) => {
        if (interactive) {
          sessions.expireComponents(i.token, (msg as APIMessage).id, COMPONENT_MAX_AGE_MS);
        }
      });
  };

  // --- semantic replies -----------------------------------------------------

  const embed = (e: APIEmbed, ephemeral = false) => reply({ embeds: [e] }, ephemeral);
  const editEmbed = (e: APIEmbed) => editReply({ embeds: [e], components: [] });
  const success = (title: string, description?: string) =>
    embed({ title, description, color: theme.colors.success });
  const error = (title: string, description?: string, ephemeral = true) =>
    embed({ title: `❌ ${title}`, description, color: theme.colors.error }, ephemeral);
  const info = (title: string, description?: string) =>
    embed({ title, description, color: theme.colors.info });
  const editSuccess = (title: string, description?: string) =>
    editEmbed({ title, description, color: theme.colors.success });
  const editError = (title: string, description?: string) =>
    editEmbed({ title: `❌ ${title}`, description, color: theme.colors.error });
  const cancelled = () =>
    editEmbed({ title: '已取消', description: '操作已取消。', color: theme.colors.info });
  const confirmed = async (options: ConfirmOptions): Promise<boolean> => {
    if (await confirm(options)) return true;
    await cancelled();
    return false;
  };
  const require = async <T>(
    fetcher: () => Promise<T | null | undefined>,
    errorTitle: string,
    opts?: { description?: string; ephemeral?: boolean }
  ): Promise<T | null> => {
    const v = await fetcher();
    if (v == null) {
      await error(errorTitle, opts?.description, opts?.ephemeral);
      return null;
    }
    return v;
  };

  const operatorAuthor = {
    name: iUser.global_name ?? iUser.username,
    icon_url: avatarUrlOf(iUser),
  };
  const announce = (e: APIEmbed) =>
    followUp({ embeds: [{ ...e, author: e.author ?? operatorAuthor }] });
  const announceSuccess = (title: string, description?: string) =>
    announce({ title, description, color: theme.colors.success });

  return {
    reply,
    editReply,
    success,
    error,
    info,
    embed,
    editEmbed,
    editSuccess,
    editError,
    cancelled,
    confirmed,
    require,
    confirm,
    announce,
    announceSuccess,

    defer: (ephemeral = false) =>
      callback({
        type: InteractionResponseType.DeferredChannelMessageWithSource,
        data: ephemeral ? { flags: MessageFlags.Ephemeral } : undefined,
      }),

    update: (data: ReplyData) =>
      callback({
        type: InteractionResponseType.UpdateMessage,
        data: withTheme(data),
      }).then(() => {
        if (hasInteractiveComponents(data)) {
          sessions.expireComponents(i.token, ORIGINAL_MESSAGE, COMPONENT_MAX_AGE_MS);
        }
      }),

    deferUpdate: () => callback({ type: InteractionResponseType.DeferredMessageUpdate }),

    followUp,

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
