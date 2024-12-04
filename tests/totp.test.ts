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
