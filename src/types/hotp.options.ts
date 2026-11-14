import { Algorithm } from "./algorithms.js";
import type { OTPWindow } from "./window.js";
import type { SecretInput } from "./secret.js";

export type HOTPOptions = {
  algorithm: Algorithm;
  counter: number;
  digits: number;
  window: OTPWindow;
  issuer: string;
  account: string;
  secret?: SecretInput;
  generateSecret?: boolean;
};
