const { runChecks } = require("./checks.cjs");

runChecks(require("../../dist/index.js"));
console.log("smoke (cjs, dist): ok");
