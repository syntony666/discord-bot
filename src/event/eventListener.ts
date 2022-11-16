import { ClientEvents } from "discord.js";

export interface EventListener {
    name: keyof ClientEvents,
    run: (...args: any[]) => void
}