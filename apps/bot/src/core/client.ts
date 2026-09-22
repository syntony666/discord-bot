import { createDiscordClient } from '@discord-bot/discord-client';
import { appConfig } from '@core/config';

export const client = createDiscordClient({ token: appConfig.discord.token });
