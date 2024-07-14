import { EventHandlers } from "@discordeno/bot";
import { readdirSync } from "fs";
import path from "path";

export class EventManager {
  constructor() {}
  public getAllEvents() {
    const commandDir = path.resolve(__dirname);
    const eventsFiles = readdirSync(commandDir, {
      recursive: true,
      encoding: "utf-8",
    }).filter((file) => file.endsWith(".event.js"));

    let events: Partial<EventHandlers> | undefined;

    eventsFiles.forEach((file) => {
      events = { ...events, ...require(path.resolve(__dirname, file)) };
    });

    return events;
  }
}
