import { Algorithm } from "./algorithms.js";
import type { Secret } from "../secret.js";

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
