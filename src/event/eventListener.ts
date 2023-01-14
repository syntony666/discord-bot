import { ClientEvents } from "discord.js";

export interface EventListener {
    name: keyof ClientEvents,
    execute: (...args: any[]) => void
}