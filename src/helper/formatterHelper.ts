import { User, userMention } from "discord.js";

export abstract class FormatterHelper {
  public static guildJoin(message: string, user: User) {
    return message.replace("{m}", userMention(user.id));
  }
  public static guildLeave(message: string, user: User) {
    return message.replace("{m}", user.tag);
  }
}
