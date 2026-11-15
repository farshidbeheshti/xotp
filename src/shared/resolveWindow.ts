import type { OTPWindow } from "../types/index.js";

/**
 * The most steps a window may search in one direction. This is a sanity bound,
 * not a security policy: it catches mistakes such as passing seconds instead
 * of steps, and stops a huge value from tying up the process with HMACs.
 */
export const MAX_WINDOW = 100;

// A missing size (null or undefined) searches no steps in that direction.
function windowSize(size: number | null | undefined, name: string): number {
  const steps = size ?? 0;
  // Number.isInteger also rejects NaN, Infinity and non-numbers like "1".
  if (!Number.isInteger(steps) || steps < 0 || steps > MAX_WINDOW) {
    // Quote strings, so a window of "1" does not read as the valid number 1.
    const shown = typeof steps === "string" ? `"${steps}"` : String(steps);
    throw new TypeError(
      `Invalid ${name}: ${shown}. Must be an integer from 0 to ${MAX_WINDOW}.`,
    );
  }
  return steps;
}

// A plain number means different things per algorithm: TOTP searches both
// directions, HOTP only looks ahead (a past counter is an already-used one).
export function resolveWindow(
  window: OTPWindow,
  numberIs: "symmetric" | "forward",
): { backward: number; forward: number } {
  // `typeof null` is "object": a null from an untyped caller takes the number
  // path, where it searches no window, instead of failing on destructuring.
  if (typeof window !== "object" || window === null) {
    const steps = windowSize(window, "window");
    return { backward: numberIs === "symmetric" ? steps : 0, forward: steps };
  }
  return {
    backward: windowSize(window.backward, "window.backward"),
    forward: windowSize(window.forward, "window.forward"),
  };
}
