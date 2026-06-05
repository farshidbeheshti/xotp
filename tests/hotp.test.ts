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
