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
