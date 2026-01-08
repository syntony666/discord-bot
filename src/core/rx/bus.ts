import { Subject, Observable } from 'rxjs';
import { share } from 'rxjs/operators';
import type { SetupDesiredProps, Message, Interaction } from '@discordeno/bot';
import { DesiredPropertiesBehavior } from '@discordeno/bot';
import { BotDesiredProperties } from '@core/config/discord.config';

export type BotMessage = SetupDesiredProps<
  Message,
  BotDesiredProperties,
  DesiredPropertiesBehavior.RemoveKey
>;

export type BotInteraction = SetupDesiredProps<
  Interaction,
  BotDesiredProperties,
  DesiredPropertiesBehavior.RemoveKey
>;

export type BotReady = { user: any; shardId: number };

// Internal subjects (private)
const messageCreateSubject = new Subject<BotMessage>();
const interactionCreateSubject = new Subject<BotInteraction>();
const readySubject = new Subject<BotReady>();

// Public observables (shared streams)
export const messageCreate$: Observable<BotMessage> = messageCreateSubject.pipe(share());
export const interactionCreate$: Observable<BotInteraction> =
  interactionCreateSubject.pipe(share());
export const ready$: Observable<BotReady> = readySubject.pipe(share());

// Emitters (只給 bot.client.ts 使用)
export const emitMessageCreate = (message: BotMessage) => messageCreateSubject.next(message);
export const emitInteractionCreate = (interaction: BotInteraction) =>
  interactionCreateSubject.next(interaction);
export const emitReady = (payload: BotReady) => readySubject.next(payload);
