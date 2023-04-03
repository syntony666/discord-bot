import { ErrorBase } from "./errorBase";

type ErrorName = "DataExisted" | "DataNotExist" | "Unexpected";

export class DatabaseOperationError extends ErrorBase<ErrorName> {
  getMessage(): string {
    if (this.name == "DataExisted") return "無法加入重複的資料";
    if (this.name == "DataNotExist") return "此指令只能在伺服器內使用";
    if (this.name == "Unexpected") return "指令操作失敗，可能是資料庫損壞";
    return this.message;
  }
}
