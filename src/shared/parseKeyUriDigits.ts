import { parseIntParam } from "./parseIntParam";
import { totpDefaults } from "./totpDefaults";

export function parseKeyUriDigits(
  value: string | null,
  defaultDigits: number = totpDefaults.digits,
): number {
  const digits = parseIntParam(value, defaultDigits, "digits");
  if (digits !== 6 && digits !== 8) {
    throw new TypeError(`Invalid digits: ${digits}. Must be 6 or 8`);
  }
  return digits;
}
