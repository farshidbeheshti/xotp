import { Algorithm } from "@src/types";

export type TOTPOptions = {
  algorithm: Algorithm;
  duration: number;
  digits: number;
  window: number;
};
