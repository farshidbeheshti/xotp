/**
 * A TOTP step length in seconds. Zero makes every timestamp collapse to the
 * same counter (the same token forever); non-finite values are never usable.
 */
export function assertDuration(duration: number): void {
  // Number.isFinite rejects NaN, ±Infinity and non-numbers like "30".
  if (
    typeof duration !== "number" ||
    !Number.isFinite(duration) ||
    duration <= 0
  ) {
    // Quote strings, so duration of "30" does not read as the valid number 30.
    const shown =
      typeof duration === "string" ? `"${duration}"` : String(duration);
    throw new TypeError(
      `Invalid duration: ${shown}. Must be a finite number greater than 0.`,
    );
  }
}
