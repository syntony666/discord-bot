import { ColorResolvable, GatewayIntentBits, Partials } from "discord.js";
import { Command } from "./command/command";
import { EventListener } from "./event/eventListener";
import { StatusCommand } from "./command/statusCommand";
import { ClientReadyEvent } from "./event/clientReadyEvent";
import { InteractionCreateEvent } from "./event/interactionCreateEvent";
import { ReplyCommand } from "./command/replyCommand";
import { MessageCreateEvent } from "./event/messageCreateEvent";
import { ReactionRoleCommand } from "./command/reactionRoleCommand";
import { NotifyCommand } from "./command/notifyCommand";

const intentOptions: GatewayIntentBits[] = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent
]

const partialsOptions: Partials[] = [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction
]

const commandList: Command[] = [
    StatusCommand, ReplyCommand, ReactionRoleCommand, NotifyCommand
]

const eventList: EventListener[] = [
    ClientReadyEvent, InteractionCreateEvent, MessageCreateEvent
]

const embedColor: Map<string, ColorResolvable> = new Map([
    ['reply', '#f0b01d'],
    ['status', '#0099ff'],
    ['reactionRole', '#fa8d2d'],
    ['notify', '#f58e69']
])

export {
    intentOptions, partialsOptions, commandList, eventList, embedColor
}