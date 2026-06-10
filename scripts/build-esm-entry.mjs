import { writeFileSync } from "node:fs";
import { join } from "node:path";

const content = `export { TOTP } from "./totp.js";
export { HOTP } from "./hotp.js";
export { Secret } from "./secret.js";
export * from "./types/index.js";
`;

writeFileSync(join("dist", "index.mjs"), content);
