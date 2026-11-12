import type { Secret } from "../secret.js";
import type { HOTPOptions } from "./hotp.options.js";
import type { TOTPOptions } from "./totp.options.js";

export type TOTPKeyUri = {
  type: "totp";
  secret: Secret;
  account: string;
} & Partial<Pick<TOTPOptions, "algorithm" | "digits" | "duration" | "issuer">>;

export type HOTPKeyUri = {
  type: "hotp";
  secret: Secret;
  account: string;
} & Partial<Pick<HOTPOptions, "algorithm" | "digits" | "counter" | "issuer">>;

export type KeyUri = TOTPKeyUri | HOTPKeyUri;