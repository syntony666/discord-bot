import { ColorResolvable, GatewayIntentBits, Partials } from "discord.js";
import { Command } from "./interface/command";
import { EventListener } from "./interface/eventListener";
import { StatusCommand } from "./command/statusCommand";
import { ClientReadyEvent } from "./event/clientReadyEvent";
import { InteractionCreateEvent } from "./event/interactionCreateEvent";
import { ReplyCommand } from "./command/replyCommand";
import { MessageCreateEvent } from "./event/messageCreateEvent";
import { ReactionRoleCommand } from "./command/reactionRoleCommand";
import { MessageDeleteEvent } from "./event/messageDeleteEvent";
import { MessageReactionAddEvent } from "./event/messageReactionAddEvent";
import { MessageReactionRemoveEvent } from "./event/messageReactionRemoveEvent";
import { GuildCreateEvent } from "./event/guildCreateEvent";
import { GuildMemberAddEvent } from "./event/guildMemberAddEvent";
import { GuildMemberRemoveEvent } from "./event/guildMemberRemoveEvent";
import { NotifyCommand } from "./command/notify/notifyCommand";
import { GPTCommand } from "./command/gptCommand";

const CLIENT_VERSION = "4.1.0-gpt.Beta"; // optimize for docker

const intentOptions: GatewayIntentBits[] = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildMessageReactions,
  GatewayIntentBits.MessageContent,
];

const partialsOptions: Partials[] = [
  Partials.Message,
  Partials.Channel,
  Partials.Reaction,
];

const commandList: Command[] = [
  StatusCommand,
  ReplyCommand,
  ReactionRoleCommand,
  NotifyCommand,
];

const guildCommandList: Command[] = [GPTCommand];

const eventList: EventListener[] = [
  ClientReadyEvent,
  GuildCreateEvent,
  GuildMemberAddEvent,
  GuildMemberRemoveEvent,
  InteractionCreateEvent,
  MessageCreateEvent,
  MessageDeleteEvent,
  MessageReactionAddEvent,
  MessageReactionRemoveEvent,
];

const embedColor: Map<string, ColorResolvable> = new Map([
  ["reply", "#f0b01d"],
  ["status", "#0099ff"],
  ["reactionRole", "#fa8d2d"],
  ["common-notify", "#f58e69"],
  ["twitch-notify", "#6441a5"],
]);

export {
  CLIENT_VERSION,
  intentOptions,
  partialsOptions,
  commandList,
  guildCommandList,
  eventList,
  embedColor,
};