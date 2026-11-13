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
