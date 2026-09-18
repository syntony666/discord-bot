import { Intents, CreateBotOptions, DesiredPropertiesBehavior } from '@discordeno/bot';
import { appConfig, desiredProperties, BotDesiredProperties } from '@core/config';
import { botEventHandlers } from './bot.events';

export const botIntents =
  Intents.Guilds |
  Intents.GuildMessages |
  Intents.GuildMembers |
  Intents.MessageContent |
  Intents.GuildMessageReactions;

export const botDesiredPropertiesBehavior = DesiredPropertiesBehavior.RemoveKey;

export function createBotOptions(): CreateBotOptions<
  BotDesiredProperties,
  DesiredPropertiesBehavior.RemoveKey
> {
  return {
    token: appConfig.discord.token,
    applicationId: BigInt(appConfig.discord.appId),
    intents: botIntents,
    desiredPropertiesBehavior: botDesiredPropertiesBehavior,
    desiredProperties,
    events: botEventHandlers,
  };
}
