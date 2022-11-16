import { Client } from "discord.js"
import { eventList } from "../config"

export const registerEvent = (client: Client) => {
    eventList.forEach((evt) => {
        client.on(evt.name, evt.run)
    })
}