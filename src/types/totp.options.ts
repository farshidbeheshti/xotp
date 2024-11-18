import { Encoding } from "@src/encoding";

export type TOTPOptions = {
  algorithm: "sha1" | "sha256" | "sha512";
  duration: number;
  digits: number;
  window: number;
  encoding: Encoding;
};
