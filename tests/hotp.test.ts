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
});

describe("toKeyUri", () => {
  test("deprecated keyUri delegates to toKeyUri", () => {
    const secretKey = Secret.from(secret, "ascii");
    const hotp = new HOTP({ secret: secretKey, account: "user@example.com" });
    expect(hotp.keyUri()).toBe(hotp.toKeyUri());
  });
});
