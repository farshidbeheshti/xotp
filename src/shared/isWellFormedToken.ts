/**
 * Whether `token` could be an OTP of the given length: a string of exactly
 * `digits` characters, all ASCII `0`-`9`. Anything else can never match.
 */
export function isWellFormedToken(
  token: unknown,
  digits: number,
): token is string {
  return (
    typeof token === "string" &&
    token.length === digits &&
    /^[0-9]+$/.test(token)
  );
}
