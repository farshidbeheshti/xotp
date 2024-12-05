import { createHmac, timingSafeEqual } from "node:crypto";
import { HOTPOptions, Algorithm } from "@src/types";
import { uintEncode } from "./encoding";
import { padStart } from "./utils";
import { Secret } from "./secret";

class HOTP {
  algorithm = this.defaults.algorithm;
  counter = this.defaults.counter;
  digits = this.defaults.digits;
  window = this.defaults.window;
  issuer = this.defaults.issuer;
  account = this.defaults.account;
  constructor({
    algorithm = this.defaults.algorithm,
    window = this.defaults.window,
    counter = this.defaults.counter,
    digits = this.defaults.digits,
    issuer = this.defaults.issuer,
    account = this.defaults.account,
  }: Partial<HOTPOptions> = {}) {
    this.digits = digits;
    this.algorithm = algorithm;
    this.window = window;
    this.counter = counter;
    this.issuer = issuer;
    this.account = account;
  }

  get defaults(): Readonly<HOTPOptions> {
    return Object.freeze<HOTPOptions>({
      algorithm: "sha1",
      counter: 0,
      digits: 6,
      window: 1,
      issuer: "xotp",
      account: "",
    });
  }

  generate({
    secret,
    counter = ++this.counter,
    algorithm = this.algorithm,
    digits = this.digits,
  }: {
    secret: Secret;
    counter?: number;
    algorithm?: Algorithm;
    digits?: number;
  }) {
    const digest = createHmac(algorithm, secret.buffer)
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
    secret: Secret;
    counter?: number;
    algorithm?: Algorithm;
    digits?: number;
    window?: number;
  }): boolean {
    return (
      this.compare({
        token,
        secret,
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
    secret: Secret;
    counter?: number;
    digits?: number;
    algorithm?: Algorithm;
    window?: number;
  }): number | null {
    if (this.equals({ token, secret, counter, digits, algorithm })) return 0;
    for (let i = 1; i <= window; i++) {
      if (
        this.equals({ token, secret, counter: counter + i, digits, algorithm })
      )
        return i;
      if (
        this.equals({ token, secret, counter: counter - i, digits, algorithm })
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
    secret: Secret;
    counter?: number;
    algorithm?: Algorithm;
    digits?: number;
  }): boolean {
    const generatedToken = this.generate({
      secret,
      counter,
      algorithm,
      digits,
    });
    return timingSafeEqual(Buffer.from(token), Buffer.from(generatedToken));
  }

  keyUri({
    secret,
    account,
    issuer = this.defaults.issuer,
    algorithm = this.defaults.algorithm,
    counter = this.defaults.counter,
    digits = this.defaults.digits,
  }: {
    secret: Secret;
    account: string;
    issuer?: string;
    algorithm?: Algorithm;
    counter?: number;
    digits?: number;
  }): string {
    const e = encodeURIComponent;
    const params = [
      `secret=${e(secret.toString("base32").replace(/=+$/, ""))}`,
      `algorithm=${e(algorithm.toUpperCase())}`,
      `digits=${e(digits)}`,
      `counter=${e(counter)}`,
    ];
    let label = account;
    if (issuer) {
      label = `${e(issuer)}:${e(label)}`;
      params.push(`issuer=${e(issuer)}`);
    }
    return `otpauth://hotp/${label}?${params.join("&")}`;
  }
}

export { HOTP };
