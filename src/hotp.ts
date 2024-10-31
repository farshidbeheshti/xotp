import { HOTPOptions } from "./types";

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
    secretKey,
    counter = this.counter++,
  }: {
    secretKey: string;
    counter?: number;
  }) {}

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
