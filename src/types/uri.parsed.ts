import { Secret } from "../secret";
import { HOTPOptions } from "./hotp.options";
import { TOTPOptions } from "./totp.options";

export type ParsedTOTP = {
  type: "totp";
  secret: Secret;
  account: string;
  options: Partial<Omit<TOTPOptions, "account">>;
};

export type ParsedHOTP = {
  type: "hotp";
  secret: Secret;
  account: string;
  options: Partial<Omit<HOTPOptions, "account">>;
};

export type ParsedURI = ParsedTOTP | ParsedHOTP;
