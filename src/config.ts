import { ColorResolvable, GatewayIntentBits, Partials } from "discord.js";
import { Command } from "./command/command";
import { EventListener } from "./event/eventListener";
import { StatusCommand } from "./command/statusCommand";
import { ClientReadyEvent } from "./event/clientReadyEvent";
import { InteractionCreateEvent } from "./event/interactionCreateEvent";
import { ReplyCommand } from "./command/replyCommand";
import { MessageCreateEvent } from "./event/messageCreateEvent";
import { ReactionRoleCommand } from "./command/reactionRoleCommand";

const intentOptions: GatewayIntentBits[] = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions
]

const partialsOptions: Partials[] = [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction
]

const commandList: Command[] = [
    StatusCommand, ReplyCommand, ReactionRoleCommand
]

const eventList: EventListener[] = [
    ClientReadyEvent, InteractionCreateEvent, MessageCreateEvent
]

const embedColor: Map<string, ColorResolvable> = new Map([
    ['reply', '#f0b01d'],
    ['status', '#0099ff'],
    ['reactionRole', '#fa8d2d']
])

export {
    intentOptions, partialsOptions, commandList, eventList, embedColor
}