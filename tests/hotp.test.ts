import { HOTP } from "../src/hotp";
import { data, secret } from "./data/rfc4226";

describe("HOTP with RFC #4226 input/output data sets ", () => {
  test.each(data)(
    "HOTP - It expects token: $hotp and HMAC-SHA-1(counter, secret): 0x$hmacSha1Result for counter: $counter",
    ({ counter, hotp: expected }) => {
      const hotp = new HOTP().generate({
        secret: secret,
        encoding: "ascii",
        counter: counter,
      });
      expect(hotp).toBe(expected);
    },
  );
});
