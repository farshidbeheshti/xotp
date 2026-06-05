import { Secret } from "../secret";

export function resolveSecret(
  instanceSecret?: Secret,
  argSecret?: Secret,
): Secret {
  const secret = argSecret ?? instanceSecret;
  if (!secret) {
    throw new TypeError(
      "Secret is required. Pass secret to this method, provide { secret } in the constructor, or set { generateSecret: true } to create one when secret is omitted.",
    );
  }
  return secret;
}
