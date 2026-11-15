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

  test.each<[string, () => Secret]>([
    ["from('')", () => Secret.from("")],
    ["from(whitespace-only base32)", () => Secret.from(" \t\n")],
    ["from(padding-only base32)", () => Secret.from("====")],
    ["from('', 'utf-8')", () => Secret.from("", "utf-8")],
    ["from('', 'hex')", () => Secret.from("", "hex")],
    ["from(empty Uint8Array)", () => Secret.from(new Uint8Array(0))],
    [
      "new Secret({ data: empty })",
      () => new Secret({ data: new Uint8Array(0) }),
    ],
  ])("%s rejects an empty secret", (_name, create) => {
    expect(create).toThrow(new TypeError("Secret must not be empty."));
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

  test("from(string) defaults to base32", () => {
    expect(Secret.from("JBSWY3DPEHPK3PXP").buffer).toEqual(
      Secret.from("JBSWY3DPEHPK3PXP", "base32").buffer,
    );
  });

  test("from(secret.toString()) round-trips", () => {
    const secret = new Secret();
    expect(Secret.from(secret.toString()).buffer).toEqual(secret.buffer);
  });

  test("from(base32) ignores whitespace", () => {
    expect(Secret.from("JBSW Y3DP\tEHPK\n3PXP", "base32").buffer).toEqual(
      Secret.from("JBSWY3DPEHPK3PXP", "base32").buffer,
    );
  });

  test.each([".", "(", "*", "?", "+", "1"])(
    "from(base32) rejects invalid character %p",
    (char) => {
      expect(() => Secret.from(`JBSWY3DPEHPK3PX${char}`, "base32")).toThrow(
        new TypeError(`Invalid base32 character: ${char}`),
      );
    },
  );

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
