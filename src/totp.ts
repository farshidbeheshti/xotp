import { TOTPOptions, Algorithm } from "@src/types";
import { HOTP } from "./hotp";
import { Secret } from "./secret";
import { resolveSecret } from "./shared/resolveSecret";
import { totpDefaults } from "./shared/totpDefaults";
import { URI } from "./uri";

class TOTP {
  algorithm = this.defaults.algorithm;
  digits = this.defaults.digits;
  window = this.defaults.window;
  duration = this.defaults.duration;
  issuer = this.defaults.issuer;
  account = this.defaults.account;
  #secret?: Secret;
  #hotp: HOTP;

  constructor({
    algorithm = this.defaults.algorithm,
    window = this.defaults.window,
    duration = this.defaults.duration,
    digits = this.defaults.digits,
    issuer = this.defaults.issuer,
    account = this.defaults.account,
    secret,
    generateSecret = false,
  }: Partial<TOTPOptions> = {}) {
    this.algorithm = algorithm;
    this.digits = digits;
    this.window = window;
    this.duration = duration;
    this.issuer = issuer;
    this.account = account;
    if (secret) {
      this.#secret = secret;
    } else if (generateSecret) {
      this.#secret = Secret.for(algorithm);
    }
    this.#hotp = new HOTP({ algorithm, window, digits });
  }

  get secret(): Secret | undefined {
    return this.#secret;
  }

  static create(opts: Partial<TOTPOptions> = {}): TOTP {
    return new TOTP({ ...opts, generateSecret: true });
  }

  static fromKeyUri(uri: string): TOTP {
    const parsed = URI.parse(uri);
    if (parsed.type !== "totp") {
      throw new TypeError("Expected TOTP key URI");
    }
    const { type: _type, secret, account, ...options } = parsed;
    return new TOTP({
      secret,
      account,
      ...options,
      generateSecret: false,
    });
  }

  get defaults(): Readonly<TOTPOptions> {
    return totpDefaults;
  }

  generate({
    secret,
    timestamp = Date.now(),
    algorithm = this.algorithm,
    digits = this.digits,
    duration = this.duration,
  }: {
    secret?: Secret;
    timestamp?: number;
    algorithm?: Algorithm;
    digits?: number;
    duration?: number;
  } = {}) {
    const resolved = resolveSecret(this.#secret, secret);
    return this.#hotp.generate({
      secret: resolved,
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
    secret?: Secret;
    timestamp?: number;
    algorithm?: Algorithm;
    digits?: number;
    duration?: number;
    window?: number;
  }): boolean {
    const resolved = resolveSecret(this.#secret, secret);
    return this.#hotp.validate({
      token,
      secret: resolved,
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
    secret?: Secret;
    timestamp?: number;
    algorithm?: Algorithm;
    digits?: number;
    duration?: number;
    window?: number;
  }): number | null {
    const resolved = resolveSecret(this.#secret, secret);
    return this.#hotp.compare({
      token,
      secret: resolved,
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
    secret?: Secret;
    timestamp?: number;
    algorithm?: Algorithm;
    digits?: number;
    duration?: number;
  }): boolean {
    const resolved = resolveSecret(this.#secret, secret);
    return this.#hotp.equals({
      token,
      secret: resolved,
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

  toKeyUri({
    secret,
    account = this.account,
    issuer = this.issuer,
    algorithm = this.algorithm,
    duration = this.duration,
    digits = this.digits,
  }: {
    secret?: Secret;
    account?: string;
    issuer?: string;
    algorithm?: Algorithm;
    duration?: number;
    digits?: number;
  } = {}): string {
    return URI.format({
      type: "totp",
      secret: resolveSecret(this.#secret, secret),
      account,
      algorithm,
      digits,
      duration,
      issuer,
    });
  }

  /** @deprecated Use {@link TOTP.toKeyUri} instead. */
  keyUri(
    opts: {
      secret?: Secret;
      account?: string;
      issuer?: string;
      algorithm?: Algorithm;
      duration?: number;
      digits?: number;
    } = {},
  ): string {
    return this.toKeyUri(opts);
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
