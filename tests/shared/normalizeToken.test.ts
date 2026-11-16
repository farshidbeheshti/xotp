import { normalizeToken } from "../../src/shared/normalizeToken";

describe("normalizeToken", () => {
  test.each<[unknown, number, string]>([
    ["755224", 6, "755224"],
    ["000000", 6, "000000"],
    ["94287082", 8, "94287082"],
    ["4", 1, "4"],
    ["1284755224", 10, "1284755224"],
    ["755 224", 6, "755224"],
    ["755-224", 6, "755224"],
    ["755224\n", 6, "755224"],
    [" 755224 ", 6, "755224"],
    ["75-5 224", 6, "755224"],
    [755224, 6, "755224"],
    [0, 6, "000000"],
    [4, 1, "4"],
    // Shorter numbers are padded to digits (leading zeros cannot survive as a number).
    [55224, 6, "055224"],
  ])("accepts %p for %p digits as %p", (token, digits, expected) => {
    expect(normalizeToken(token, digits)).toBe(expected);
  });

  test.each<[string, unknown]>([
    ["an empty string", ""],
    ["a shorter token", "75522"],
    ["a longer token", "7552240"],
    ["a space making it shorter", "755 24"],
    ["a dash making it shorter", "755-24"],
    ["a letter", "75522a"],
    ["a sign", "+55224"],
    ["a decimal point", "755.24"],
    ["exponent notation", "7552e1"],
    ["full-width digits", "７５５２２４"],
    ["Persian digits", "۷۵۵۲۲۴"],
    ["a float", 755224.5],
    ["a negative number", -755224],
    ["NaN", NaN],
    ["Infinity", Infinity],
    ["a number longer than digits", 7552240],
    ["undefined", undefined],
    ["null", null],
    ["an array", ["7", "5", "5", "2", "2", "4"]],
  ])("rejects %s", (_name, token) => {
    expect(normalizeToken(token, 6)).toBe(null);
  });
});
