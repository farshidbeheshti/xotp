import { MAX_WINDOW, resolveWindow } from "../../src/shared/resolveWindow";
import type { OTPWindow } from "../../src/types";

const untyped = (window: unknown) => window as OTPWindow;

describe("resolveWindow", () => {
  test("a number is symmetric for TOTP and forward-only for HOTP", () => {
    expect(resolveWindow(2, "symmetric")).toEqual({ backward: 2, forward: 2 });
    expect(resolveWindow(2, "forward")).toEqual({ backward: 0, forward: 2 });
  });

  test("an object keeps its backward and forward sizes", () => {
    const window = { backward: 3, forward: 1 };
    expect(resolveWindow(window, "symmetric")).toEqual(window);
    expect(resolveWindow(window, "forward")).toEqual(window);
  });

  test("a missing window or side searches no steps", () => {
    const none = { backward: 0, forward: 0 };
    expect(resolveWindow(untyped(null), "symmetric")).toEqual(none);
    expect(resolveWindow(untyped(undefined), "symmetric")).toEqual(none);
    expect(resolveWindow(untyped({ forward: 2 }), "symmetric")).toEqual({
      backward: 0,
      forward: 2,
    });
    expect(
      resolveWindow(untyped({ backward: 2, forward: null }), "symmetric"),
    ).toEqual({ backward: 2, forward: 0 });
  });

  test("accepts sizes from 0 up to the cap", () => {
    expect(resolveWindow(0, "symmetric")).toEqual({ backward: 0, forward: 0 });
    expect(resolveWindow(MAX_WINDOW, "symmetric")).toEqual({
      backward: MAX_WINDOW,
      forward: MAX_WINDOW,
    });
    expect(
      resolveWindow({ backward: MAX_WINDOW, forward: MAX_WINDOW }, "forward"),
    ).toEqual({ backward: MAX_WINDOW, forward: MAX_WINDOW });
  });

  test.each([NaN, Infinity, -Infinity, -1, 1.5, MAX_WINDOW + 1, true])(
    "rejects a window of %p",
    (window) => {
      for (const numberIs of ["symmetric", "forward"] as const) {
        expect(() => resolveWindow(untyped(window), numberIs)).toThrow(
          new TypeError(
            `Invalid window: ${String(window)}. Must be an integer from 0 to ${MAX_WINDOW}.`,
          ),
        );
      }
    },
  );

  test("rejects a numeric string and quotes it in the message", () => {
    expect(() => resolveWindow(untyped("1"), "symmetric")).toThrow(
      new TypeError(
        `Invalid window: "1". Must be an integer from 0 to ${MAX_WINDOW}.`,
      ),
    );
    expect(() =>
      resolveWindow(untyped({ backward: 1, forward: "1" }), "symmetric"),
    ).toThrow(
      new TypeError(
        `Invalid window.forward: "1". Must be an integer from 0 to ${MAX_WINDOW}.`,
      ),
    );
  });

  test.each([NaN, Infinity, -1, 1.5, MAX_WINDOW + 1])(
    "rejects a backward or forward size of %p",
    (size) => {
      expect(() =>
        resolveWindow(untyped({ backward: size, forward: 1 }), "symmetric"),
      ).toThrow(
        new TypeError(
          `Invalid window.backward: ${String(size)}. Must be an integer from 0 to ${MAX_WINDOW}.`,
        ),
      );
      expect(() =>
        resolveWindow(untyped({ backward: 1, forward: size }), "symmetric"),
      ).toThrow(
        new TypeError(
          `Invalid window.forward: ${String(size)}. Must be an integer from 0 to ${MAX_WINDOW}.`,
        ),
      );
    },
  );
});
