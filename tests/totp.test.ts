import { TOTP } from "../src/";
import { data, secret, duration } from "./data/rfc6238";

describe("RFC #6238 Test Vectors", () => {
  test.each(data)(
    "TOTP - It expects token: $totp for UTC: $utc",
    ({ timestamp, mode, totp: expected }) => {
      const totp = new TOTP({
        algorithm: mode,
        digits: 8,
      }).generate({
        secret: secret[mode],
        encoding: "ascii",
        timestamp: timestamp * 1000,
        duration,
      });
      expect(totp).toBe(expected);
    },
  );
});
