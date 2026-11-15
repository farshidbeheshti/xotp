import { isWellFormedToken } from "../../src/shared/isWellFormedToken";

describe("isWellFormedToken", () => {
  test.each<[string, number]>([
    ["755224", 6],
    ["000000", 6],
    ["94287082", 8],
    ["4", 1],
    ["1284755224", 10],
  ])("accepts %p for %p digits", (token, digits) => {
    expect(isWellFormedToken(token, digits)).toBe(true);
  });

  test.each<[string, unknown]>([
    ["an empty string", ""],
    ["a shorter token", "75522"],
    ["a longer token", "7552240"],
    ["a space in the middle", "755 24"],
    ["a space making it longer", "755 224"],
    ["a dash", "755-24"],
    ["a trailing newline", "75522\n"],
    ["a leading space", " 55224"],
    ["a letter", "75522a"],
    ["a sign", "+55224"],
    ["a decimal point", "755.24"],
    ["exponent notation", "7552e1"],
    ["full-width digits", "７５５２２４"],
    ["Persian digits", "۷۵۵۲۲۴"],
    ["a number", 755224],
    ["undefined", undefined],
    ["null", null],
    ["an array", ["7", "5", "5", "2", "2", "4"]],
  ])("rejects %s", (_name, token) => {
    expect(isWellFormedToken(token, 6)).toBe(false);
  });
});
