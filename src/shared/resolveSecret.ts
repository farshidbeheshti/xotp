import { Secret } from "../secret.js";
import type { SecretInput } from "../types/index.js";

export function toSecret(secret: SecretInput): Secret {
  return typeof secret === "string" ? Secret.from(secret, "base32") : secret;
}

export function resolveSecret(
  instanceSecret?: Secret,
  argSecret?: SecretInput,
): Secret {
  const secret = argSecret || instanceSecret;
  if (!secret) {
    throw new TypeError(
      "Secret is required. Pass secret to this method, provide { secret } in the constructor, or set { generateSecret: true } to create one when secret is omitted.",
    );
  }
  return toSecret(secret);
}
