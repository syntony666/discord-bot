import { createRequest } from '@discord-bot/shared';
import { appConfig } from '@core/config';

export const request = createRequest(appConfig.api.url);
