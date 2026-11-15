import { assertDigits } from "../../src/shared/assertDigits";

describe("assertDigits", () => {
  test.each([1, 6, 8, 10, 11, 20])("accepts %p", (digits) => {
    expect(() => assertDigits(digits)).not.toThrow();
  });

  test.each([0, -1, 6.5, NaN, Infinity, null, undefined, true])(
    "rejects %p",
    (digits) => {
      expect(() => assertDigits(digits as number)).toThrow(
        new TypeError(
          `Invalid digits: ${String(digits)}. Must be a positive integer.`,
        ),
      );
    },
  );

  test("rejects a numeric string and quotes it in the message", () => {
    expect(() => assertDigits("6" as unknown as number)).toThrow(
      new TypeError(`Invalid digits: "6". Must be a positive integer.`),
    );
  });
});
