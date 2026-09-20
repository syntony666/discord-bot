import { from } from 'rxjs';
import {
  ApiRequest,
  MemberNotifyMessage,
  NotificationChannel,
  orNull,
} from '@discord-bot/shared';
import {
  CreateNotificationChannelInput,
  MemberNotifyModule,
  UpdateMessageInput,
  UpsertMessageInput,
} from './member-notify.module';

const base = (guildId: string) => `/api/v1/guilds/${guildId}`;

export function createHttpMemberNotifyModule(request: ApiRequest): MemberNotifyModule {
  return {
    getNotificationChannel$(guildId, type) {
      return from(
        orNull(request<NotificationChannel>(`${base(guildId)}/notification-channels?type=${type}`))
      );
    },
    setNotificationChannel$(input: CreateNotificationChannelInput) {
      return from(
        request<NotificationChannel>(
          `${base(input.guildId)}/notification-channels/${input.type}`,
          { method: 'PUT', body: JSON.stringify({ channelId: input.channelId }) }
        )
      );
    },
    toggleChannelEnabled$(guildId, type, enabled) {
      return from(
        request<NotificationChannel>(`${base(guildId)}/notification-channels/${type}`, {
          method: 'PATCH',
          body: JSON.stringify({ enabled }),
        })
      );
    },
    deleteNotificationChannel$(guildId, type) {
      return from(
        request<void>(`${base(guildId)}/notification-channels/${type}`, { method: 'DELETE' })
      );
    },
    getNotificationChannels$(guildId) {
      return from(request<NotificationChannel[]>(`${base(guildId)}/notification-channels`));
    },
    getMessageTemplates$(guildId) {
      return from(orNull(request<MemberNotifyMessage>(`${base(guildId)}/member-notify-message`)));
    },
    upsertMessageTemplates$(input: UpsertMessageInput) {
      const { guildId, ...body } = input;
      return from(
        request<MemberNotifyMessage>(`${base(guildId)}/member-notify-message`, {
          method: 'PUT',
          body: JSON.stringify(body),
        })
      );
    },
    updateMessage$(input: UpdateMessageInput) {
      const { guildId, ...body } = input;
      return from(
        request<MemberNotifyMessage>(`${base(guildId)}/member-notify-message`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
      );
    },
    deleteMessageTemplates$(guildId) {
      return from(request<void>(`${base(guildId)}/member-notify-message`, { method: 'DELETE' }));
    },
  };
}
