import type { HOTPOptions } from "../types/index.js";

export const hotpDefaults = Object.freeze<HOTPOptions>({
  algorithm: "sha1",
  counter: 0,
  digits: 6,
  window: 1,
  issuer: "xotp",
  account: "",
});
