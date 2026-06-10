const TOTP_SECRET = "12345678901234567890";
const TOTP_TIMESTAMP = 59;
const TOTP_TOKEN = "94287082";
const HOTP_TOKEN = "755224";

export function runChecks({ TOTP, HOTP, Secret }) {
  const totpSecret = Secret.from(TOTP_SECRET, "ascii");
  const totp = new TOTP({ algorithm: "sha1", digits: 8 });
  const token = totp.generate({
    secret: totpSecret,
    timestamp: TOTP_TIMESTAMP * 1000,
  });

  if (token !== TOTP_TOKEN) {
    throw new Error(`TOTP generate: expected ${TOTP_TOKEN}, got ${token}`);
  }

  if (
    !totp.validate({
      secret: totpSecret,
      token: TOTP_TOKEN,
      timestamp: TOTP_TIMESTAMP * 1000,
      digits: 8,
    })
  ) {
    throw new Error("TOTP validate failed");
  }

  const hotpSecret = Secret.from(TOTP_SECRET, "ascii");
  const hotp = new HOTP({ algorithm: "sha1", digits: 6 });
  const hotpToken = hotp.generate({ secret: hotpSecret, counter: 0 });

  if (hotpToken !== HOTP_TOKEN) {
    throw new Error(`HOTP generate: expected ${HOTP_TOKEN}, got ${hotpToken}`);
  }
}
