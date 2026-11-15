import { HOTP, Secret } from "../src";
import { data, secret } from "./data/rfc4226";

describe("HOTP with RFC #4226 input/output data sets ", () => {
  test.each(data)(
    "HOTP - It expects token: $hotp and HMAC-SHA-1(counter, secret): 0x$hmacSha1Result for counter: $counter",
    async ({ counter, hotp: expected }) => {
      const hotp = await new HOTP().generate({
        secret: Secret.from(secret, "ascii"),
        counter: counter,
      });
      expect(hotp).toBe(expected);
    },
  );
});

describe("instance secret", () => {
  test("new HOTP() has no instance secret", () => {
    const hotp = new HOTP();
    expect(hotp.secret).toBeUndefined();
  });

  test("generate() rejects when no instance secret and no arg", async () => {
    const hotp = new HOTP();
    await expect(hotp.generate()).rejects.toThrow(/Secret is required/);
  });

  test("generateSecret: true creates an instance secret", async () => {
    const hotp = new HOTP({ generateSecret: true });
    expect(hotp.secret).toBeInstanceOf(Secret);
    await expect(hotp.generate()).resolves.toEqual(expect.any(String));
  });

  test("HOTP.create() creates an instance secret", async () => {
    const hotp = HOTP.create();
    expect(hotp.secret).toBeInstanceOf(Secret);
    await expect(hotp.generate()).resolves.toEqual(expect.any(String));
  });

  test("bound instance generates RFC token without passing secret", async () => {
    const secretKey = Secret.from(secret, "ascii");
    const hotp = new HOTP({ secret: secretKey });
    const { counter, hotp: expected } = data[0];
    expect(await hotp.generate({ counter })).toBe(expected);
  });

  test("accepts a base32 string secret in the constructor", async () => {
    const base32 = Secret.from(secret, "ascii").toString();
    const hotp = new HOTP({ secret: base32 });
    const { counter, hotp: expected } = data[0];
    expect(hotp.secret!.toString()).toBe(base32);
    expect(await hotp.generate({ counter })).toBe(expected);
  });

  test("accepts a base32 string secret per call", async () => {
    const base32 = Secret.from(secret, "ascii").toString();
    const hotp = new HOTP();
    const { counter, hotp: token } = data[0];
    expect(await hotp.generate({ secret: base32, counter })).toBe(token);
    expect(await hotp.validate({ token, secret: base32, counter })).toBe(true);
  });
});

describe("empty secret", () => {
  const secretKey = Secret.from(secret, "ascii");
  const { counter, hotp: token } = data[0];
  const bound = () => new HOTP({ secret: secretKey });

  test("the constructor rejects an empty string secret", () => {
    expect(() => new HOTP({ secret: "" })).toThrow(/Secret must not be empty/);
  });

  test("an empty string secret is not replaced by a generated one", () => {
    expect(() => new HOTP({ secret: "", generateSecret: true })).toThrow(
      /Secret must not be empty/,
    );
    expect(() => HOTP.create({ secret: "" })).toThrow(
      /Secret must not be empty/,
    );
  });

  test.each<[string, (hotp: HOTP) => unknown]>([
    ["generate", (hotp) => hotp.generate({ secret: "", counter })],
    ["validate", (hotp) => hotp.validate({ secret: "", token, counter })],
    ["compare", (hotp) => hotp.compare({ secret: "", token, counter })],
    ["equals", (hotp) => hotp.equals({ secret: "", token, counter })],
    ["toKeyUri", async (hotp) => hotp.toKeyUri({ secret: "" })],
  ])(
    "%s rejects an empty string secret instead of using the instance secret",
    async (_name, call) => {
      await expect(call(bound())).rejects.toThrow(/Secret must not be empty/);
    },
  );

  test.each([undefined, null])(
    "a %p secret per call still uses the instance secret",
    async (omitted) => {
      const hotp = bound();
      expect(
        await hotp.validate({ secret: omitted as undefined, token, counter }),
      ).toBe(true);
    },
  );
});

describe("validate", () => {
  test("returns true for a matching token and false otherwise", async () => {
    const secretKey = Secret.from(secret, "ascii");
    const hotp = new HOTP({ secret: secretKey, counter: 0 });
    const token = await hotp.generate({ counter: 0 });
    expect(await hotp.validate({ token, counter: 0 })).toBe(true);
    expect(await hotp.validate({ token: "000000", counter: 0 })).toBe(false);
  });
});

describe("compare", () => {
  test("returns a negative delta when the token matches a past counter", async () => {
    const secretKey = Secret.from(secret, "ascii");
    const hotp = new HOTP({ window: { backward: 2, forward: 0 } });
    const token = await hotp.generate({ secret: secretKey, counter: 5 });
    expect(await hotp.compare({ token, secret: secretKey, counter: 7 })).toBe(
      -2,
    );
  });
});

describe("window", () => {
  const secretKey = Secret.from(secret, "ascii");
  const tokenFor = (counter: number) =>
    new HOTP().generate({ secret: secretKey, counter });

  test("default window looks one counter ahead and never backward", async () => {
    const hotp = new HOTP({ secret: secretKey });
    expect(await hotp.compare({ token: await tokenFor(5), counter: 5 })).toBe(
      0,
    );
    expect(await hotp.compare({ token: await tokenFor(6), counter: 5 })).toBe(
      1,
    );
    expect(await hotp.compare({ token: await tokenFor(7), counter: 5 })).toBe(
      null,
    );
    expect(await hotp.compare({ token: await tokenFor(4), counter: 5 })).toBe(
      null,
    );
  });

  test("rejects a used token once the counter has advanced", async () => {
    const hotp = new HOTP({ secret: secretKey });
    const token = await tokenFor(5);
    expect(await hotp.validate({ token, counter: 5 })).toBe(true);
    expect(await hotp.validate({ token, counter: 6 })).toBe(false);
  });

  test("a numeric window is forward only", async () => {
    const hotp = new HOTP({ secret: secretKey, window: 2 });
    expect(await hotp.compare({ token: await tokenFor(7), counter: 5 })).toBe(
      2,
    );
    expect(await hotp.compare({ token: await tokenFor(8), counter: 5 })).toBe(
      null,
    );
    expect(await hotp.compare({ token: await tokenFor(4), counter: 5 })).toBe(
      null,
    );
    expect(await hotp.validate({ token: await tokenFor(3), counter: 5 })).toBe(
      false,
    );
  });

  test("a window of 0 accepts only the exact counter", async () => {
    const hotp = new HOTP({ secret: secretKey, window: 0 });
    expect(await hotp.validate({ token: await tokenFor(5), counter: 5 })).toBe(
      true,
    );
    expect(await hotp.validate({ token: await tokenFor(6), counter: 5 })).toBe(
      false,
    );
  });

  test("a null window accepts only the exact counter", async () => {
    const window = null as unknown as number;
    const hotp = new HOTP({ secret: secretKey, window });
    expect(await hotp.validate({ token: await tokenFor(5), counter: 5 })).toBe(
      true,
    );
    expect(await hotp.validate({ token: await tokenFor(6), counter: 5 })).toBe(
      false,
    );
    expect(
      await new HOTP({ secret: secretKey }).compare({
        token: await tokenFor(6),
        counter: 5,
        window,
      }),
    ).toBe(null);
  });

  test("backward and forward limits are independent", async () => {
    const hotp = new HOTP({
      secret: secretKey,
      window: { backward: 1, forward: 3 },
    });
    expect(await hotp.compare({ token: await tokenFor(4), counter: 5 })).toBe(
      -1,
    );
    expect(await hotp.compare({ token: await tokenFor(3), counter: 5 })).toBe(
      null,
    );
    expect(await hotp.compare({ token: await tokenFor(8), counter: 5 })).toBe(
      3,
    );
    expect(await hotp.compare({ token: await tokenFor(9), counter: 5 })).toBe(
      null,
    );
  });

  test("per-call window overrides the instance window", async () => {
    const hotp = new HOTP({ secret: secretKey, window: 0 });
    expect(
      await hotp.compare({ token: await tokenFor(7), counter: 5, window: 2 }),
    ).toBe(2);
    expect(
      await hotp.validate({
        token: await tokenFor(4),
        counter: 5,
        window: { backward: 1, forward: 0 },
      }),
    ).toBe(true);
  });

  test("accepts a window at the cap of 100 counters", async () => {
    const hotp = new HOTP({ secret: secretKey, window: 100 });
    expect(await hotp.compare({ token: await tokenFor(105), counter: 5 })).toBe(
      100,
    );
    expect(await hotp.compare({ token: await tokenFor(106), counter: 5 })).toBe(
      null,
    );
  });

  test.each([NaN, Infinity, -1, 1.5, 101, "1"])(
    "the constructor rejects a window of %p",
    (window) => {
      expect(() => new HOTP({ window: window as number })).toThrow(
        /Invalid window: .* Must be an integer from 0 to 100/,
      );
      expect(() => HOTP.create({ window: window as number })).toThrow(
        /Invalid window: /,
      );
    },
  );

  test("the constructor rejects an invalid backward or forward size", () => {
    expect(() => new HOTP({ window: { backward: -1, forward: 1 } })).toThrow(
      /Invalid window\.backward: -1/,
    );
    expect(() => new HOTP({ window: { backward: 1, forward: 101 } })).toThrow(
      /Invalid window\.forward: 101/,
    );
  });

  test.each<[string, (hotp: HOTP, window?: number) => Promise<unknown>]>([
    ["validate", (hotp, window) => hotp.validate({ token: "0", window })],
    ["compare", (hotp, window) => hotp.compare({ token: "0", window })],
  ])("%s rejects an invalid window", async (_name, call) => {
    const hotp = new HOTP({ secret: secretKey });
    // Per call.
    await expect(call(hotp, 101)).rejects.toThrow(/Invalid window: 101/);
    await expect(call(hotp, NaN)).rejects.toThrow(/Invalid window: NaN/);
    // Set on the instance after construction.
    hotp.window = 5000;
    await expect(call(hotp)).rejects.toThrow(/Invalid window: 5000/);
  });
});

describe("digits", () => {
  const secretKey = Secret.from(secret, "ascii");

  test("generates tokens of any positive length", async () => {
    const hotp = new HOTP({ secret: secretKey });
    // RFC 4226 Appendix D: counter 0 truncates to the decimal 1284755224.
    expect(await hotp.generate({ counter: 0, digits: 1 })).toBe("4");
    expect(await hotp.generate({ counter: 0, digits: 10 })).toBe("1284755224");
    // Counter 7 truncates to 82162583, which is zero-padded to 10 digits.
    expect(await hotp.generate({ counter: 7, digits: 10 })).toBe("0082162583");
    // There is no upper limit: digits beyond the 10th are leading zeros.
    expect(await hotp.generate({ counter: 0, digits: 12 })).toBe(
      "001284755224",
    );
  });

  test("validates tokens of the configured length", async () => {
    const oneDigit = new HOTP({ secret: secretKey, digits: 1 });
    expect(await oneDigit.validate({ token: "4", counter: 0 })).toBe(true);
    const tenDigits = new HOTP({ secret: secretKey, digits: 10 });
    expect(await tenDigits.validate({ token: "1284755224", counter: 0 })).toBe(
      true,
    );
    const twelveDigits = new HOTP({ secret: secretKey, digits: 12 });
    expect(
      await twelveDigits.validate({ token: "001284755224", counter: 0 }),
    ).toBe(true);
  });

  test.each([0, -1, 6.5, NaN, Infinity, "6"])(
    "the constructor rejects digits of %p",
    (digits) => {
      expect(() => new HOTP({ digits: digits as number })).toThrow(
        /Invalid digits: .* Must be a positive integer/,
      );
      expect(() => HOTP.create({ digits: digits as number })).toThrow(
        /Invalid digits: /,
      );
    },
  );

  // A malformed token must not hide invalid digits behind a `false` result.
  const token = "not a token";
  test.each<[string, (hotp: HOTP, digits?: number) => Promise<unknown>]>([
    ["generate", (hotp, digits) => hotp.generate({ counter: 0, digits })],
    ["validate", (hotp, digits) => hotp.validate({ token, digits })],
    ["compare", (hotp, digits) => hotp.compare({ token, digits })],
    ["equals", (hotp, digits) => hotp.equals({ token, digits })],
  ])("%s rejects invalid digits", async (_name, call) => {
    const hotp = new HOTP({ secret: secretKey });
    // Per call.
    await expect(call(hotp, 0)).rejects.toThrow(/Invalid digits: 0/);
    await expect(call(hotp, 6.5)).rejects.toThrow(/Invalid digits: 6\.5/);
    // Set on the instance after construction.
    hotp.digits = -1;
    await expect(call(hotp)).rejects.toThrow(/Invalid digits: -1/);
  });
});

describe("token format", () => {
  const secretKey = Secret.from(secret, "ascii");
  const hotp = new HOTP({ secret: secretKey });

  // "755224" is the RFC 4226 token for counter 0.
  test.each<[string, unknown]>([
    ["with a space", "755 224"],
    ["with a dash", "755-224"],
    ["with a trailing newline", "755224\n"],
    ["with a letter", "75522A"],
    ["cut short", "75522"],
    ["with an extra digit", "7552240"],
    ["passed as a number", 755224],
    ["that is empty", ""],
    ["that is undefined", undefined],
    ["that is null", null],
  ])("a token %s is never valid", async (_name, malformed) => {
    const token = malformed as string;
    expect(await hotp.validate({ token, counter: 0 })).toBe(false);
    expect(await hotp.compare({ token, counter: 0 })).toBe(null);
    expect(await hotp.equals({ token, counter: 0 })).toBe(false);
  });

  test("a token must be exactly as long as digits", async () => {
    // For counter 0 the 6-digit token is "755224" and the 8-digit "84755224".
    expect(await hotp.validate({ token: "755224", counter: 0 })).toBe(true);
    expect(await hotp.validate({ token: "84755224", counter: 0 })).toBe(false);
    expect(
      await hotp.validate({ token: "84755224", counter: 0, digits: 8 }),
    ).toBe(true);
    expect(
      await hotp.validate({ token: "755224", counter: 0, digits: 8 }),
    ).toBe(false);
  });

  test("a malformed token is rejected without computing any HMAC", async () => {
    const sign = jest.spyOn(globalThis.crypto.subtle, "sign");
    try {
      expect(
        await hotp.validate({ token: "755 224", counter: 0, window: 100 }),
      ).toBe(false);
      expect(sign).not.toHaveBeenCalled();
      // A well-formed wrong token does search the window.
      expect(
        await hotp.validate({ token: "000000", counter: 0, window: 2 }),
      ).toBe(false);
      expect(sign).toHaveBeenCalledTimes(3);
    } finally {
      sign.mockRestore();
    }
  });
});

describe("toKeyUri", () => {
  test("deprecated keyUri delegates to toKeyUri", () => {
    const secretKey = Secret.from(secret, "ascii");
    const hotp = new HOTP({ secret: secretKey, account: "user@example.com" });
    expect(hotp.keyUri()).toBe(hotp.toKeyUri());
  });
});
