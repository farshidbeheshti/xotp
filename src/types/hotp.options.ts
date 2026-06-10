import { Algorithm } from "@src/types";
import type { Secret } from "../secret";

export type HOTPOptions = {
  algorithm: Algorithm;
  counter: number;
  digits: number;
  window: number;
  issuer: string;
  account: string;
  secret?: Secret;
  generateSecret?: boolean;
};
