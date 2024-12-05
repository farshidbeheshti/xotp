import { Algorithm } from "@src/types";

export type HOTPOptions = {
  algorithm: Algorithm;
  counter: number;
  digits: number;
  window: number;
  issuer: string;
  account: string;
};
