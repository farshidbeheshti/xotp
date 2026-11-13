import {
  TOTPOptions,
  TOTPVerifyResult,
  Algorithm,
  OTPWindow,
} from "./types/index.js";
import { HOTP } from "./hotp.js";
import { Secret } from "./secret.js";
import { resolveSecret } from "./shared/resolveSecret.js";
import { resolveWindow } from "./shared/resolveWindow.js";
import { totpDefaults } from "./shared/totpDefaults.js";
import { URI } from "./uri.js";

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
    this.#hotp = new HOTP({
      algorithm,
      window: resolveWindow(window, "symmetric"),
      digits,
    });
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

  async generate({
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
  } = {}): Promise<string> {
    const resolved = resolveSecret(this.#secret, secret);
    return this.#hotp.generate({
      secret: resolved,
      counter: this.#calcHotpCounter({ timestamp, duration }),
      algorithm,
      digits,
    });
  }

  async validate({
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
    window?: OTPWindow;
  }): Promise<boolean> {
    const resolved = resolveSecret(this.#secret, secret);
    return await this.#hotp.validate({
      token,
      secret: resolved,
      counter: this.#calcHotpCounter({ timestamp, duration }),
      algorithm,
      digits,
      window: resolveWindow(window, "symmetric"),
    });
  }

  async verify({
    token,
    secret,
    timestamp = Date.now(),
    algorithm = this.algorithm,
    digits = this.digits,
    duration = this.duration,
    window = this.window,
    afterTimeStep,
  }: {
    token: string;
    secret?: Secret;
    timestamp?: number;
    algorithm?: Algorithm;
    digits?: number;
    duration?: number;
    window?: OTPWindow;
    afterTimeStep?: number | null;
  }): Promise<TOTPVerifyResult> {
    const resolved = resolveSecret(this.#secret, secret);
    // A non-integer (e.g. NaN) would compare false against every time step
    // and silently turn replay protection off, so fail loudly instead.
    if (afterTimeStep != null && !Number.isSafeInteger(afterTimeStep)) {
      throw new TypeError(
        "afterTimeStep must be an integer: pass the timeStep returned by the last successful verify(), or omit it.",
      );
    }
    const currentTimeStep = this.#calcHotpCounter({ timestamp, duration });
    const { backward, forward } = resolveWindow(window, "symmetric");

    // Same search order as compare(): current step, then +1, -1, +2, -2, ...
    const deltas = [0];
    for (let i = 1; i <= forward || i <= backward; i++) {
      if (i <= forward) deltas.push(i);
      if (i <= backward) deltas.push(-i);
    }

    for (const delta of deltas) {
      const timeStep = currentTimeStep + delta;
      if (afterTimeStep != null && timeStep <= afterTimeStep) continue;
      if (
        await this.#hotp.equals({
          token,
          secret: resolved,
          counter: timeStep,
          algorithm,
          digits,
        })
      )
        return { valid: true, timeStep, delta };
    }
    return { valid: false };
  }

  async compare({
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
    window?: OTPWindow;
  }): Promise<number | null> {
    const resolved = resolveSecret(this.#secret, secret);
    return await this.#hotp.compare({
      token,
      secret: resolved,
      window: resolveWindow(window, "symmetric"),
      algorithm,
      digits,
      counter: this.#calcHotpCounter({ timestamp, duration }),
    });
  }

  async equals({
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
  }): Promise<boolean> {
    const resolved = resolveSecret(this.#secret, secret);
    return await this.#hotp.equals({
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
