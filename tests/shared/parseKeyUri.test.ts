import { parseKeyUriAlgorithm } from "../../src/shared/parseKeyUriAlgorithm";
import { parseKeyUriDigits } from "../../src/shared/parseKeyUriDigits";
import { parseKeyUriLabel } from "../../src/shared/parseKeyUriLabel";

describe("parseKeyUriAlgorithm", () => {
  test("defaults to sha1 when omitted", () => {
    expect(parseKeyUriAlgorithm()).toBe("sha1");
    expect(parseKeyUriAlgorithm(null)).toBe("sha1");
    expect(parseKeyUriAlgorithm("")).toBe("sha1");
  });

  test("maps URI algorithm names to Algorithm", () => {
    expect(parseKeyUriAlgorithm("SHA1")).toBe("sha1");
    expect(parseKeyUriAlgorithm("sha256")).toBe("sha256");
    expect(parseKeyUriAlgorithm("SHA512")).toBe("sha512");
    expect(parseKeyUriAlgorithm("SHA3-256")).toBe("sha3-256");
  });

  test("throws on unsupported algorithm", () => {
    expect(() => parseKeyUriAlgorithm("MD5")).toThrow(/Unsupported algorithm/);
  });
});

describe("parseKeyUriLabel", () => {
  test("parses account only", () => {
    expect(parseKeyUriLabel("/user%40example.com")).toEqual({
      account: "user@example.com",
      issuer: undefined,
    });
  });

  test("parses issuer:account from label", () => {
    expect(parseKeyUriLabel("/MyApp:user%40example.com")).toEqual({
      account: "user@example.com",
      issuer: "MyApp",
    });
  });

  test("throws when issuer param and label prefix differ", () => {
    expect(() =>
      parseKeyUriLabel("/LabelIssuer:user@example.com", "QueryIssuer"),
    ).toThrow(/must be equal/);
  });

  test("accepts matching issuer param and label prefix", () => {
    expect(parseKeyUriLabel("/Example:alice@google.com", "Example")).toEqual({
      account: "alice@google.com",
      issuer: "Example",
    });
  });

  test("trims optional spaces before account name", () => {
    expect(parseKeyUriLabel("/ACME%20Co:%20john.doe@email.com")).toEqual({
      account: "john.doe@email.com",
      issuer: "ACME Co",
    });
  });

  test("uses issuer query param when label has no prefix", () => {
    expect(parseKeyUriLabel("/user@example.com", "MyApp")).toEqual({
      account: "user@example.com",
      issuer: "MyApp",
    });
  });
});

describe("parseKeyUriDigits", () => {
  test("defaults to 6 when omitted", () => {
    expect(parseKeyUriDigits(null)).toBe(6);
  });

  test("accepts 6 and 8", () => {
    expect(parseKeyUriDigits("6")).toBe(6);
    expect(parseKeyUriDigits("8")).toBe(8);
  });

  test("throws on invalid digits", () => {
    expect(() => parseKeyUriDigits("7")).toThrow(/Must be 6 or 8/);
  });
});
