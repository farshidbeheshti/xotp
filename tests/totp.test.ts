import { TOTP, Secret } from "../src/";
import { data, secret, duration } from "./data/rfc6238";
import { randomNum } from "./util";

describe("RFC #6238 Test Vectors", () => {
  test.each(data)(
    "TOTP - should generate token: $totp for UTC: $utc",
    ({ timestamp, mode, totp: token }) => {
      const generatedToken = new TOTP({
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
    ({ timestamp, mode }) => {
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

      const token = totp.generate({
        secret: Secret.from(secret[mode], "ascii"),
        timestamp: (timestamp + inWindow) * 1000,
      });

      const delta = totp.compare({
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

  test("generate() throws when no instance secret and no arg", () => {
    const totp = new TOTP();
    expect(() => totp.generate()).toThrow(/Secret is required/);
  });

  test("generateSecret: true creates an instance secret", () => {
    const totp = new TOTP({ generateSecret: true });
    expect(totp.secret).toBeInstanceOf(Secret);
    expect(() => totp.generate()).not.toThrow();
  });

  test("TOTP.create() creates an instance secret", () => {
    const totp = TOTP.create();
    expect(totp.secret).toBeInstanceOf(Secret);
    expect(() => totp.generate()).not.toThrow();
  });

  test("explicit secret takes precedence over generateSecret", () => {
    const secretKey = Secret.from("test", "ascii");
    const totp = new TOTP({ secret: secretKey, generateSecret: true });
    expect(totp.secret).toBe(secretKey);
  });

  test("method secret overrides instance secret", () => {
    const totp = new TOTP({ generateSecret: true });
    const { timestamp, mode, totp: expected } = data[0];
    const other = Secret.from(secret[mode], "ascii");
    const token = totp.generate({
      secret: other,
      timestamp: timestamp * 1000,
      algorithm: mode,
      digits: 8,
      duration,
    });
    expect(token).toBe(expected);
  });

  test("bound instance validates without passing secret", () => {
    const secretKey = Secret.from(secret.sha1, "ascii");
    const totp = new TOTP({ secret: secretKey, digits: 8, duration });
    const { timestamp, totp: token } = data[0];
    expect(totp.validate({ token, timestamp: timestamp * 1000 })).toBe(true);
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
  test("matches generate output for the same timestamp", () => {
    const secretKey = Secret.from(secret.sha1, "ascii");
    const totp = new TOTP({ secret: secretKey, digits: 8, duration });
    const timestamp = data[0].timestamp * 1000;
    const token = totp.generate({ timestamp });
    expect(totp.equals({ token, timestamp })).toBe(true);
    expect(totp.equals({ token: "00000000", timestamp })).toBe(false);
  });
});
