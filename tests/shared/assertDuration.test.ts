import { assertDuration } from "../../src/shared/assertDuration";

describe("assertDuration", () => {
  test.each([0.001, 1, 30, 60, 900])("accepts %p", (duration) => {
    expect(() => assertDuration(duration)).not.toThrow();
  });

  test.each([0, -1, -0.5, NaN, Infinity, -Infinity, null, undefined, true])(
    "rejects %p",
    (duration) => {
      expect(() => assertDuration(duration as number)).toThrow(
        new TypeError(
          `Invalid duration: ${String(duration)}. Must be a finite number greater than 0.`,
        ),
      );
    },
  );

  test("rejects a numeric string and quotes it in the message", () => {
    expect(() => assertDuration("30" as unknown as number)).toThrow(
      new TypeError(
        `Invalid duration: "30". Must be a finite number greater than 0.`,
      ),
    );
  });
});
