import {
  ApiRequest,
  CreateNotificationChannelInput,
  MemberNotifyMessage,
  NotificationChannel,
  NotificationChannelIgnore,
  NotificationType,
  orNull,
  UpdateMessageInput,
} from '@discord-bot/shared';

const base = (guildId: string) => `/api/v1/guilds/${guildId}`;

export function createMemberNotifyApi(request: ApiRequest) {
  return {
    getNotificationChannel(guildId: string, type: NotificationType) {
      return orNull(
        request<NotificationChannel>(`${base(guildId)}/notification-channels?type=${type}`)
      );
    },
    setNotificationChannel(input: CreateNotificationChannelInput) {
      return request<NotificationChannel>(
        `${base(input.guildId)}/notification-channels/${input.type}`,
        { method: 'PUT', body: JSON.stringify({ channelId: input.channelId }) }
      );
    },
    toggleChannelEnabled(guildId: string, type: NotificationType, enabled: boolean) {
      return request<NotificationChannel>(`${base(guildId)}/notification-channels/${type}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled }),
      });
    },
    deleteNotificationChannel(guildId: string, type: NotificationType) {
      return request<void>(`${base(guildId)}/notification-channels/${type}`, { method: 'DELETE' });
    },
    getNotificationChannels(guildId: string) {
      return request<NotificationChannel[]>(`${base(guildId)}/notification-channels`);
    },
    getNotificationChannelIgnores(guildId: string, type: NotificationType) {
      return request<NotificationChannelIgnore[]>(
        `${base(guildId)}/notification-channels/${type}/ignores`
      );
    },
    addNotificationChannelIgnore(guildId: string, type: NotificationType, channelId: string) {
      return request<NotificationChannelIgnore>(
        `${base(guildId)}/notification-channels/${type}/ignores/${channelId}`,
        { method: 'PUT' }
      );
    },
    removeNotificationChannelIgnore(guildId: string, type: NotificationType, channelId: string) {
      return request<void>(`${base(guildId)}/notification-channels/${type}/ignores/${channelId}`, {
        method: 'DELETE',
      });
    },
    getMessageTemplates(guildId: string) {
      return orNull(request<MemberNotifyMessage>(`${base(guildId)}/member-notify-message`));
    },
    updateMessage(input: UpdateMessageInput) {
      const { guildId, ...body } = input;
      return request<MemberNotifyMessage>(`${base(guildId)}/member-notify-message`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    },
    deleteMessageTemplates(guildId: string) {
      return request<void>(`${base(guildId)}/member-notify-message`, { method: 'DELETE' });
    },
  };
}

export type MemberNotifyApi = ReturnType<typeof createMemberNotifyApi>;
