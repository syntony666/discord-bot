import { Subject, Observable } from 'rxjs';
import { share } from 'rxjs/operators';
import type {
  SetupDesiredProps,
  Message,
  Interaction,
  Member,
  User,
  Guild,
  DiscordUser,
  Channel,
} from '@discordeno/bot';
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

export type BotChannel = SetupDesiredProps<
  Channel,
  BotDesiredProperties,
  DesiredPropertiesBehavior.RemoveKey
>;

export type BotReadyPayload = { user: DiscordUser; shardId: number };

export type BotReactionPayload = {
  userId: bigint;
  channelId: bigint;
  messageId: bigint;
  guildId?: bigint;
  emoji: {
    id?: bigint;
    name?: string;
  };
};

// Internal subjects (private)
const messageCreateSubject = new Subject<BotMessage>();
const interactionCreateSubject = new Subject<BotInteraction>();
const readySubject = new Subject<BotReadyPayload>();
const guildMemberAddSubject = new Subject<{ member: BotMember; user: BotUser }>();
const guildMemberRemoveSubject = new Subject<{ user: BotUser; guildId: BigInt }>();
const reactionAddSubject = new Subject<BotReactionPayload>();
const reactionRemoveSubject = new Subject<BotReactionPayload>();
const guildCreateSubject = new Subject<BotGuild>();
const guildDeleteSubject = new Subject<{ id: bigint; shardId: number }>();

// Public observables (shared streams)
export const messageCreate$: Observable<BotMessage> = messageCreateSubject.pipe(share());
export const interactionCreate$: Observable<BotInteraction> =
  interactionCreateSubject.pipe(share());
export const ready$: Observable<BotReadyPayload> = readySubject.pipe(share());
export const guildMemberAdd$: Observable<{ member: BotMember; user: BotUser }> =
  guildMemberAddSubject.pipe(share());
export const guildMemberRemove$: Observable<{ user: BotUser; guildId: BigInt }> =
  guildMemberRemoveSubject.pipe(share());
export const reactionAdd$: Observable<BotReactionPayload> = reactionAddSubject.pipe(share());
export const reactionRemove$: Observable<BotReactionPayload> = reactionRemoveSubject.pipe(share());
export const guildCreate$: Observable<BotGuild> = guildCreateSubject.pipe(share());
export const guildDelete$: Observable<{ id: bigint; shardId: number }> =
  guildDeleteSubject.pipe(share());

// Emitters (only for bot.client.ts)
export const emitMessageCreate = (message: BotMessage) => messageCreateSubject.next(message);
export const emitInteractionCreate = (interaction: BotInteraction) =>
  interactionCreateSubject.next(interaction);
export const emitReady = (payload: BotReadyPayload) => readySubject.next(payload);
export const emitGuildMemberAdd = (member: BotMember, user: BotUser) =>
  guildMemberAddSubject.next({ member, user });
export const emitGuildMemberRemove = (user: BotUser, guildId: BigInt) =>
  guildMemberRemoveSubject.next({ user, guildId });
export const emitReactionAdd = (reaction: BotReactionPayload) => reactionAddSubject.next(reaction);
export const emitReactionRemove = (reaction: BotReactionPayload) =>
  reactionRemoveSubject.next(reaction);
export const emitGuildCreate = (guild: BotGuild) => guildCreateSubject.next(guild);
export const emitGuildDelete = (id: bigint, shardId: number) =>
  guildDeleteSubject.next({ id, shardId });
