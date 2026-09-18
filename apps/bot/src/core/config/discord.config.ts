import {
  createDesiredPropertiesObject,
  DesiredPropertiesBehavior,
  CompleteDesiredProperties,
} from '@discordeno/bot';

const rawDesiredProperties = createDesiredPropertiesObject(
  {
    message: {
      id: true,
      content: true,
      channelId: true,
      guildId: true,
      authorId: true,
    },
    user: {
      id: true,
      username: true,
      toggles: true,
      avatar: true,
    },
    interaction: {
      type: true,
      id: true,
      token: true,
    },
    guild: {
      id: true,
      name: true,
      memberCount: true,
      approximateMemberCount: true,
    },
    reaction: {
      userId: true,
      channelId: true,
      messageId: true,
      guildId: true,
      emoji: true,
    },
  },
  true
);

export interface BotDesiredProperties extends Required<typeof rawDesiredProperties> {}

export const desiredProperties = rawDesiredProperties as CompleteDesiredProperties<
  BotDesiredProperties,
  false
>;
