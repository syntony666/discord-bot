import { Subject, Observable } from 'rxjs';
import { share } from 'rxjs/operators';
import type { SetupDesiredProps, Message, Interaction, Member, User, Guild } from '@discordeno/bot';
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

export type BotMember = SetupDesiredProps<
  Member,
  BotDesiredProperties,
  DesiredPropertiesBehavior.RemoveKey
>;

export type BotUser = SetupDesiredProps<
  User,
  BotDesiredProperties,
  DesiredPropertiesBehavior.RemoveKey
>;

export type BotGuild = SetupDesiredProps<
  Guild,
  BotDesiredProperties,
  DesiredPropertiesBehavior.RemoveKey
>;

export type BotReady = { user: any; shardId: number };

// Internal subjects (private)
const messageCreateSubject = new Subject<BotMessage>();
const interactionCreateSubject = new Subject<BotInteraction>();
const readySubject = new Subject<BotReady>();
const guildMemberAddSubject = new Subject<{ member: BotMember; user: BotUser }>();
const guildMemberRemoveSubject = new Subject<{ user: BotUser; guildId: BigInt }>();

// Public observables (shared streams)
export const messageCreate$: Observable<BotMessage> = messageCreateSubject.pipe(share());
export const interactionCreate$: Observable<BotInteraction> =
  interactionCreateSubject.pipe(share());
export const ready$: Observable<BotReady> = readySubject.pipe(share());
export const guildMemberAdd$: Observable<{ member: BotMember; user: BotUser }> =
  guildMemberAddSubject.pipe(share());
export const guildMemberRemove$: Observable<{ user: BotUser; guildId: BigInt }> =
  guildMemberRemoveSubject.pipe(share());

// Emitters (only for bot.client.ts)
export const emitMessageCreate = (message: BotMessage) => messageCreateSubject.next(message);
export const emitInteractionCreate = (interaction: BotInteraction) =>
  interactionCreateSubject.next(interaction);
export const emitReady = (payload: BotReady) => readySubject.next(payload);
export const emitGuildMemberAdd = (member: BotMember, user: BotUser) =>
  guildMemberAddSubject.next({ member, user });
export const emitGuildMemberRemove = (user: BotUser, guildId: BigInt) =>
  guildMemberRemoveSubject.next({ user, guildId });