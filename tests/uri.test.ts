import { URI, Secret, TOTP, HOTP } from "../src";
import { secret as totpSecret, duration } from "./data/rfc6238";
import { secret as hotpSecret } from "./data/rfc4226";

describe("URI.parse", () => {
  test("throws on invalid URI", () => {
    expect(() => URI.parse("not-a-uri")).toThrow(/Invalid key URI/);
  });

  test("throws on unsupported protocol", () => {
    expect(() => URI.parse("https://example.com/totp/foo?secret=ABCD")).toThrow(
      /Unsupported URI protocol/,
    );
  });

  test("throws on unsupported type", () => {
    expect(() =>
      URI.parse("otpauth://steam/Steam:user?secret=ABCD"),
    ).toThrow(/Unsupported key URI type/);
  });

  test("throws when secret is missing", () => {
    expect(() => URI.parse("otpauth://totp/user@example.com")).toThrow(
      /missing required parameter: secret/,
    );
  });

  test("throws on invalid base32 secret", () => {
    expect(() =>
      URI.parse("otpauth://totp/user?secret=!!!!"),
    ).toThrow(/Invalid base32/);
  });

  test("parses Key URI Format spec TOTP example", () => {
    const parsed = URI.parse(
      "otpauth://totp/Example:alice@google.com?secret=JBSWY3DPEHPK3PXP&issuer=Example",
    );
    expect(parsed.type).toBe("totp");
    if (parsed.type !== "totp") throw new Error("expected totp");
    expect(parsed.account).toBe("alice@google.com");
    expect(parsed.issuer).toBe("Example");
    expect(parsed.algorithm).toBe("sha1");
    expect(parsed.digits).toBe(6);
    expect(parsed.duration).toBe(30);
  });

  test("parses Key URI Format spec TOTP example with all parameters", () => {
    const parsed = URI.parse(
      "otpauth://totp/ACME%20Co:john.doe@email.com?secret=HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ&issuer=ACME%20Co&algorithm=SHA1&digits=6&period=30",
    );
    expect(parsed.type).toBe("totp");
    if (parsed.type !== "totp") throw new Error("expected totp");
    expect(parsed.account).toBe("john.doe@email.com");
    expect(parsed.issuer).toBe("ACME Co");
    expect(parsed.algorithm).toBe("sha1");
    expect(parsed.digits).toBe(6);
    expect(parsed.duration).toBe(30);
  });

  test("throws when HOTP counter is missing", () => {
    expect(() =>
      URI.parse("otpauth://hotp/user?secret=JBSWY3DPEHPK3PXP"),
    ).toThrow(/missing required parameter: counter/);
  });

  test("throws on invalid digits", () => {
    expect(() =>
      URI.parse(
        "otpauth://totp/user?secret=JBSWY3DPEHPK3PXP&digits=7",
      ),
    ).toThrow(/Must be 6 or 8/);
  });

  test("throws when issuer param and label prefix differ", () => {
    expect(() =>
      URI.parse(
        "otpauth://totp/IssuerA:user?secret=JBSWY3DPEHPK3PXP&issuer=IssuerB",
      ),
    ).toThrow(/must be equal/);
  });
});

describe("URI.format", () => {
  test("round-trips with URI.parse for TOTP", () => {
    const secret = Secret.from(totpSecret.sha1, "ascii");
    const parsed = {
      type: "totp" as const,
      secret,
      account: "user@example.com",
      algorithm: "sha1" as const,
      digits: 8,
      duration,
      issuer: "TestIssuer",
    };
    expect(URI.parse(URI.format(parsed))).toEqual(parsed);
  });

  test("round-trips with URI.parse for HOTP", () => {
    const secret = Secret.from(hotpSecret, "ascii");
    const parsed = {
      type: "hotp" as const,
      secret,
      account: "user@example.com",
      algorithm: "sha1" as const,
      digits: 6,
      counter: 4,
      issuer: "TestIssuer",
    };
    expect(URI.parse(URI.format(parsed))).toEqual(parsed);
  });

  test("matches toKeyUri output", () => {
    const secret = Secret.from(totpSecret.sha1, "ascii");
    const totp = new TOTP({
      secret,
      algorithm: "sha1",
      digits: 8,
      duration,
      issuer: "TestIssuer",
      account: "user@example.com",
    });
    const parsed = URI.parse(
      totp.toKeyUri({ account: "user@example.com", issuer: "TestIssuer" }),
    );
    expect(URI.format(parsed)).toBe(
      totp.toKeyUri({ account: "user@example.com", issuer: "TestIssuer" }),
    );
  });
});

describe("toKeyUri", () => {
  test("deprecated keyUri delegates to toKeyUri", () => {
    const secret = Secret.from(totpSecret.sha1, "ascii");
    const totp = new TOTP({ secret, account: "user@example.com" });
    expect(totp.keyUri()).toBe(totp.toKeyUri());
  });
});

describe("fromKeyUri", () => {
  describe("TOTP", () => {
    test("round-trips toKeyUri output", () => {
      const secret = Secret.from(totpSecret.sha1, "ascii");
      const totp = new TOTP({
        secret,
        algorithm: "sha1",
        digits: 8,
        duration,
        issuer: "TestIssuer",
        account: "user@example.com",
      });
      const uri = totp.toKeyUri({
        account: "user@example.com",
        issuer: "TestIssuer",
      });
      const imported = TOTP.fromKeyUri(uri);
      const timestamp = 59 * 1000;

      expect(imported.secret).toEqual(secret);
      expect(imported.account).toBe("user@example.com");
      expect(imported.issuer).toBe("TestIssuer");
      expect(imported.generate({ timestamp })).toBe(
        totp.generate({ timestamp }),
      );
    });

    test("generate and validate without passing secret", () => {
      const secret = Secret.from(totpSecret.sha1, "ascii");
      const totp = new TOTP({ secret, digits: 8, duration });
      const uri = totp.toKeyUri({ account: "user@example.com" });
      const imported = TOTP.fromKeyUri(uri);
      const timestamp = 59 * 1000;
      const token = imported.generate({ timestamp });

      expect(imported.validate({ token, timestamp })).toBe(true);
    });

    test("throws when URI is HOTP", () => {
      const hotp = new HOTP({ secret: Secret.from(hotpSecret, "ascii") });
      const uri = hotp.toKeyUri({ account: "user@example.com" });
      expect(() => TOTP.fromKeyUri(uri)).toThrow(/Expected TOTP key URI/);
    });
  });

  describe("HOTP", () => {
    test("round-trips toKeyUri output", () => {
      const secret = Secret.from(hotpSecret, "ascii");
      const hotp = new HOTP({
        secret,
        counter: 4,
        issuer: "TestIssuer",
        account: "user@example.com",
      });
      const uri = hotp.toKeyUri({
        account: "user@example.com",
        issuer: "TestIssuer",
      });
      const imported = HOTP.fromKeyUri(uri);

      expect(imported.secret).toEqual(secret);
      expect(imported.account).toBe("user@example.com");
      expect(imported.issuer).toBe("TestIssuer");
      expect(imported.counter).toBe(4);
      expect(imported.generate({ counter: 4 })).toBe(hotp.generate({ counter: 4 }));
    });

    test("throws when URI is TOTP", () => {
      const totp = new TOTP({ secret: Secret.from(totpSecret.sha1, "ascii") });
      const uri = totp.toKeyUri({ account: "user@example.com" });
      expect(() => HOTP.fromKeyUri(uri)).toThrow(/Expected HOTP key URI/);
    });
  });
});
