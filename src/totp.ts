import { TOTPOptions, Algorithm } from "@src/types";
import { HOTP } from "./hotp";
import { Secret } from "./secret";

class TOTP {
  algorithm = this.defaults.algorithm;
  digits = this.defaults.digits;
  window = this.defaults.window;
  duration = this.defaults.duration;
  #hotp: HOTP;
  constructor({
    algorithm = this.defaults.algorithm,
    window = this.defaults.window,
    duration = this.defaults.duration,
    digits = this.defaults.digits,
  }: Partial<TOTPOptions> = {}) {
    this.algorithm = algorithm;
    this.digits = digits;
    this.window = window;
    this.duration = duration;
    this.#hotp = new HOTP({ algorithm, window, digits });
  }
  get defaults(): Readonly<TOTPOptions> {
    return Object.freeze<TOTPOptions>({
      algorithm: "sha1",
      duration: 30,
      digits: 6,
      window: 1,
    });
  }

  generate({
    secret,
    timestamp = Date.now(),
    algorithm = this.algorithm,
    digits = this.digits,
    duration = this.duration,
  }: {
    secret: Secret;
    timestamp?: number;
    algorithm?: Algorithm;
    digits?: number;
    duration?: number;
  }) {
    return this.#hotp.generate({
      secret,
      counter: this.#calcHotpCounter({ timestamp, duration }),
      algorithm,
      digits,
    });
  }

  validate({
    token,
    secret,
    timestamp = Date.now(),
    algorithm = this.algorithm,
    digits = this.digits,
    duration = this.duration,
    window = this.window,
  }: {
    token: string;
    secret: Secret;
    timestamp?: number;
    algorithm?: Algorithm;
    digits?: number;
    duration?: number;
    window?: number;
  }): boolean {
    return this.#hotp.validate({
      token,
      secret,
      counter: this.#calcHotpCounter({ timestamp, duration }),
      algorithm,
      digits,
      window: window,
    });
  }

  compare({
    token,
    secret,
    timestamp = Date.now(),
    algorithm = this.algorithm,
    digits = this.digits,
    duration = this.duration,
    window = this.window,
  }: {
    token: string;
    secret: Secret;
    timestamp?: number;
    algorithm?: Algorithm;
    digits?: number;
    duration?: number;
    window?: number;
  }): number | null {
    return this.#hotp.compare({
      token,
      secret,
      window,
      algorithm,
      digits,
      counter: this.#calcHotpCounter({ timestamp, duration }),
    });
  }

  equals({
    token,
    secret,
    timestamp = Date.now(),
    algorithm = this.algorithm,
    digits = this.digits,
    duration = this.duration,
  }: {
    token: string;
    secret: Secret;
    timestamp: number;
    algorithm?: Algorithm;
    digits?: number;
    duration: number;
  }): boolean {
    return this.#hotp.equals({
      token,
      secret,
      algorithm,
      digits,
      counter: this.#calcHotpCounter({ timestamp, duration }),
    });
  }

  timeUsed({
    timestamp = Date.now(),
    duration = this.duration,
  }: {
    timestamp?: number;
    duration?: number;
  } = {}): number {
    return ((timestamp / 1000) | 0) % duration;
  }

  timeRemaining({
    timestamp = Date.now(),
    duration = this.duration,
  }: {
    timestamp?: number;
    duration?: number;
  } = {}): number {
    return duration - this.timeUsed({ timestamp, duration });
  }

  keyUri({ issuer, label }: { issuer: string; label: string }) {}

  #calcHotpCounter({
    timestamp,
    duration,
  }: {
    timestamp: number;
    duration: number;
  }) {
    return (timestamp / 1000 / duration) | 0;
  }
}

export { TOTP };
