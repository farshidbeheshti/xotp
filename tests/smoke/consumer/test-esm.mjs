import { runChecks } from "../checks.mjs";
import { TOTP, HOTP, Secret } from "xotp";

runChecks({ TOTP, HOTP, Secret });
console.log("smoke (esm, package): ok");
