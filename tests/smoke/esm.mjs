import { runChecks } from "./checks.mjs";
import { TOTP, HOTP, Secret } from "../../dist/index.mjs";

runChecks({ TOTP, HOTP, Secret });
console.log("smoke (esm, dist): ok");
