const { runChecks } = require("../checks.cjs");

runChecks(require("xotp"));
console.log("smoke (cjs, package): ok");
