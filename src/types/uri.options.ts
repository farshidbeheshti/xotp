import { Secret } from "../secret";
import { HOTPOptions } from "./hotp.options";
import { TOTPOptions } from "./totp.options";

export type URIOptions = {
  secret: Secret;
  account: string;
} & (
  | ({ type: "totp" } & Partial<Omit<TOTPOptions, "account" | "window">>)
  | ({ type: "hotp" } & Partial<Omit<HOTPOptions, "account" | "window">>)
);
