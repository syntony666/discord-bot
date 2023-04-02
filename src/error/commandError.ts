import { ErrorBase } from "./errorBase";

type ErrorName = "No such command" | "Not in guild";

export class CommandError extends ErrorBase<ErrorName> {
  getMessage(): string {
    if (this.name == "No such command") return this.message + " (指令不存在)";
    if (this.name == "Not in guild") return "此指令只能在伺服器內使用";
    return this.message;
  }
}
