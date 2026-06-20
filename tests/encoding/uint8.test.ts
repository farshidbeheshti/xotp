import {
  uintDecode,
  uintEncode,
  uint64Decode,
  uint64Encode,
} from "../../src/encoding/uint8";

describe("uintEncode / uintDecode", () => {
  test("round-trips a counter value", () => {
    expect(uintDecode(uintEncode(123456789))).toBe(123456789);
  });

  test("uintDecode accepts Buffer", () => {
    const bytes = uintEncode(42);
    expect(uintDecode(Buffer.from(bytes))).toBe(42);
  });
});

describe("uint64Encode / uint64Decode", () => {
  test("round-trips a bigint value", () => {
    const value = BigInt(9007199254740992); // 2 ** 53
    expect(uint64Decode(uint64Encode(value))).toBe(value);
  });

  test("uint64Decode accepts Buffer", () => {
    const bytes = uint64Encode(BigInt(99));
    expect(uint64Decode(Buffer.from(bytes))).toBe(BigInt(99));
  });
});
