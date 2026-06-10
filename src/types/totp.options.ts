import { Algorithm } from "@src/types";
import type { Secret } from "../secret";

export type TOTPOptions = {
  algorithm: Algorithm;
  duration: number;
  digits: number;
  window: number;
  issuer: string;
  account: string;
  secret?: Secret;
  generateSecret?: boolean;
};
