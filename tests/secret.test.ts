import { Secret } from "../src";
import type { Algorithm } from "../src/types";

const recommendedSizes: [Algorithm, number][] = [
  ["sha1", 160 / 8],
  ["sha224", 224 / 8],
  ["sha-512/224", 224 / 8],
  ["sha3-224", 224 / 8],
  ["sha256", 256 / 8],
  ["sha-512/256", 256 / 8],
  ["sha3-256", 256 / 8],
  ["sha384", 384 / 8],
  ["sha3-384", 384 / 8],
  ["sha512", 512 / 8],
  ["sha3-512", 512 / 8],
];

describe("Secret", () => {
  test("throws when constructor args cannot produce a buffer", () => {
    expect(() => new Secret({ size: 0 })).toThrow(
      /Constructor arguments are not valid/,
    );
  });

  test("from(Buffer) wraps the buffer", () => {
    const buf = Buffer.from("hello");
    expect(Secret.from(buf).buffer).toEqual(buf);
  });

  test("toString with non-base32 encoding", () => {
    const secret = Secret.from("hello", "ascii");
    expect(secret.toString("ascii")).toBe("hello");
    expect(secret.toString("hex")).toBe("68656c6c6f");
  });

  test.each(recommendedSizes)(
    "for(%s) creates a secret of recommended byte length",
    (algorithm, expectedLength) => {
      expect(Secret.for(algorithm).buffer.length).toBe(expectedLength);
    },
  );

  test("custom size creates a secret of given length", () => {
    expect(new Secret({ size: 32 }).buffer.length).toBe(32);
  });
});
