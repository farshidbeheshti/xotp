import { createHmac } from "node:crypto";
import { HOTPOptions } from "./types";
import { uintEncode } from "./encoding";
import { padStart } from "./utils";

class HOTP {
  algorithm = this.defaults.algorithm;
  counter = this.defaults.counter;
  digits = this.defaults.digits;
  window = this.defaults.window;

  constructor({
    algorithm = this.defaults.algorithm,
    window = this.defaults.window,
    counter = this.defaults.counter,
    digits = this.defaults.digits,
  }: Partial<HOTPOptions> = {}) {
    this.digits = digits;
    this.algorithm = algorithm;
    this.window = window;
    this.counter = counter;
  }

  get defaults(): Readonly<HOTPOptions> {
    return Object.freeze<HOTPOptions>({
      algorithm: "sha1",
      counter: 0,
      digits: 6,
      window: 1,
    });
  }

  generate({
    secret,
    counter = this.counter++,
  }: {
    secret: string;
    counter?: number;
  }) {
    const digest = createHmac(this.algorithm, Buffer.from(secret))
      .update(uintEncode(counter))
      .digest();

    const offset = digest[digest.byteLength - 1] & 0xf;
    const truncatedBinary =
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff);
    const token = truncatedBinary % 10 ** this.digits;
    return padStart(`${token}`, this.digits, "0");
  }

  validate({
    token,
    secret,
    counter = this.counter,
  }: {
    token: string;
    secret: string;
    counter?: number;
  }) {}

  verifyDelta({
    token,
    secret,
    counter = this.counter,
  }: {
    token: string;
    secret: string;
    counter?: number;
  }) {}

  keyUri({ issuer, label }: { issuer: string; label: string }) {}
}

export { HOTP };
