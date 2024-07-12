import { readFileSync } from "fs";
import { Blob } from "buffer";
import { FileContent } from "discordeno/types";

class Asset {
  private path: string;
  constructor(path: string) {
    this.path = path;
  }
  public get name() {
    return this.path.split("/").at(-1) ?? "unknown";
  }
  public get attachmentURL() {
    return `attachment://${this.name}`;
  }
  public get blob() {
    return new Blob([readFileSync(this.path)], {
      type: "image/png",
    });
  }
  public get fileContent(): FileContent {
    return {
      blob: this.blob,
      name: this.name,
    };
  }
}

export const AssetsHelpers = {
  logoIcon: new Asset("./assets/logo.png"),
  arrowIcon: new Asset("./assets/arrow.png"),
};
