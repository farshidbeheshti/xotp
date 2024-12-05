import { TOTPOptions, Algorithm } from "@src/types";
import { HOTP } from "./hotp";
import { Secret } from "./secret";

class TOTP {
  algorithm = this.defaults.algorithm;
  digits = this.defaults.digits;
  window = this.defaults.window;
  duration = this.defaults.duration;
  issuer = this.defaults.issuer;
  account = this.defaults.account;
  #hotp: HOTP;
  constructor({
    algorithm = this.defaults.algorithm,
    window = this.defaults.window,
    duration = this.defaults.duration,
    digits = this.defaults.digits,
    issuer = this.defaults.issuer,
    account = this.defaults.account,
  }: Partial<TOTPOptions> = {}) {
    this.algorithm = algorithm;
    this.digits = digits;
    this.window = window;
    this.duration = duration;
    this.issuer = issuer;
    this.account = account;
    this.#hotp = new HOTP({ algorithm, window, digits });
  }
  get defaults(): Readonly<TOTPOptions> {
    return Object.freeze<TOTPOptions>({
      algorithm: "sha1",
      duration: 30,
      digits: 6,
      window: 1,
      issuer: "xotp",
      account: "",
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

  keyUri({
    secret,
    account,
    issuer = this.defaults.issuer,
    algorithm = this.defaults.algorithm,
    duration = this.defaults.duration,
    digits = this.defaults.digits,
  }: {
    secret: Secret;
    account: string;
    issuer?: string;
    algorithm?: Algorithm;
    duration?: number;
    digits?: number;
  }): string {
    const e = encodeURIComponent;

    const params = [
      `secret=${e(secret.toString("base32").replace(/=+$/, ""))}`,
      `algorithm=${e(algorithm.toUpperCase())}`,
      `digits=${e(digits)}`,
      `period=${e(duration)}`,
    ];
    let label = account;
    if (issuer) {
      label = `${e(issuer)}:${e(label)}`;
      params.push(`issuer=${e(issuer)}`);
    }
    return `otpauth://totp/${label}?${params.join("&")}`;
  }

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
