import { Algorithm } from "../types/index.js";

const HMAC_HASHES: Partial<Record<Algorithm, string>> = {
  sha1: "SHA-1",
  sha256: "SHA-256",
  sha384: "SHA-384",
  sha512: "SHA-512",
};

function getWebCrypto(): Crypto {
  const webcrypto = (globalThis as { crypto?: Crypto }).crypto;
  if (webcrypto && typeof webcrypto.subtle !== "undefined") {
    return webcrypto;
  }
  throw new Error(
    "xotp requires the Web Crypto API (globalThis.crypto.subtle), which is " +
      "available in Node.js 20+, Deno, Bun, modern browsers, and edge runtimes.",
  );
}

/** Maps an xotp {@link Algorithm} to a Web Crypto HMAC hash name. */
function toHmacHash(algorithm: Algorithm): string {
  const hash = HMAC_HASHES[algorithm];
  if (!hash) {
    throw new TypeError(
      `Unsupported HMAC algorithm: "${algorithm}". The Web Crypto API only ` +
        `supports HMAC with sha1, sha256, sha384, and sha512.`,
    );
  }
  return hash;
}

/** Cryptographically secure random bytes via Web Crypto. */
export function randomBytes(size: number): Uint8Array {
  const bytes = new Uint8Array(size);
  getWebCrypto().getRandomValues(bytes);
  return bytes;
}

/** Computes an HMAC digest using the Web Crypto SubtleCrypto API. */
export async function hmac(
  algorithm: Algorithm,
  key: Uint8Array,
  message: Uint8Array,
): Promise<Uint8Array> {
  const subtle = getWebCrypto().subtle;
  const cryptoKey = await subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: toHmacHash(algorithm) },
    false,
    ["sign"],
  );
  const signature = await subtle.sign("HMAC", cryptoKey, message);
  return new Uint8Array(signature);
}

/** Constant-time comparison of two byte arrays. */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}
