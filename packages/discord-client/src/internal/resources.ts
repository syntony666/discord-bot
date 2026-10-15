import type { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import type {
  APIApplication,
  APIApplicationCommand,
  APIInteractionResponse,
  APIMessage,
  APIUser,
  RESTPatchAPIWebhookWithTokenMessageJSONBody,
  RESTPostAPIWebhookWithTokenJSONBody,
  RESTPutAPIApplicationCommandsJSONBody,
  RESTPutAPIApplicationCommandsResult,
  RESTPatchCurrentApplicationJSONBody,
} from 'discord-api-types/v10';

/** Discord's sentinel id for the original interaction response. */
export const ORIGINAL_MESSAGE = '@original';

export function createResources(rest: REST, getBotUser: () => APIUser | null) {
  const interaction = (interactionId: string, token: string) => ({
    respond: (body: APIInteractionResponse) =>
      rest.post(Routes.interactionCallback(interactionId, token), { body }),
  });

  const webhook = (webhookId: string, token: string) => ({
    execute: (body: RESTPostAPIWebhookWithTokenJSONBody, wait = false) =>
      rest.post(Routes.webhook(webhookId, token), {
        body,
        ...(wait ? { query: new URLSearchParams({ wait: 'true' }) } : {}),
      }) as Promise<APIMessage | undefined>,
    message: (messageId: string) => ({
      edit: (body: RESTPatchAPIWebhookWithTokenMessageJSONBody) =>
        rest.patch(Routes.webhookMessage(webhookId, token, messageId), {
          body,
        }),
      delete: () => rest.delete(Routes.webhookMessage(webhookId, token, messageId)),
    }),
  });

  const application = (applicationId: string) => ({
    commands: {
      list: () =>
        rest.get(Routes.applicationCommands(applicationId)) as Promise<APIApplicationCommand[]>,
      overwrite: (body: RESTPutAPIApplicationCommandsJSONBody) =>
        rest.put(Routes.applicationCommands(applicationId), {
          body,
        }) as Promise<RESTPutAPIApplicationCommandsResult>,
    },
  });

  return {
    get botId() {
      return getBotUser()?.id ?? '';
    },
    get botUser() {
      return getBotUser();
    },
    currentApplication: () =>
      rest.get(Routes.oauth2CurrentApplication()) as Promise<APIApplication>,
    editCurrentApplication: (body: RESTPatchCurrentApplicationJSONBody) =>
      rest.patch(Routes.currentApplication(), {
        body,
      }) as Promise<APIApplication>,
    interaction,
    webhook,
    application,
  };
}

export type Resources = ReturnType<typeof createResources>;
