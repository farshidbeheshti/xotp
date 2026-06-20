import { HOTP, Secret } from "../src";
import { data, secret } from "./data/rfc4226";

describe("HOTP with RFC #4226 input/output data sets ", () => {
  test.each(data)(
    "HOTP - It expects token: $hotp and HMAC-SHA-1(counter, secret): 0x$hmacSha1Result for counter: $counter",
    ({ counter, hotp: expected }) => {
      const hotp = new HOTP().generate({
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

  test("generate() throws when no instance secret and no arg", () => {
    const hotp = new HOTP();
    expect(() => hotp.generate()).toThrow(/Secret is required/);
  });

  test("generateSecret: true creates an instance secret", () => {
    const hotp = new HOTP({ generateSecret: true });
    expect(hotp.secret).toBeInstanceOf(Secret);
    expect(() => hotp.generate()).not.toThrow();
  });

  test("HOTP.create() creates an instance secret", () => {
    const hotp = HOTP.create();
    expect(hotp.secret).toBeInstanceOf(Secret);
    expect(() => hotp.generate()).not.toThrow();
  });

  test("bound instance generates RFC token without passing secret", () => {
    const secretKey = Secret.from(secret, "ascii");
    const hotp = new HOTP({ secret: secretKey });
    const { counter, hotp: expected } = data[0];
    expect(hotp.generate({ counter })).toBe(expected);
  });
});

describe("validate", () => {
  test("returns true for a matching token and false otherwise", () => {
    const secretKey = Secret.from(secret, "ascii");
    const hotp = new HOTP({ secret: secretKey, counter: 0 });
    const token = hotp.generate({ counter: 0 });
    expect(hotp.validate({ token, counter: 0 })).toBe(true);
    expect(hotp.validate({ token: "000000", counter: 0 })).toBe(false);
  });
});

describe("compare", () => {
  test("returns a negative delta when the token matches a past counter", () => {
    const secretKey = Secret.from(secret, "ascii");
    const hotp = new HOTP({ window: 2 });
    const token = hotp.generate({ secret: secretKey, counter: 5 });
    expect(hotp.compare({ token, secret: secretKey, counter: 7 })).toBe(-2);
  });
});

describe("toKeyUri", () => {
  test("deprecated keyUri delegates to toKeyUri", () => {
    const secretKey = Secret.from(secret, "ascii");
    const hotp = new HOTP({ secret: secretKey, account: "user@example.com" });
    expect(hotp.keyUri()).toBe(hotp.toKeyUri());
  });
});
