import { TOTPOptions } from "./types/";
import { HOTP } from "./hotp";
import { Encoding } from "crypto";

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
    encoding,
    timestamp = Date.now(),
    duration = this.duration,
  }: {
    secret: string;
    encoding: Encoding;
    timestamp?: number;
    duration?: number;
  }) {
    return this.#hotp.generate({
      secret,
      encoding,
      counter: this.#calcHotpCounter({ timestamp, duration }),
    });
  }

  validate({
    token,
    secret,
    encoding,
    timestamp = Date.now(),
    duration = this.duration,
    window = this.window,
  }: {
    token: string;
    secret: string;
    encoding: Encoding;
    timestamp?: number;
    duration?: number;
    window?: number;
  }): boolean {
    return this.#hotp.validate({
      token,
      secret,
      encoding,
      window: window,
      counter: this.#calcHotpCounter({ timestamp, duration }),
    });
  }

  compare({
    token,
    secret,
    encoding,
    timestamp = Date.now(),
    duration = this.duration,
    window = this.window,
  }: {
    token: string;
    secret: string;
    encoding: Encoding;
    timestamp: number;
    duration: number;
    window?: number;
  }): number | null {
    return this.#hotp.compare({
      token,
      secret,
      encoding,
      window,
      counter: this.#calcHotpCounter({ timestamp, duration }),
    });
  }

  equals({
    token,
    secret,
    encoding,
    timestamp = Date.now(),
    duration = this.duration,
  }: {
    token: string;
    secret: string;
    encoding: Encoding;
    timestamp: number;
    duration: number;
  }): boolean {
    return this.#hotp.equals({
      token,
      secret,
      encoding,
      counter: this.#calcHotpCounter({ timestamp, duration }),
    });
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
