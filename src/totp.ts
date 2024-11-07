import { TOTPOptions } from "./types/";

class TOTP {
  algorithm = this.defaults.algorithm;
  duration = this.defaults.duration;
  digits = this.defaults.digits;
  window = this.defaults.window;
  timestamp = this.defaults.timestamp;
  constructor({
    algorithm = this.defaults.algorithm,
    window = this.defaults.window,
    duration = this.defaults.duration,
    digits = this.defaults.digits,
  }: Partial<TOTPOptions> = {}) {
    this.digits = digits;
    this.algorithm = algorithm;
    this.window = window;
    this.duration = duration;
  }

  get defaults(): Readonly<TOTPOptions> {
    return Object.freeze<TOTPOptions>({
      algorithm: "sha1",
      duration: 30,
      digits: 6,
      window: 1,
      timestamp: Date.now(),
    });
  }

  generate({
    secretKey,
    timestamp = Date.now(),
    duration = this.duration || this.defaults.duration,
  }: {
    timestamp: number;
    secretKey: string;
    duration?: number;
  }) {}

  validate({
    token,
    secret,
    timestamp = Date.now(),
    duration = this.duration || this.defaults.duration,
  }: {
    duration: number;
    timestamp: number;
    secret: string;
    token: string;
  }) {}

  verifyDelta({
    token,
    secret,
    timestamp = Date.now(),
    duration = this.duration || this.defaults.duration,
  }: {
    duration: number;
    timestamp: number;
    secret: string;
    token: string;
  }) {}

  keyUri({ issuer, label }: { issuer: string; label: string }) {}
}

export { TOTP };
