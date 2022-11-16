import { ColorResolvable, GatewayIntentBits, Partials } from "discord.js";
import { Command } from "./command/command";
import { EventListener } from "./event/eventListener";
import { StatusCommand } from "./command/statusCommand";
import { ClientReadyEvent } from "./event/clientReadyEvent";
import { InteractionCreateEvent } from "./event/interactionCreateEvent";
import { ReplyCommand } from "./command/replyCommand";

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
    StatusCommand, ReplyCommand
]

const eventList: EventListener[] = [
    ClientReadyEvent, InteractionCreateEvent
]

const embedColor: Map<string, ColorResolvable> = new Map([
    ['reply', '#f0b01d']
])

export {
    intentOptions, partialsOptions, commandList, eventList, embedColor
}