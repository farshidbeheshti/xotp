export function parseIntParam(
  value: string | null,
  defaultValue: number,
  name: string,
  min = 0,
): number {
  if (value == null || value === "") return defaultValue;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < min) {
    throw new TypeError(`Invalid ${name}: ${value}`);
  }
  return parsed;
}
