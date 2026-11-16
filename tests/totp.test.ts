import { TOTP, Secret } from "../src/";
import { data, secret, duration } from "./data/rfc6238";
import { randomNum } from "./util";

describe("RFC #6238 Test Vectors", () => {
  test.each(data)(
    "TOTP - should generate token: $totp for UTC: $utc",
    async ({ timestamp, mode, totp: token }) => {
      const generatedToken = await new TOTP({
        algorithm: mode,
        digits: 8,
      }).generate({
        secret: Secret.from(secret[mode], "ascii"),
        timestamp: timestamp * 1000,
        duration,
      });
      expect(generatedToken).toEqual(token);
    },
  );

  test.each(data)(
    "TOTP - should find and validate token in a random search window within which the token is generated",
    async ({ timestamp, mode }) => {
      const window = 10;
      const rnd = randomNum(-window, window);
      const totp = new TOTP({
        algorithm: mode,
        digits: 8,
        duration,
        window,
      });

      let inWindow = duration * rnd;
      if (inWindow <= -timestamp) inWindow = 0;

      const token = await totp.generate({
        secret: Secret.from(secret[mode], "ascii"),
        timestamp: (timestamp + inWindow) * 1000,
      });

      const delta = await totp.compare({
        token: token,
        secret: Secret.from(secret[mode], "ascii"),
        timestamp: timestamp * 1000,
      });
      expect(delta).toStrictEqual(inWindow / duration);
    },
  );
});

describe("instance secret", () => {
  test("new TOTP() has no instance secret", () => {
    const totp = new TOTP();
    expect(totp.secret).toBeUndefined();
  });

  test("generate() rejects when no instance secret and no arg", async () => {
    const totp = new TOTP();
    await expect(totp.generate()).rejects.toThrow(/Secret is required/);
  });

  test("generateSecret: true creates an instance secret", async () => {
    const totp = new TOTP({ generateSecret: true });
    expect(totp.secret).toBeInstanceOf(Secret);
    await expect(totp.generate()).resolves.toEqual(expect.any(String));
  });

  test("TOTP.create() creates an instance secret", async () => {
    const totp = TOTP.create();
    expect(totp.secret).toBeInstanceOf(Secret);
    await expect(totp.generate()).resolves.toEqual(expect.any(String));
  });

  test("explicit secret takes precedence over generateSecret", () => {
    const secretKey = Secret.from("test", "ascii");
    const totp = new TOTP({ secret: secretKey, generateSecret: true });
    expect(totp.secret).toBe(secretKey);
  });

  test("method secret overrides instance secret", async () => {
    const totp = new TOTP({ generateSecret: true });
    const { timestamp, mode, totp: expected } = data[0];
    const other = Secret.from(secret[mode], "ascii");
    const token = await totp.generate({
      secret: other,
      timestamp: timestamp * 1000,
      algorithm: mode,
      digits: 8,
      duration,
    });
    expect(token).toBe(expected);
  });

  test("bound instance validates without passing secret", async () => {
    const secretKey = Secret.from(secret.sha1, "ascii");
    const totp = new TOTP({ secret: secretKey, digits: 8, duration });
    const { timestamp, totp: token } = data[0];
    expect(await totp.validate({ token, timestamp: timestamp * 1000 })).toBe(
      true,
    );
  });

  test("accepts a base32 string secret in the constructor", async () => {
    const base32 = Secret.from(secret.sha1, "ascii").toString();
    const totp = new TOTP({ secret: base32, digits: 8, duration });
    const { timestamp, totp: token } = data[0];
    expect(totp.secret!.toString()).toBe(base32);
    expect(await totp.validate({ token, timestamp: timestamp * 1000 })).toBe(
      true,
    );
  });

  test("accepts a base32 string secret per call", async () => {
    const base32 = Secret.from(secret.sha1, "ascii").toString();
    const totp = new TOTP({ digits: 8, duration });
    const { timestamp, totp: token } = data[0];
    expect(
      await totp.generate({ secret: base32, timestamp: timestamp * 1000 }),
    ).toBe(token);
    expect(
      await totp.verify({ token, secret: base32, timestamp: timestamp * 1000 }),
    ).toMatchObject({ valid: true });
  });

  test("rejects an invalid base32 string secret", () => {
    expect(() => new TOTP({ secret: "not a secret!" })).toThrow(
      /Invalid base32 character/,
    );
  });
});

describe("empty secret", () => {
  const secretKey = Secret.from(secret.sha1, "ascii");
  const { timestamp: seconds, totp: token } = data[0];
  const timestamp = seconds * 1000;
  const bound = () => new TOTP({ secret: secretKey, digits: 8, duration });

  test("the constructor rejects an empty string secret", () => {
    expect(() => new TOTP({ secret: "" })).toThrow(/Secret must not be empty/);
  });

  test("an empty string secret is not replaced by a generated one", () => {
    expect(() => new TOTP({ secret: "", generateSecret: true })).toThrow(
      /Secret must not be empty/,
    );
    expect(() => TOTP.create({ secret: "" })).toThrow(
      /Secret must not be empty/,
    );
  });

  test.each<[string, (totp: TOTP) => unknown]>([
    ["generate", (totp) => totp.generate({ secret: "", timestamp })],
    ["validate", (totp) => totp.validate({ secret: "", token, timestamp })],
    ["verify", (totp) => totp.verify({ secret: "", token, timestamp })],
    ["compare", (totp) => totp.compare({ secret: "", token, timestamp })],
    ["equals", (totp) => totp.equals({ secret: "", token, timestamp })],
    ["toKeyUri", async (totp) => totp.toKeyUri({ secret: "" })],
  ])(
    "%s rejects an empty string secret instead of using the instance secret",
    async (_name, call) => {
      await expect(call(bound())).rejects.toThrow(/Secret must not be empty/);
    },
  );

  test.each([undefined, null])(
    "a %p secret per call still uses the instance secret",
    async (omitted) => {
      const totp = bound();
      expect(
        await totp.validate({ secret: omitted as undefined, token, timestamp }),
      ).toBe(true);
    },
  );
});

describe("window", () => {
  const secretKey = Secret.from(secret.sha1, "ascii");
  // Milliseconds at the start of the given time step.
  const at = (timeStep: number) => timeStep * duration * 1000;
  const tokenFor = (timeStep: number) =>
    new TOTP({ digits: 8, duration }).generate({
      secret: secretKey,
      timestamp: at(timeStep),
    });

  test("default window accepts one time step in each direction", async () => {
    const totp = new TOTP({ secret: secretKey, digits: 8, duration });
    const timestamp = at(100);
    expect(await totp.compare({ token: await tokenFor(99), timestamp })).toBe(
      -1,
    );
    expect(await totp.compare({ token: await tokenFor(101), timestamp })).toBe(
      1,
    );
    expect(await totp.compare({ token: await tokenFor(98), timestamp })).toBe(
      null,
    );
    expect(await totp.compare({ token: await tokenFor(102), timestamp })).toBe(
      null,
    );
  });

  test("a numeric window is symmetric", async () => {
    const totp = new TOTP({
      secret: secretKey,
      digits: 8,
      duration,
      window: 2,
    });
    const timestamp = at(100);
    expect(await totp.compare({ token: await tokenFor(98), timestamp })).toBe(
      -2,
    );
    expect(await totp.compare({ token: await tokenFor(102), timestamp })).toBe(
      2,
    );
    expect(await totp.validate({ token: await tokenFor(98), timestamp })).toBe(
      true,
    );
  });

  test("a null window accepts only the current time step", async () => {
    const window = null as unknown as number;
    const totp = new TOTP({ secret: secretKey, digits: 8, duration, window });
    const timestamp = at(100);
    expect(await totp.validate({ token: await tokenFor(100), timestamp })).toBe(
      true,
    );
    expect(await totp.validate({ token: await tokenFor(99), timestamp })).toBe(
      false,
    );
    expect(await totp.validate({ token: await tokenFor(101), timestamp })).toBe(
      false,
    );
  });

  test("backward-only window rejects tokens from future time steps", async () => {
    const totp = new TOTP({
      secret: secretKey,
      digits: 8,
      duration,
      window: { backward: 1, forward: 0 },
    });
    const timestamp = at(100);
    expect(await totp.validate({ token: await tokenFor(99), timestamp })).toBe(
      true,
    );
    expect(await totp.validate({ token: await tokenFor(101), timestamp })).toBe(
      false,
    );
  });

  test("forward-only window rejects tokens from past time steps", async () => {
    const totp = new TOTP({
      secret: secretKey,
      digits: 8,
      duration,
      window: { backward: 0, forward: 1 },
    });
    const timestamp = at(100);
    expect(await totp.validate({ token: await tokenFor(101), timestamp })).toBe(
      true,
    );
    expect(await totp.validate({ token: await tokenFor(99), timestamp })).toBe(
      false,
    );
  });

  test("backward and forward limits are independent", async () => {
    const totp = new TOTP({
      secret: secretKey,
      digits: 8,
      duration,
      window: { backward: 3, forward: 1 },
    });
    const timestamp = at(100);
    expect(await totp.compare({ token: await tokenFor(97), timestamp })).toBe(
      -3,
    );
    expect(await totp.compare({ token: await tokenFor(96), timestamp })).toBe(
      null,
    );
    expect(await totp.compare({ token: await tokenFor(101), timestamp })).toBe(
      1,
    );
    expect(await totp.compare({ token: await tokenFor(102), timestamp })).toBe(
      null,
    );
  });

  test("per-call window overrides the instance window", async () => {
    const totp = new TOTP({
      secret: secretKey,
      digits: 8,
      duration,
      window: 0,
    });
    const timestamp = at(100);
    expect(await totp.validate({ token: await tokenFor(99), timestamp })).toBe(
      false,
    );
    expect(
      await totp.compare({ token: await tokenFor(99), timestamp, window: 1 }),
    ).toBe(-1);
    expect(
      await totp.validate({
        token: await tokenFor(99),
        timestamp,
        window: { backward: 0, forward: 1 },
      }),
    ).toBe(false);
  });

  test("accepts a window at the cap of 100 time steps", async () => {
    const totp = new TOTP({
      secret: secretKey,
      digits: 8,
      duration,
      window: 100,
    });
    const timestamp = at(200);
    expect(await totp.compare({ token: await tokenFor(100), timestamp })).toBe(
      -100,
    );
    expect(await totp.compare({ token: await tokenFor(300), timestamp })).toBe(
      100,
    );
    expect(await totp.compare({ token: await tokenFor(301), timestamp })).toBe(
      null,
    );
  });

  test.each([NaN, Infinity, -1, 1.5, 101, "1"])(
    "the constructor rejects a window of %p",
    (window) => {
      expect(() => new TOTP({ window: window as number })).toThrow(
        /Invalid window: .* Must be an integer from 0 to 100/,
      );
      expect(() => TOTP.create({ window: window as number })).toThrow(
        /Invalid window: /,
      );
    },
  );

  test("the constructor rejects an invalid backward or forward size", () => {
    expect(() => new TOTP({ window: { backward: -1, forward: 1 } })).toThrow(
      /Invalid window\.backward: -1/,
    );
    expect(() => new TOTP({ window: { backward: 1, forward: 101 } })).toThrow(
      /Invalid window\.forward: 101/,
    );
  });

  test.each<[string, (totp: TOTP, window?: number) => Promise<unknown>]>([
    ["validate", (totp, window) => totp.validate({ token: "0", window })],
    ["verify", (totp, window) => totp.verify({ token: "0", window })],
    ["compare", (totp, window) => totp.compare({ token: "0", window })],
  ])("%s rejects an invalid window", async (_name, call) => {
    const totp = new TOTP({ secret: secretKey, digits: 8, duration });
    // Per call.
    await expect(call(totp, 101)).rejects.toThrow(/Invalid window: 101/);
    await expect(call(totp, NaN)).rejects.toThrow(/Invalid window: NaN/);
    // Set on the instance after construction.
    totp.window = 5000;
    await expect(call(totp)).rejects.toThrow(/Invalid window: 5000/);
  });
});

describe("verify", () => {
  const secretKey = Secret.from(secret.sha1, "ascii");
  const totp = new TOTP({ digits: 8, duration });
  // Milliseconds at `seconds` into the given time step.
  const at = (timeStep: number, seconds = 0) =>
    (timeStep * duration + seconds) * 1000;
  const tokenFor = (timeStep: number) =>
    totp.generate({ secret: secretKey, timestamp: at(timeStep) });

  test.each(data)(
    "reports the RFC time step for token: $totp ($mode)",
    async ({ timestamp, mode, steps, totp: token }) => {
      const result = await totp.verify({
        token,
        secret: Secret.from(secret[mode], "ascii"),
        timestamp: timestamp * 1000,
        algorithm: mode,
      });
      expect(result).toEqual({ valid: true, timeStep: steps, delta: 0 });
    },
  );

  test("reports the matched time step and delta within the window", async () => {
    const verifyAt100 = (token: string) =>
      totp.verify({ token, secret: secretKey, timestamp: at(100, 10) });

    expect(await verifyAt100(await tokenFor(100))).toEqual({
      valid: true,
      timeStep: 100,
      delta: 0,
    });
    expect(await verifyAt100(await tokenFor(99))).toEqual({
      valid: true,
      timeStep: 99,
      delta: -1,
    });
    expect(await verifyAt100(await tokenFor(101))).toEqual({
      valid: true,
      timeStep: 101,
      delta: 1,
    });
  });

  test("returns only { valid: false } for a wrong or out-of-window token", async () => {
    expect(
      await totp.verify({
        token: "00000000",
        secret: secretKey,
        timestamp: at(100),
      }),
    ).toEqual({ valid: false });
    expect(
      await totp.verify({
        token: await tokenFor(98),
        secret: secretKey,
        timestamp: at(100),
      }),
    ).toEqual({ valid: false });
  });

  test("rejects a token that was already used in the same time step", async () => {
    const token = await tokenFor(100);
    const first = await totp.verify({
      token,
      secret: secretKey,
      timestamp: at(100, 5),
    });
    expect(first).toEqual({ valid: true, timeStep: 100, delta: 0 });

    const replay = await totp.verify({
      token,
      secret: secretKey,
      timestamp: at(100, 15),
      afterTimeStep: 100,
    });
    expect(replay).toEqual({ valid: false });
  });

  test("rejects a used token replayed in the next time step, where the window still covers it", async () => {
    const token = await tokenFor(100);
    const fortySecondsLater = at(100, 5) + 40_000; // now in time step 101

    // Without afterTimeStep the window still accepts it.
    expect(
      await totp.verify({
        token,
        secret: secretKey,
        timestamp: fortySecondsLater,
      }),
    ).toEqual({ valid: true, timeStep: 100, delta: -1 });

    expect(
      await totp.verify({
        token,
        secret: secretKey,
        timestamp: fortySecondsLater,
        afterTimeStep: 100,
      }),
    ).toEqual({ valid: false });
  });

  test("rejects tokens from time steps before afterTimeStep", async () => {
    expect(
      await totp.verify({
        token: await tokenFor(99),
        secret: secretKey,
        timestamp: at(100),
        afterTimeStep: 100,
      }),
    ).toEqual({ valid: false });
  });

  test("accepts tokens from time steps after afterTimeStep", async () => {
    // A fresh token for the current step, after an earlier login in step 100.
    expect(
      await totp.verify({
        token: await tokenFor(101),
        secret: secretKey,
        timestamp: at(101),
        afterTimeStep: 100,
      }),
    ).toEqual({ valid: true, timeStep: 101, delta: 0 });
    // A token still inside the window whose step was never used.
    expect(
      await totp.verify({
        token: await tokenFor(100),
        secret: secretKey,
        timestamp: at(101),
        afterTimeStep: 99,
      }),
    ).toEqual({ valid: true, timeStep: 100, delta: -1 });
    // A token from a clock running one step ahead.
    expect(
      await totp.verify({
        token: await tokenFor(101),
        secret: secretKey,
        timestamp: at(100),
        afterTimeStep: 100,
      }),
    ).toEqual({ valid: true, timeStep: 101, delta: 1 });
  });

  test.each([undefined, null])(
    "does no replay filtering when afterTimeStep is %s",
    async (afterTimeStep) => {
      expect(
        await totp.verify({
          token: await tokenFor(99),
          secret: secretKey,
          timestamp: at(100),
          afterTimeStep,
        }),
      ).toEqual({ valid: true, timeStep: 99, delta: -1 });
    },
  );

  test.each([NaN, 100.5, Infinity, "100"])(
    "throws when afterTimeStep is not an integer: %p",
    async (afterTimeStep) => {
      await expect(
        totp.verify({
          token: await tokenFor(100),
          secret: secretKey,
          timestamp: at(100),
          afterTimeStep: afterTimeStep as number,
        }),
      ).rejects.toThrow(/afterTimeStep must be an integer/);
    },
  );

  test("honors per-call window and duration overrides", async () => {
    const token = await tokenFor(99);
    expect(
      await totp.verify({
        token,
        secret: secretKey,
        timestamp: at(100),
        window: 0,
      }),
    ).toEqual({ valid: false });
    expect(
      await totp.verify({
        token: await tokenFor(97),
        secret: secretKey,
        timestamp: at(100),
        window: 3,
      }),
    ).toEqual({ valid: true, timeStep: 97, delta: -3 });

    // With a 60s step, 6000s is time step 100.
    const sixtySecondToken = await totp.generate({
      secret: secretKey,
      timestamp: 6_000_000,
      duration: 60,
    });
    expect(
      await totp.verify({
        token: sixtySecondToken,
        secret: secretKey,
        timestamp: 6_000_000,
        duration: 60,
      }),
    ).toEqual({ valid: true, timeStep: 100, delta: 0 });
  });

  test("honors separate backward and forward limits", async () => {
    const verifyAt100 = async (
      timeStep: number,
      window: { backward: number; forward: number },
    ) =>
      totp.verify({
        token: await tokenFor(timeStep),
        secret: secretKey,
        timestamp: at(100),
        window,
      });

    const backwardOnly = { backward: 1, forward: 0 };
    expect(await verifyAt100(100, backwardOnly)).toEqual({
      valid: true,
      timeStep: 100,
      delta: 0,
    });
    expect(await verifyAt100(99, backwardOnly)).toEqual({
      valid: true,
      timeStep: 99,
      delta: -1,
    });
    expect(await verifyAt100(101, backwardOnly)).toEqual({ valid: false });

    const forwardOnly = { backward: 0, forward: 1 };
    expect(await verifyAt100(101, forwardOnly)).toEqual({
      valid: true,
      timeStep: 101,
      delta: 1,
    });
    expect(await verifyAt100(99, forwardOnly)).toEqual({ valid: false });

    const uneven = { backward: 2, forward: 1 };
    expect(await verifyAt100(98, uneven)).toEqual({
      valid: true,
      timeStep: 98,
      delta: -2,
    });
    expect(await verifyAt100(97, uneven)).toEqual({ valid: false });
    expect(await verifyAt100(102, uneven)).toEqual({ valid: false });
  });

  test("applies afterTimeStep inside a backward/forward window", async () => {
    const window = { backward: 2, forward: 0 };
    expect(
      await totp.verify({
        token: await tokenFor(100),
        secret: secretKey,
        timestamp: at(102),
        window,
        afterTimeStep: 100,
      }),
    ).toEqual({ valid: false });
    expect(
      await totp.verify({
        token: await tokenFor(101),
        secret: secretKey,
        timestamp: at(102),
        window,
        afterTimeStep: 100,
      }),
    ).toEqual({ valid: true, timeStep: 101, delta: -1 });
  });

  test("uses the instance window when it is an object", async () => {
    const backwardOnly = new TOTP({
      secret: secretKey,
      digits: 8,
      duration,
      window: { backward: 1, forward: 0 },
    });
    expect(
      await backwardOnly.verify({
        token: await tokenFor(99),
        timestamp: at(100),
      }),
    ).toEqual({ valid: true, timeStep: 99, delta: -1 });
    expect(
      await backwardOnly.verify({
        token: await tokenFor(101),
        timestamp: at(100),
      }),
    ).toEqual({ valid: false });
  });

  test("a null window accepts only the current time step", async () => {
    const window = null as unknown as number;
    expect(
      await totp.verify({
        token: await tokenFor(100),
        secret: secretKey,
        timestamp: at(100),
        window,
      }),
    ).toEqual({ valid: true, timeStep: 100, delta: 0 });
    expect(
      await totp.verify({
        token: await tokenFor(99),
        secret: secretKey,
        timestamp: at(100),
        window,
      }),
    ).toEqual({ valid: false });
  });

  test("bound instance verifies without passing secret", async () => {
    const bound = new TOTP({ secret: secretKey, digits: 8, duration });
    const { timestamp, steps, totp: token } = data[0];
    expect(await bound.verify({ token, timestamp: timestamp * 1000 })).toEqual({
      valid: true,
      timeStep: steps,
      delta: 0,
    });
  });

  test("rejects when no instance secret and no arg", async () => {
    await expect(new TOTP().verify({ token: "000000" })).rejects.toThrow(
      /Secret is required/,
    );
  });

  test("does not change what validate() and compare() accept", async () => {
    const token = await tokenFor(100);
    const timestamp = at(101);
    expect(await totp.validate({ token, secret: secretKey, timestamp })).toBe(
      true,
    );
    expect(await totp.compare({ token, secret: secretKey, timestamp })).toBe(
      -1,
    );
  });
});

describe("digits", () => {
  const secretKey = Secret.from(secret.sha1, "ascii");
  // RFC 6238: at 59s the SHA-1 token is "94287082", cut from the truncated
  // decimal 1094287082 (the RFC 4226 value for counter 1).
  const timestamp = 59_000;

  test("generates tokens of any positive length", async () => {
    const totp = new TOTP({ secret: secretKey, duration });
    expect(await totp.generate({ timestamp, digits: 1 })).toBe("2");
    expect(await totp.generate({ timestamp, digits: 6 })).toBe("287082");
    expect(await totp.generate({ timestamp, digits: 10 })).toBe("1094287082");
    // There is no upper limit: digits beyond the 10th are leading zeros.
    expect(await totp.generate({ timestamp, digits: 12 })).toBe("001094287082");
  });

  test("validates tokens of the configured length", async () => {
    const oneDigit = new TOTP({ secret: secretKey, duration, digits: 1 });
    expect(await oneDigit.validate({ token: "2", timestamp })).toBe(true);
    const tenDigits = new TOTP({ secret: secretKey, duration, digits: 10 });
    expect(await tenDigits.validate({ token: "1094287082", timestamp })).toBe(
      true,
    );
    const twelveDigits = new TOTP({ secret: secretKey, duration, digits: 12 });
    expect(
      await twelveDigits.validate({ token: "001094287082", timestamp }),
    ).toBe(true);
  });

  test.each([0, -1, 6.5, NaN, Infinity, "6"])(
    "the constructor rejects digits of %p",
    (digits) => {
      expect(() => new TOTP({ digits: digits as number })).toThrow(
        /Invalid digits: .* Must be a positive integer/,
      );
      expect(() => TOTP.create({ digits: digits as number })).toThrow(
        /Invalid digits: /,
      );
    },
  );

  // A malformed token must not hide invalid digits behind a `false` result.
  const token = "not a token";
  test.each<[string, (totp: TOTP, digits?: number) => Promise<unknown>]>([
    ["generate", (totp, digits) => totp.generate({ timestamp, digits })],
    ["validate", (totp, digits) => totp.validate({ token, digits })],
    ["verify", (totp, digits) => totp.verify({ token, digits })],
    ["compare", (totp, digits) => totp.compare({ token, digits })],
    ["equals", (totp, digits) => totp.equals({ token, digits })],
  ])("%s rejects invalid digits", async (_name, call) => {
    const totp = new TOTP({ secret: secretKey, duration });
    // Per call.
    await expect(call(totp, 0)).rejects.toThrow(/Invalid digits: 0/);
    await expect(call(totp, 6.5)).rejects.toThrow(/Invalid digits: 6\.5/);
    // Set on the instance after construction.
    totp.digits = -1;
    await expect(call(totp)).rejects.toThrow(/Invalid digits: -1/);
  });

  test("verify rejects invalid digits when afterTimeStep excludes every step", async () => {
    const totp = new TOTP({ secret: secretKey, duration });
    await expect(
      totp.verify({ token, timestamp, digits: 0, afterTimeStep: 1000 }),
    ).rejects.toThrow(/Invalid digits: 0/);
  });
});

describe("token format", () => {
  const secretKey = Secret.from(secret.sha1, "ascii");
  const totp = new TOTP({ secret: secretKey, digits: 8, duration });
  // RFC 6238: at 59s the 8-digit SHA-1 token is "94287082".
  const timestamp = 59_000;

  test.each<[string, string | number]>([
    ["with a space", "9428 7082"],
    ["with a dash", "9428-7082"],
    ["with a trailing newline", "94287082\n"],
    ["passed as a number", 94287082],
  ])("accepts a token %s", async (_name, token) => {
    expect(await totp.validate({ token, timestamp })).toBe(true);
    expect(await totp.verify({ token, timestamp })).toMatchObject({
      valid: true,
    });
    expect(await totp.compare({ token, timestamp })).toBe(0);
    expect(await totp.equals({ token, timestamp })).toBe(true);
  });

  test.each<[string, unknown]>([
    ["with a letter", "9428708A"],
    ["cut short", "9428708"],
    ["with an extra digit", "942870820"],
    ["that is empty", ""],
    ["that is undefined", undefined],
    ["that is null", null],
  ])("a token %s is never valid", async (_name, malformed) => {
    const token = malformed as string;
    expect(await totp.validate({ token, timestamp })).toBe(false);
    expect(await totp.verify({ token, timestamp })).toEqual({ valid: false });
    expect(await totp.compare({ token, timestamp })).toBe(null);
    expect(await totp.equals({ token, timestamp })).toBe(false);
  });

  test("a token must be exactly as long as digits", async () => {
    expect(await totp.validate({ token: "94287082", timestamp })).toBe(true);
    expect(await totp.validate({ token: "287082", timestamp })).toBe(false);
    expect(await totp.validate({ token: "287082", timestamp, digits: 6 })).toBe(
      true,
    );
    expect(
      await totp.validate({ token: "94287082", timestamp, digits: 6 }),
    ).toBe(false);
  });

  test("a malformed token is rejected without computing any HMAC", async () => {
    const sign = jest.spyOn(globalThis.crypto.subtle, "sign");
    try {
      expect(
        await totp.validate({ token: "9428708A", timestamp, window: 100 }),
      ).toBe(false);
      expect(
        await totp.verify({ token: "9428708A", timestamp, window: 100 }),
      ).toEqual({ valid: false });
      expect(sign).not.toHaveBeenCalled();
    } finally {
      sign.mockRestore();
    }
  });
});

describe("duration", () => {
  const secretKey = Secret.from(secret.sha1, "ascii");
  const timestamp = 59_000;

  test("accepts a fractional duration above 0", async () => {
    const totp = new TOTP({ secret: secretKey, duration: 0.5 });
    const token = await totp.generate({ timestamp });
    expect(token).toEqual(expect.any(String));
    expect(await totp.validate({ token, timestamp })).toBe(true);
  });

  test.each([0, -1, NaN, Infinity, -Infinity, "30"])(
    "the constructor rejects a duration of %p",
    (duration) => {
      expect(() => new TOTP({ duration: duration as number })).toThrow(
        /Invalid duration: .* Must be a finite number greater than 0/,
      );
      expect(() => TOTP.create({ duration: duration as number })).toThrow(
        /Invalid duration: /,
      );
    },
  );

  test.each<[string, (totp: TOTP, duration?: number) => unknown]>([
    ["generate", (totp, duration) => totp.generate({ timestamp, duration })],
    [
      "validate",
      (totp, duration) =>
        totp.validate({ token: "00000000", timestamp, duration }),
    ],
    [
      "verify",
      (totp, duration) =>
        totp.verify({ token: "00000000", timestamp, duration }),
    ],
    [
      "compare",
      (totp, duration) =>
        totp.compare({ token: "00000000", timestamp, duration }),
    ],
    [
      "equals",
      (totp, duration) =>
        totp.equals({ token: "00000000", timestamp, duration }),
    ],
    ["timeUsed", (totp, duration) => totp.timeUsed({ timestamp, duration })],
    [
      "timeRemaining",
      (totp, duration) => totp.timeRemaining({ timestamp, duration }),
    ],
    ["toKeyUri", (totp, duration) => totp.toKeyUri({ duration })],
  ])("%s rejects an invalid duration", async (_name, call) => {
    const totp = new TOTP({ secret: secretKey, digits: 8, duration });
    // Wrap so both sync throws (timeUsed) and async rejects (generate) work.
    const run = (duration?: number) =>
      Promise.resolve().then(() => call(totp, duration));
    // Per call.
    await expect(run(0)).rejects.toThrow(/Invalid duration: 0/);
    await expect(run(NaN)).rejects.toThrow(/Invalid duration: NaN/);
    // Set on the instance after construction.
    totp.duration = 0;
    await expect(run()).rejects.toThrow(/Invalid duration: 0/);
  });
});

describe("timeUsed and timeRemaining", () => {
  test("reports elapsed and remaining seconds in the current step", () => {
    const totp = new TOTP({ duration: 30 });
    expect(totp.timeUsed({ timestamp: 59_000 })).toBe(29);
    expect(totp.timeRemaining({ timestamp: 59_000 })).toBe(1);
  });
});

describe("equals", () => {
  test("matches generate output for the same timestamp", async () => {
    const secretKey = Secret.from(secret.sha1, "ascii");
    const totp = new TOTP({ secret: secretKey, digits: 8, duration });
    const timestamp = data[0].timestamp * 1000;
    const token = await totp.generate({ timestamp });
    expect(await totp.equals({ token, timestamp })).toBe(true);
    expect(await totp.equals({ token: "00000000", timestamp })).toBe(false);
  });
});
