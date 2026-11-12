import { runChecks } from "./checks.mjs";
import { TOTP, HOTP, Secret } from "../../dist/esm/index.js";

await runChecks({ TOTP, HOTP, Secret });
console.log("smoke (esm, dist): ok");
