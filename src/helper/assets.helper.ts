import { readFileSync } from "fs";
import { Blob } from "buffer";

export const AssetsHelpers = {
  logoIcon: new Blob([readFileSync("./assets/logo.png")], {
    type: "image/png",
  }),
  arrowIcon: new Blob([readFileSync("./assets/arrow.png")], {
    type: "image/png",
  }),
};
