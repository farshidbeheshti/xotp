const { runChecks } = require("./checks.cjs");

runChecks(require("../../dist/cjs/index.js")).then(() => {
  console.log("smoke (cjs, dist): ok");
});
