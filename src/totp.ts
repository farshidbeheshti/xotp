import { TOTPOptions } from "./types/";

class TOTP {
  algorithm = this.defaults.algorithm;
  step = this.defaults.step;
  digits = this.defaults.digits;
  window = this.defaults.window;
  epoch = this.defaults.epoch;
  constructor({
    algorithm = this.defaults.algorithm,
    window = this.defaults.window,
    step = this.defaults.step,
    digits = this.defaults.digits,
  }: Partial<TOTPOptions> = {}) {
    this.digits = digits;
    this.algorithm = algorithm;
    this.window = window;
    this.step = step;
  }

  get defaults(): Readonly<TOTPOptions> {
    return Object.freeze<TOTPOptions>({
      algorithm: "sha1",
      step: 30,
      digits: 6,
      window: 1,
      epoch: Date.now(),
    });
  }

  generate({
    secretKey,
    epoch = Date.now(),
    step = this.step || this.defaults.step,
  }: {
    epoch: number;
    secretKey: string;
    step?: number;
  }) {}

  validate({
    token,
    secret,
    epoch = Date.now(),
    step = this.step || this.defaults.step,
  }: {
    step: number;
    epoch: number;
    secret: string;
    token: string;
  }) {}

  verifyDelta({
    token,
    secret,
    epoch = Date.now(),
    step = this.step || this.defaults.step,
  }: {
    step: number;
    epoch: number;
    secret: string;
    token: string;
  }) {}

  keyUri({ issuer, label }: { issuer: string; label: string }) {}
}

export { TOTP };
