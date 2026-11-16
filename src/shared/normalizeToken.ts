/**
 * Coerce end-user OTP input into a digit string of length `digits`, or `null`
 * if it can never match. Strips ASCII whitespace and dashes; accepts
 * non-negative safe integers (padded with leading zeros to `digits`).
 */
export function normalizeToken(
  token: unknown,
  digits: number,
): string | null {
  let raw: string;

  if (typeof token === "number") {
    // Floats, negatives, and values past MAX_SAFE_INTEGER cannot round-trip
    // into a digit string without loss, so treat them as wrong tokens.
    if (!Number.isSafeInteger(token) || token < 0) return null;
    raw = String(token);
    if (raw.length > digits) return null;
    raw = raw.padStart(digits, "0");
  } else if (typeof token === "string") {
    raw = token.replace(/[\s-]/g, "");
  } else {
    return null;
  }

  if (raw.length !== digits || !/^[0-9]+$/.test(raw)) return null;
  return raw;
}
