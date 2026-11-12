import { randomBytes } from "./crypto/index.js";
import { Algorithm, Encoding } from "./types/index.js";
import { decodeBytes, encodeBytes } from "./encoding/index.js";

export class Secret {
  #bytes: Uint8Array;
  constructor();
  constructor({ data }: { data: Uint8Array });
  constructor({ algorithm }: { algorithm: Algorithm });
  constructor({ size }: { size: number });
  constructor({
    data,
    algorithm,
    size = 160 / 8,
  }: Partial<{
    data: Uint8Array;
    algorithm: Algorithm;
    size: number;
  }> = {}) {
    let bytes: Uint8Array;
    if (data) {
      bytes = data;
    } else if (algorithm || size) {
      bytes = randomBytes(
        (algorithm && this.#getRecommendedSizeFor(algorithm)) || size,
      );
    } else {
      throw new TypeError("Constructor arguments are not valid.");
    }
    this.#bytes = bytes;
  }

  get buffer(): Uint8Array {
    return this.#bytes;
  }

  static for(algorithm: Algorithm) {
    return new Secret({ algorithm });
  }

  static from(data: string, encoding?: Encoding): Secret;
  static from(data: Uint8Array): Secret;
  static from(data: Uint8Array | string, encoding: Encoding = "utf-8"): Secret {
    if (typeof data == "string") {
      return new Secret({ data: encodeBytes(data, encoding) });
    }

    return new Secret({ data });
  }

  toString(encoding: Encoding = "base32") {
    return decodeBytes(this.#bytes, encoding);
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
