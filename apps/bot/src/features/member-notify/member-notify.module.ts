import {
  ApiRequest,
  CreateNotificationChannelInput,
  MemberNotifyMessage,
  NotificationChannel,
  NotificationType,
  orNull,
  UpdateMessageInput,
  UpsertMessageInput,
} from '@discord-bot/shared';

const base = (guildId: string) => `/api/v1/guilds/${guildId}`;

export function createMemberNotifyModule(request: ApiRequest) {
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
    getMessageTemplates(guildId: string) {
      return orNull(request<MemberNotifyMessage>(`${base(guildId)}/member-notify-message`));
    },
    upsertMessageTemplates(input: UpsertMessageInput) {
      const { guildId, ...body } = input;
      return request<MemberNotifyMessage>(`${base(guildId)}/member-notify-message`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
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

export type MemberNotifyModule = ReturnType<typeof createMemberNotifyModule>;
