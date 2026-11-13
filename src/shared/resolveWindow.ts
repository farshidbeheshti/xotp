import type { OTPWindow } from "../types/index.js";

// A plain number means different things per algorithm: TOTP searches both
// directions, HOTP only looks ahead (a past counter is an already-used one).
export function resolveWindow(
  window: OTPWindow,
  numberIs: "symmetric" | "forward",
): { backward: number; forward: number } {
  // `typeof null` is "object": a null from an untyped caller takes the number
  // path, where it searches no window, instead of failing on destructuring.
  if (typeof window !== "object" || window === null) {
    return { backward: numberIs === "symmetric" ? window : 0, forward: window };
  }
  return window;
}
