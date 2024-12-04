import { randomBytes } from "node:crypto";
import { Algorithm } from "./types/algorithms";
import { Encoding } from "./encoding";
import { base32Decode, base32Encode } from "./encoding/base32";

export class Secret {
  #buffer: Buffer;
  constructor();
  constructor({ data }: { data: Buffer });
  constructor({ algorithm }: { algorithm: Algorithm });
  constructor({ size }: { size: number });
  constructor({
    data,
    algorithm,
    size = 256 / 8,
  }: Partial<{
    data: Buffer;
    algorithm: Algorithm;
    size: number;
  }> = {}) {
    let buffer: Buffer;
    if (data) {
      buffer = data;
    } else if (algorithm || size) {
      buffer = randomBytes(
        (algorithm && this.#getRecommendedSizeFor(algorithm)) || size,
      );
    } else {
      throw new TypeError("Constructor arguments are not valid.");
    }
    this.#buffer = buffer;
  }

  get buffer() {
    return this.#buffer;
  }

  static for(algorithm: Algorithm) {
    return new Secret({ algorithm });
  }

  static from(data: string, encoding?: Encoding): Secret;
  static from(data: Buffer): Secret;
  static from(data: Buffer | string, encoding: Encoding = "utf-8"): Secret {
    if (data instanceof Buffer) {
      return new Secret({ data });
    } else {
      if (encoding == "base32") {
        const bytes = base32Decode(data);
        return new Secret({ data: Buffer.from(bytes) });
      }
      return new Secret({ data: Buffer.from(data, encoding) });
    }
  }

  toString(encoding: Encoding = "base32") {
    if (encoding == "base32") return base32Encode(this.#buffer);
    return this.#buffer.toString(encoding);
  }

  #getRecommendedSizeFor(algorithm: Algorithm): number {
    let size = 256 / 8;
    // As defined in RFC 2104, the length of secret key should not be less than
    // the digest size but the extra length would not significantly increase
    // the function strength. See https://tools.ietf.org/html/rfc4226
    switch (algorithm) {
      case "sha1":
        size = 160 / 8;
        break;
      case "sha224":
      case "sha-512/224":
      case "sha3-224":
        size = 224 / 8;
        break;
      case "sha256":
      case "sha-512/256":
      case "sha3-256":
        size = 256 / 8;
        break;
      case "sha384":
      case "sha3-384":
        size = 384 / 8;
        break;
      case "sha512":
      case "sha3-512":
        size = 512 / 8;
        break;
    }
    return size;
  }
}
