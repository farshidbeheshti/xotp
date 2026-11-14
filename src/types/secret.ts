import type { Secret } from "../secret.js";

/** A {@link Secret} instance or a Base32-encoded secret string. */
export type SecretInput = Secret | string;
