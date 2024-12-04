import { createHmac, timingSafeEqual } from "node:crypto";
import { HOTPOptions } from "./types";
import { uintEncode, Encoding } from "./encoding";
import { padStart } from "./utils";
import { Secret } from "./secret";

class HOTP {
  algorithm = this.defaults.algorithm;
  counter = this.defaults.counter;
  digits = this.defaults.digits;
  window = this.defaults.window;
  constructor({
    algorithm = this.defaults.algorithm,
    window = this.defaults.window,
    counter = this.defaults.counter,
    digits = this.defaults.digits,
  }: Partial<HOTPOptions> = {}) {
    this.digits = digits;
    this.algorithm = algorithm;
    this.window = window;
    this.counter = counter;
  }

  get defaults(): Readonly<HOTPOptions> {
    return Object.freeze<HOTPOptions>({
      algorithm: "sha1",
      counter: 0,
      digits: 6,
      window: 1,
    });
  }

  generate({
    secret,
    counter = this.counter++,
  }: {
    secret: Secret;
    counter?: number;
  }) {
    const digest = createHmac(this.algorithm, secret.buffer)
      .update(uintEncode(counter))
      .digest();

    const offset = digest[digest.byteLength - 1] & 0xf;
    const truncatedBinary =
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff);
    const token = truncatedBinary % 10 ** this.digits;
    return padStart(`${token}`, this.digits, "0");
  }

  validate({
    token,
    secret,

    counter = this.counter,
    window = this.window,
  }: {
    token: string;
    secret: Secret;
    counter?: number;
    window?: number;
  }): boolean {
    return (
      this.compare({
        token,
        secret,
        counter,
        window,
      }) != null
    );
  }

  compare({
    token,
    secret,
    counter = this.counter,
    window = this.window,
  }: {
    token: string;
    secret: Secret;

    counter?: number;
    window?: number;
  }): number | null {
    if (this.equals({ token, secret, counter })) return 0;
    for (let i = 1; i <= window; i++) {
      if (this.equals({ token, secret, counter: counter + i })) return i;
      if (this.equals({ token, secret, counter: counter - i })) return -i;
    }
    return null;
  }

  equals({
    token,
    secret,
    counter = this.counter,
  }: {
    token: string;
    secret: Secret;
    counter?: number;
  }): boolean {
    const generatedToken = this.generate({ secret, counter });
    return timingSafeEqual(Buffer.from(token), Buffer.from(generatedToken));
  }

  keyUri({ issuer, label }: { issuer: string; label: string }) {}

  #isBase32 = (type: Encoding): type is Encoding => type === "base32";
}

export { HOTP };
