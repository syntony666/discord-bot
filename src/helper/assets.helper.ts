import { readFileSync } from "fs";
import { Blob } from "buffer";
import { FileContent } from "discordeno/types";

class Asset {
  private path: string;
  constructor(path: string) {
    this.path = path;
  }
  public getName() {
    return this.path.split("/").at(-1) ?? "unknown";
  }
  public getAttachmentURL() {
    return `attachment://${this.getName()}`;
  }
  public getBlob() {
    return new Blob([readFileSync(this.path)], {
      type: "image/png",
    });
  }
  public getFileContent(): FileContent {
    return {
      blob: this.getBlob(),
      name: this.getName(),
    };
  }
}

export const AssetsHelpers = {
  logoIcon: new Asset("./assets/logo.png"),
  arrowIcon: new Asset("./assets/arrow.png"),
};
