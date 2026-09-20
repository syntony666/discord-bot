import { Subject, Observable } from 'rxjs';
import { share } from 'rxjs/operators';
import type {
  APIInteraction,
  APIUser,
  APIGuild,
  APIChannel,
  GatewayGuildMemberAddDispatchData,
  GatewayGuildMemberRemoveDispatchData,
  GatewayMessageCreateDispatchData,
  GatewayMessageReactionAddDispatchData,
  GatewayGuildDeleteDispatchData,
  GatewayReadyDispatchData,
} from 'discord-api-types/v10';

export type BotMessage = GatewayMessageCreateDispatchData;
export type BotInteraction = APIInteraction;
export type BotMember = GatewayGuildMemberAddDispatchData;
export type BotUser = APIUser;
export type BotGuild = APIGuild;
export type BotChannel = APIChannel;

export type BotReadyPayload = { user: APIUser; shardId: number };

export type BotReactionPayload = GatewayMessageReactionAddDispatchData;

// Internal subjects (private)
const messageCreateSubject = new Subject<BotMessage>();
const interactionCreateSubject = new Subject<BotInteraction>();
const readySubject = new Subject<BotReadyPayload>();
const guildMemberAddSubject = new Subject<GatewayGuildMemberAddDispatchData>();
const guildMemberRemoveSubject = new Subject<GatewayGuildMemberRemoveDispatchData>();
const reactionAddSubject = new Subject<BotReactionPayload>();
const reactionRemoveSubject = new Subject<BotReactionPayload>();
const guildCreateSubject = new Subject<BotGuild>();
const guildDeleteSubject = new Subject<GatewayGuildDeleteDispatchData>();

// Public observables (shared streams)
export const messageCreate$: Observable<BotMessage> = messageCreateSubject.pipe(share());
export const interactionCreate$: Observable<BotInteraction> =
  interactionCreateSubject.pipe(share());
export const ready$: Observable<BotReadyPayload> = readySubject.pipe(share());
export const guildMemberAdd$: Observable<GatewayGuildMemberAddDispatchData> =
  guildMemberAddSubject.pipe(share());
export const guildMemberRemove$: Observable<GatewayGuildMemberRemoveDispatchData> =
  guildMemberRemoveSubject.pipe(share());
export const reactionAdd$: Observable<BotReactionPayload> = reactionAddSubject.pipe(share());
export const reactionRemove$: Observable<BotReactionPayload> = reactionRemoveSubject.pipe(share());
export const guildCreate$: Observable<BotGuild> = guildCreateSubject.pipe(share());
export const guildDelete$: Observable<GatewayGuildDeleteDispatchData> =
  guildDeleteSubject.pipe(share());

// Emitters (only for gateway wiring)
export const emitMessageCreate = (message: BotMessage) => messageCreateSubject.next(message);
export const emitInteractionCreate = (interaction: BotInteraction) =>
  interactionCreateSubject.next(interaction);
export const emitReady = (payload: BotReadyPayload) => readySubject.next(payload);
export const emitGuildMemberAdd = (payload: GatewayGuildMemberAddDispatchData) =>
  guildMemberAddSubject.next(payload);
export const emitGuildMemberRemove = (payload: GatewayGuildMemberRemoveDispatchData) =>
  guildMemberRemoveSubject.next(payload);
export const emitReactionAdd = (reaction: BotReactionPayload) => reactionAddSubject.next(reaction);
export const emitReactionRemove = (reaction: BotReactionPayload) =>
  reactionRemoveSubject.next(reaction);
export const emitGuildCreate = (guild: BotGuild) => guildCreateSubject.next(guild);
export const emitGuildDelete = (payload: GatewayGuildDeleteDispatchData) =>
  guildDeleteSubject.next(payload);
