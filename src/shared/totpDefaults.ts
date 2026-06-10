import type { TOTPOptions } from "@src/types";

export const totpDefaults = Object.freeze<TOTPOptions>({
  algorithm: "sha1",
  duration: 30,
  digits: 6,
  window: 1,
  issuer: "xotp",
  account: "",
});
