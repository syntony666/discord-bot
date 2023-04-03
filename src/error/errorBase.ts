export class ErrorBase<T extends string> extends Error {
  name: T;
  message: string;
  cause: string;
  constructor(name: T, message = "", cause?: any) {
    super();
    this.name = name;
    this.message = this.getMessage();
    this.cause = cause;
  }

  protected getMessage() {
    return this.message;
  }
}
