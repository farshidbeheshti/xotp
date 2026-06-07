import { createHmac, timingSafeEqual } from "node:crypto";
import { HOTPOptions, Algorithm } from "@src/types";
import { uintEncode } from "./encoding";
import { padStart } from "./utils";
import { Secret } from "./secret";
import { resolveSecret } from "./shared/resolveSecret";
import { hotpDefaults } from "./shared/hotpDefaults";
import { URI } from "./uri";

class HOTP {
  algorithm = this.defaults.algorithm;
  counter = this.defaults.counter;
  digits = this.defaults.digits;
  window = this.defaults.window;
  issuer = this.defaults.issuer;
  account = this.defaults.account;
  #secret?: Secret;

  constructor({
    algorithm = this.defaults.algorithm,
    window = this.defaults.window,
    counter = this.defaults.counter,
    digits = this.defaults.digits,
    issuer = this.defaults.issuer,
    account = this.defaults.account,
    secret,
    generateSecret = false,
  }: Partial<HOTPOptions> = {}) {
    this.digits = digits;
    this.algorithm = algorithm;
    this.window = window;
    this.counter = counter;
    this.issuer = issuer;
    this.account = account;
    if (secret) {
      this.#secret = secret;
    } else if (generateSecret) {
      this.#secret = Secret.for(algorithm);
    }
  }

  get secret(): Secret | undefined {
    return this.#secret;
  }

  static create(opts: Partial<HOTPOptions> = {}): HOTP {
    return new HOTP({ ...opts, generateSecret: true });
  }

  static fromKeyUri(uri: string): HOTP {
    const parsed = URI.parse(uri);
    if (parsed.type !== "hotp") {
      throw new TypeError("Expected HOTP key URI");
    }
    const { type: _type, secret, account, ...options } = parsed;
    return new HOTP({
      secret,
      account,
      ...options,
      generateSecret: false,
    });
  }

  get defaults(): Readonly<HOTPOptions> {
    return hotpDefaults;
  }

  generate({
    secret,
    counter = ++this.counter,
    algorithm = this.algorithm,
    digits = this.digits,
  }: {
    secret?: Secret;
    counter?: number;
    algorithm?: Algorithm;
    digits?: number;
  } = {}) {
    const resolved = resolveSecret(this.#secret, secret);
    const digest = createHmac(algorithm, resolved.buffer)
      .update(uintEncode(counter))
      .digest();

    const offset = digest[digest.byteLength - 1] & 0xf;
    const truncatedBinary =
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff);
    const token = truncatedBinary % 10 ** digits;
    return padStart(`${token}`, digits, "0");
  }

  validate({
    token,
    secret,
    counter = this.counter,
    algorithm = this.algorithm,
    digits = this.digits,
    window = this.window,
  }: {
    token: string;
    secret?: Secret;
    counter?: number;
    algorithm?: Algorithm;
    digits?: number;
    window?: number;
  }): boolean {
    const resolved = resolveSecret(this.#secret, secret);
    return (
      this.compare({
        token,
        secret: resolved,
        counter,
        digits,
        algorithm,
        window,
      }) != null
    );
  }

  compare({
    token,
    secret,
    counter = this.counter,
    digits = this.digits,
    algorithm = this.algorithm,
    window = this.window,
  }: {
    token: string;
    secret?: Secret;
    counter?: number;
    digits?: number;
    algorithm?: Algorithm;
    window?: number;
  }): number | null {
    const resolved = resolveSecret(this.#secret, secret);
    if (this.equals({ token, secret: resolved, counter, digits, algorithm }))
      return 0;
    for (let i = 1; i <= window; i++) {
      if (
        this.equals({
          token,
          secret: resolved,
          counter: counter + i,
          digits,
          algorithm,
        })
      )
        return i;
      if (
        this.equals({
          token,
          secret: resolved,
          counter: counter - i,
          digits,
          algorithm,
        })
      )
        return -i;
    }
    return null;
  }

  equals({
    token,
    secret,
    counter = this.counter,
    algorithm = this.algorithm,
    digits = this.digits,
  }: {
    token: string;
    secret?: Secret;
    counter?: number;
    algorithm?: Algorithm;
    digits?: number;
  }): boolean {
    const resolved = resolveSecret(this.#secret, secret);
    const generatedToken = this.generate({
      secret: resolved,
      counter,
      algorithm,
      digits,
    });
    return timingSafeEqual(Buffer.from(token), Buffer.from(generatedToken));
  }

  toKeyUri({
    secret,
    account = this.account,
    issuer = this.issuer,
    algorithm = this.algorithm,
    counter = this.counter,
    digits = this.digits,
  }: {
    secret?: Secret;
    account?: string;
    issuer?: string;
    algorithm?: Algorithm;
    counter?: number;
    digits?: number;
  } = {}): string {
    return URI.format({
      type: "hotp",
      secret: resolveSecret(this.#secret, secret),
      account,
      algorithm,
      digits,
      counter,
      issuer,
    });
  }

  /** @deprecated Use {@link HOTP.toKeyUri} instead. */
  keyUri(
    opts: {
      secret?: Secret;
      account?: string;
      issuer?: string;
      algorithm?: Algorithm;
      counter?: number;
      digits?: number;
    } = {},
  ): string {
    return this.toKeyUri(opts);
  }
}

export { HOTP };
