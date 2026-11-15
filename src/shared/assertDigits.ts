export function assertDigits(digits: number): void {
  // Number.isInteger also rejects NaN, Infinity and non-numbers like "6".
  if (!Number.isInteger(digits) || digits < 1) {
    // Quote strings, so digits of "6" does not read as the valid number 6.
    const shown = typeof digits === "string" ? `"${digits}"` : String(digits);
    throw new TypeError(
      `Invalid digits: ${shown}. Must be a positive integer.`,
    );
  }
}
