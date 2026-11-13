import { Algorithm } from "./algorithms.js";
import type { Secret } from "../secret.js";
import type { OTPWindow } from "./window.js";

export type HOTPOptions = {
  algorithm: Algorithm;
  counter: number;
  digits: number;
  window: OTPWindow;
  issuer: string;
  account: string;
  secret?: Secret;
  generateSecret?: boolean;
};
