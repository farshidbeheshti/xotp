import { HOTP } from "../src/hotp";
import { data, secretKey } from "./data/rfc4226";

describe("HOTP with RFC #4226 input/output data sets ", () => {
  test.each(data)(
    "HOTP - It expects token: $hotp and HMAC-SHA-1(counter, secret): 0x$hmacSha1Result for counter: $counter",
    ({ counter, hotp: expected }) => {
      const hotp = new HOTP().generate({
        secretKey: secretKey,
        counter: counter,
      });
      expect(hotp).toBe(expected);
    },
  );
});
