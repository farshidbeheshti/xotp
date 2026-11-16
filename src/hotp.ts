import { hmac, timingSafeEqual } from "./crypto/index.js";
import {
  HOTPOptions,
  Algorithm,
  OTPWindow,
  SecretInput,
} from "./types/index.js";
import { encodeBytes, uintEncode } from "./encoding/index.js";
import { padStart } from "./utils.js";
import { Secret } from "./secret.js";
import { assertDigits } from "./shared/assertDigits.js";
import { normalizeToken } from "./shared/normalizeToken.js";
import { resolveSecret, toSecret } from "./shared/resolveSecret.js";
import { resolveWindow } from "./shared/resolveWindow.js";
import { hotpDefaults } from "./shared/hotpDefaults.js";
import { URI } from "./uri.js";

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
    // Fail at construction on an invalid window or digits, not on first use.
    resolveWindow(window, "forward");
    assertDigits(digits);
    this.digits = digits;
    this.algorithm = algorithm;
    this.window = window;
    this.counter = counter;
    this.issuer = issuer;
    this.account = account;
    // `!= null`, not truthiness: an empty string must be rejected by
    // toSecret(), not skipped (and replaced by a generated secret).
    if (secret != null) {
      this.#secret = toSecret(secret);
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

  async generate({
    secret,
    counter = this.counter++,
    algorithm = this.algorithm,
    digits = this.digits,
  }: {
    secret?: SecretInput;
    counter?: number;
    algorithm?: Algorithm;
    digits?: number;
  } = {}): Promise<string> {
    const resolved = resolveSecret(this.#secret, secret);
    assertDigits(digits);
    const digest = await hmac(algorithm, resolved.buffer, uintEncode(counter));

    const offset = digest[digest.byteLength - 1] & 0xf;
    const truncatedBinary =
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff);
    const token = truncatedBinary % 10 ** digits;
    return padStart(`${token}`, digits, "0");
  }

  async validate({
    token,
    secret,
    counter = this.counter,
    algorithm = this.algorithm,
    digits = this.digits,
    window = this.window,
  }: {
    token: string | number;
    secret?: SecretInput;
    counter?: number;
    algorithm?: Algorithm;
    digits?: number;
    window?: OTPWindow;
  }): Promise<boolean> {
    const resolved = resolveSecret(this.#secret, secret);
    return (
      (await this.compare({
        token,
        secret: resolved,
        counter,
        digits,
        algorithm,
        window,
      })) != null
    );
  }

  async compare({
    token,
    secret,
    counter = this.counter,
    digits = this.digits,
    algorithm = this.algorithm,
    window = this.window,
  }: {
    token: string | number;
    secret?: SecretInput;
    counter?: number;
    digits?: number;
    algorithm?: Algorithm;
    window?: OTPWindow;
  }): Promise<number | null> {
    const resolved = resolveSecret(this.#secret, secret);
    const { backward, forward } = resolveWindow(window, "forward");
    if (
      await this.equals({ token, secret: resolved, counter, digits, algorithm })
    )
      return 0;
    for (let i = 1; i <= forward || i <= backward; i++) {
      if (
        i <= forward &&
        (await this.equals({
          token,
          secret: resolved,
          counter: counter + i,
          digits,
          algorithm,
        }))
      )
        return i;
      if (
        i <= backward &&
        (await this.equals({
          token,
          secret: resolved,
          counter: counter - i,
          digits,
          algorithm,
        }))
      )
        return -i;
    }
    return null;
  }

  async equals({
    token,
    secret,
    counter = this.counter,
    algorithm = this.algorithm,
    digits = this.digits,
  }: {
    token: string | number;
    secret?: SecretInput;
    counter?: number;
    algorithm?: Algorithm;
    digits?: number;
  }): Promise<boolean> {
    const resolved = resolveSecret(this.#secret, secret);
    // Checked before the token, so invalid digits throw even for a bad token.
    assertDigits(digits);
    // Spaces, dashes, and numbers are normalized first. Anything that still
    // cannot be a digit string of length `digits` is a wrong token, not an
    // error, and there is no HMAC to compute.
    const normalized = normalizeToken(token, digits);
    if (normalized == null) return false;
    const generatedToken = await this.generate({
      secret: resolved,
      counter,
      algorithm,
      digits,
    });
    return timingSafeEqual(
      encodeBytes(normalized),
      encodeBytes(generatedToken),
    );
  }

  toKeyUri({
    secret,
    account = this.account,
    issuer = this.issuer,
    algorithm = this.algorithm,
    counter = this.counter,
    digits = this.digits,
  }: {
    secret?: SecretInput;
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
      secret?: SecretInput;
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
