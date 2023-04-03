import { ErrorBase } from "./errorBase";

type ErrorName = "NoSuchCommand" | "NotInGuild";

export class CommandError extends ErrorBase<ErrorName> {
  getMessage(): string {
    if (this.name == "NoSuchCommand") return this.message + " (指令不存在)";
    if (this.name == "NotInGuild") return "此指令只能在伺服器內使用";
    return this.message;
  }
}
