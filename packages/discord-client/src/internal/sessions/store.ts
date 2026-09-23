import { randomUUID } from 'node:crypto';
import {
  ButtonStyle,
  ComponentType,
  InteractionResponseType,
  InteractionType,
  MessageFlags,
  TextInputStyle,
} from 'discord-api-types/v10';
import type {
  APIEmbed,
  APIInteraction,
  APIInteractionResponseCallbackData,
  APIMessage,
  APIMessageComponentInteraction,
  APIModalSubmitInteraction,
} from 'discord-api-types/v10';
import { ORIGINAL_MESSAGE, type Resources } from '../resources';
import type { PaginateOptions } from '../../context.type';
import type { SessionApi } from '../context.type';
import type { PaginatePending, Pending, Waiter } from './store.type';
import {
  button,
  modalFieldValues,
  paginateEmbed,
  paginateRow,
  row,
} from './components';
import { usernameOf, withEmbedDefaults, type UiConfig } from '../embeds';

const PREFIX = 'kit:';
const DEFAULT_CONFIRM_TIMEOUT = 120_000;
const DEFAULT_PAGINATE_TIMEOUT = 5 * 60_000;
const DEFAULT_MODAL_TIMEOUT = 5 * 60_000;
const DEFAULT_PROMPT_TIMEOUT = 60_000;

export function createSessionStore(
  resources: Resources,
  appId: string,
  onError?: (err: unknown) => void,
  ui?: UiConfig
) {
  const pending = new Map<string, Pending>();
  const waiters = new Map<string, Waiter>();

  const fail = (err: unknown) => onError?.(err);

  const arm = (
    id: string,
    session: Pending,
    timeoutMs: number,
    onTimeout: () => void
  ) => {
    session.timer = setTimeout(() => {
      pending.delete(id);
      try {
        onTimeout();
      } catch (err) {
        fail(err);
      }
    }, timeoutMs);
    pending.set(id, session);
  };

  const send = (
    i: APIInteraction,
    data: APIInteractionResponseCallbackData,
    responded: boolean
  ): Promise<{ token: string; messageId: string }> => {
    if (responded) {
      return resources
        .webhook(appId, i.token)
        .execute(data, true)
        .then((msg) => ({ token: i.token, messageId: (msg as APIMessage).id }));
    }
    return resources
      .interaction(i.id, i.token)
      .respond({
        type: InteractionResponseType.ChannelMessageWithSource,
        data,
      })
      .then(() => ({ token: i.token, messageId: ORIGINAL_MESSAGE }));
  };

  const editMessage = (
    token: string,
    messageId: string,
    data: APIInteractionResponseCallbackData
  ) =>
    resources
      .webhook(appId, token)
      .message(messageId)
      .edit(data)
      .catch(fail);

  const expirePaginate = (id: string, s: PaginatePending) => {
    clearTimeout(s.timer);
    s.timer = setTimeout(() => {
      pending.delete(id);
      void editMessage(s.token, s.messageId, {
        embeds: [paginateEmbed(s, ui)],
        components: [],
      });
    }, s.timeoutMs);
  };

  // --- confirm -------------------------------------------------------------

  const confirm: SessionApi['confirm'] = async (i, options, responded) => {
    const id = randomUUID();
    const base = `kit:cfm:${id}`;
    const ownerId = i.user?.id ?? i.member?.user.id ?? '';
    const timeoutMs = options.timeoutMs ?? DEFAULT_CONFIRM_TIMEOUT;

    await send(
      i,
      {
        embeds: [
          {
            title: options.title ?? '確認',
            description: options.description,
            fields: options.fields,
            color: 0xf26522,
            footer: {
              text: `${usernameOf(i)} · ${Math.ceil(timeoutMs / 60_000)} 分鐘後失效`,
              ...(ui?.footerIconUrl ? { icon_url: ui.footerIconUrl } : {}),
            },
            timestamp: new Date().toISOString(),
          },
        ],
        components: [
          row(
            button(`${base}:yes`, options.confirmLabel ?? '確認', options.danger ? ButtonStyle.Danger : ButtonStyle.Success),
            button(`${base}:no`, options.cancelLabel ?? '取消', ButtonStyle.Secondary)
          ),
        ],
      },
      responded
    );

    return new Promise<boolean>((resolve) => {
      arm(
        id,
        { kind: 'confirm', ownerId, resolve,  },
        timeoutMs,
        () => resolve(false)
      );
    });
  };

  // --- paginate ------------------------------------------------------------

  const paginate: SessionApi['paginate'] = async (i, options, responded) => {
    const pageSize = options.pageSize ?? 10;
    const totalPages = Math.max(1, Math.ceil(options.items.length / pageSize));

    if (options.items.length === 0) {
      await send(
        i,
        {
          embeds: [
            withEmbedDefaults(
              {
                description: options.emptyText ?? '沒有資料。',
                color: 0xded8d0,
              },
              usernameOf(i),
              ui
            ),
          ],
        },
        responded
      );
      return;
    }

    const id = randomUUID();
    const base = `kit:pag:${id}`;
    const ownerId = i.user?.id ?? i.member?.user.id ?? '';
    const timeoutMs = options.timeoutMs ?? DEFAULT_PAGINATE_TIMEOUT;

    const username = usernameOf(i);
    const embedFor = (page: number): APIEmbed =>
      withEmbedDefaults(
        options.render(
          options.items.slice(page * pageSize, (page + 1) * pageSize),
          page,
          totalPages
        ),
        username,
        ui
      );

    const { token, messageId } = await send(
      i,
      {
        embeds: [embedFor(0)],
        components: totalPages > 1 ? [paginateRow(base, 0, totalPages)] : [],
      },
      responded
    );

    if (totalPages <= 1) return;

    const session: PaginatePending = {
      kind: 'paginate',
      ownerId,
      username,
      items: options.items,
      render: options.render as PaginateOptions<unknown>['render'],
      pageSize,
      page: 0,
      timeoutMs,
      token,
      messageId,
      
    };
    pending.set(id, session);
    expirePaginate(id, session);
  };

  // --- modal ---------------------------------------------------------------

  const modal: SessionApi['modal'] = async (i, options, responded) => {
    if (responded) {
      throw new Error('ctx.modal() must be the first interaction response');
    }
    const id = randomUUID();

    await resources.interaction(i.id, i.token).respond({
      type: InteractionResponseType.Modal,
      data: {
        custom_id: `kit:mdl:${id}`,
        title: options.title,
        components: options.fields.map((f) => ({
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.TextInput,
              custom_id: f.id,
              label: f.label,
              style:
                f.style === 'paragraph'
                  ? TextInputStyle.Paragraph
                  : TextInputStyle.Short,
              value: f.value,
              placeholder: f.placeholder,
              required: f.required ?? true,
              min_length: f.minLength,
              max_length: f.maxLength,
            },
          ],
        })),
      },
    });

    return new Promise((resolve) => {
      arm(
        id,
        { kind: 'modal', resolve,  },
        options.timeoutMs ?? DEFAULT_MODAL_TIMEOUT,
        () => resolve(null)
      );
    });
  };

  // --- prompt --------------------------------------------------------------

  const prompt: SessionApi['prompt'] = async (i, options, responded) => {
    const channelId = i.channel_id;
    const authorId = i.user?.id ?? i.member?.user.id;
    if (!channelId || !authorId) {
      throw new Error('ctx.prompt() requires a channel-bound interaction');
    }

    await send(i, { content: options.content }, responded);

    const key = `${channelId}:${authorId}`;
    return new Promise<APIMessage | null>((resolve) => {
      const existing = waiters.get(key);
      if (existing) {
        clearTimeout(existing.timer);
        existing.resolve(null);
      }
      waiters.set(key, {
        resolve,
        filter: options.filter,
        timer: setTimeout(() => {
          waiters.delete(key);
          resolve(null);
        }, options.timeoutMs ?? DEFAULT_PROMPT_TIMEOUT),
      });
    });
  };

  // --- dispatch ------------------------------------------------------------

  const notOwner = (i: APIInteraction, ownerId: string) =>
    (i.user?.id ?? i.member?.user.id) !== ownerId;

  const ackModal = (i: APIModalSubmitInteraction) =>
    // Defer then delete the placeholder so the modal submit is silently acked;
    // the resolved handler follows up on the original command interaction.
    resources
      .interaction(i.id, i.token)
      .respond({
        type: InteractionResponseType.DeferredChannelMessageWithSource,
        data: { flags: MessageFlags.Ephemeral },
      })
      .then(() =>
        resources.webhook(appId, i.token).message(ORIGINAL_MESSAGE).delete()
      )
      .catch(fail);

  const expired = (i: APIInteraction) =>
    resources
      .interaction(i.id, i.token)
      .respond({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: '這個操作已過期，請重新執行指令。', flags: MessageFlags.Ephemeral },
      })
      .catch(fail);

  const handleComponent = async (
    i: APIMessageComponentInteraction,
    id: string,
    action: string,
    session: Pending
  ) => {
    if (session.kind === 'confirm') {
      if (notOwner(i, session.ownerId)) return expired(i);
      pending.delete(id);
      clearTimeout(session.timer);
      await resources.interaction(i.id, i.token).respond({
        type: InteractionResponseType.UpdateMessage,
        data: { components: [] },
      });
      session.resolve(action === 'yes');
      return;
    }

    if (session.kind !== 'paginate') return;
    if (notOwner(i, session.ownerId)) return expired(i);

    const totalPages = Math.ceil(session.items.length / session.pageSize);

    if (action === 'jump') {
      await resources.interaction(i.id, i.token).respond({
        type: InteractionResponseType.Modal,
        data: {
          custom_id: `kit:pag:${id}:jump`,
          title: '跳至頁面',
          components: [
            row({
              type: ComponentType.TextInput,
              custom_id: 'page_number',
              label: `頁碼 (1-${totalPages})`,
              style: TextInputStyle.Short,
              required: true,
            }),
          ],
        },
      });
      return;
    }

    session.page =
      action === 'prev'
        ? Math.max(0, session.page - 1)
        : Math.min(totalPages - 1, session.page + 1);
    expirePaginate(id, session);

    await resources.interaction(i.id, i.token).respond({
      type: InteractionResponseType.UpdateMessage,
      data: {
        embeds: [paginateEmbed(session, ui)],
        components: [paginateRow(`kit:pag:${id}`, session.page, totalPages)],
      },
    });
  };

  // Claims any `kit:` id — dispatch replies "expired" when the session is gone.
  const claims = (customId: string): boolean => customId.startsWith(PREFIX);

  const dispatch = async (i: APIInteraction): Promise<boolean> => {
    const customId =
      i.type === InteractionType.MessageComponent ||
      i.type === InteractionType.ModalSubmit
        ? i.data.custom_id
        : undefined;
    if (!customId?.startsWith(PREFIX)) return false;

    const [, kind = '', id = '', action = ''] = customId.split(':');
    const session = pending.get(id);
    if (!session) {
      await expired(i);
      return true;
    }

    if (i.type === InteractionType.MessageComponent) {
      await handleComponent(i, id, action, session);
      return true;
    }

    if (i.type === InteractionType.ModalSubmit) {
      if (kind === 'mdl' && session.kind === 'modal') {
        pending.delete(id);
        clearTimeout(session.timer);
        const values = modalFieldValues(i);
        void ackModal(i);
        session.resolve(values);
        return true;
      }

      if (kind === 'pag' && session.kind === 'paginate' && action === 'jump') {
        if (notOwner(i, session.ownerId)) {
          await expired(i);
          return true;
        }
        const raw = modalFieldValues(i).page_number;
        const target = Number(raw);
        const totalPages = Math.ceil(session.items.length / session.pageSize);
        if (!Number.isInteger(target) || target < 1 || target > totalPages) {
          await resources.interaction(i.id, i.token).respond({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: `頁碼必須介於 1 到 ${totalPages}。`,
              flags: MessageFlags.Ephemeral,
            },
          });
          return true;
        }
        session.page = target - 1;
        expirePaginate(id, session);
        await resources.interaction(i.id, i.token).respond({
          type: InteractionResponseType.UpdateMessage,
          data: {
            embeds: [paginateEmbed(session, ui)],
            components: [
              paginateRow(`kit:pag:${id}`, session.page, totalPages),
            ],
          },
        });
        return true;
      }
    }

    return true;
  };

  const tryMessage = (msg: APIMessage): boolean => {
    const key = `${msg.channel_id}:${msg.author.id}`;
    const waiter = waiters.get(key);
    if (!waiter) return false;
    if (waiter.filter && !waiter.filter(msg)) return false;
    waiters.delete(key);
    clearTimeout(waiter.timer);
    waiter.resolve(msg);
    return true;
  };

  const close = () => {
    for (const s of pending.values()) clearTimeout(s.timer);
    for (const w of waiters.values()) clearTimeout(w.timer);
    pending.clear();
    waiters.clear();
  };

  return {
    confirm,
    paginate,
    modal,
    prompt,
    claims,
    dispatch,
    tryMessage,
    close,
  };
}

export type SessionStore = ReturnType<typeof createSessionStore>;
