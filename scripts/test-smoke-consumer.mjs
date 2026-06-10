import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const checksCjs = join(rootDir, "tests/smoke/checks.cjs");
const checksMjs = join(rootDir, "tests/smoke/checks.mjs");

const format = process.argv[2];
if (format !== "cjs" && format !== "esm") {
  console.error("Usage: node scripts/test-smoke-consumer.mjs <cjs|esm>");
  process.exit(1);
}

const tmpDir = mkdtempSync(join(tmpdir(), "xotp-smoke-consumer-"));

try {
  writeFileSync(
    join(tmpDir, "package.json"),
    JSON.stringify(
      {
        private: true,
        type: format === "esm" ? "module" : "commonjs",
        dependencies: { xotp: `file:${rootDir}` },
      },
      null,
      2,
    ) + "\n",
  );

  if (format === "cjs") {
    writeFileSync(
      join(tmpDir, "test.cjs"),
      `const { runChecks } = require(${JSON.stringify(checksCjs)});\nrunChecks(require("xotp"));\nconsole.log("smoke (cjs, package): ok");\n`,
    );
  } else {
    writeFileSync(
      join(tmpDir, "test.mjs"),
      `import { runChecks } from ${JSON.stringify(checksMjs)};\nimport { TOTP, HOTP, Secret } from "xotp";\nrunChecks({ TOTP, HOTP, Secret });\nconsole.log("smoke (esm, package): ok");\n`,
    );
  }

  const install = spawnSync("npm", ["install", "--ignore-scripts"], {
    cwd: tmpDir,
    stdio: "inherit",
  });
  if (install.status !== 0) process.exit(install.status ?? 1);

  const run = spawnSync("node", [format === "cjs" ? "test.cjs" : "test.mjs"], {
    cwd: tmpDir,
    stdio: "inherit",
  });
  if (run.status !== 0) {
    console.error(`Consumer smoke failed (${format}). Temp dir: ${tmpDir}`);
    process.exit(run.status ?? 1);
  }
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}