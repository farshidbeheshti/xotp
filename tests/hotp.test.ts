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

describe("toKeyUri", () => {
  test("deprecated keyUri delegates to toKeyUri", () => {
    const secretKey = Secret.from(secret, "ascii");
    const hotp = new HOTP({ secret: secretKey, account: "user@example.com" });
    expect(hotp.keyUri()).toBe(hotp.toKeyUri());
  });
});
