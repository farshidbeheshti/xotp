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
