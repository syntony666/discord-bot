import { Subject } from 'rxjs';
import type { SetupDesiredProps, Message, Interaction } from '@discordeno/bot';
import type { DesiredPropertiesBehavior } from '@discordeno/bot';
import { BotDesiredProperties } from '@platforms/discordeno/bot.client';

export type BotMessage = SetupDesiredProps<
  Message,
  BotDesiredProperties,
  DesiredPropertiesBehavior.RemoveKey
>;

export const messageCreate$ = new Subject<BotMessage>();

export type BotInteraction = SetupDesiredProps<
  Interaction,
  BotDesiredProperties,
  DesiredPropertiesBehavior.RemoveKey
>;
export const interactionCreate$ = new Subject<BotInteraction>();
