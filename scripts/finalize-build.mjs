import { writeFileSync } from "node:fs";
import { join } from "node:path";

// Mark each build directory with the module format Node should use so that
// the dual ESM/CJS package resolves correctly regardless of the consumer's
// own "type" field.
writeFileSync(
  join("dist", "cjs", "package.json"),
  JSON.stringify({ type: "commonjs" }, null, 2) + "\n",
);
writeFileSync(
  join("dist", "esm", "package.json"),
  JSON.stringify({ type: "module" }, null, 2) + "\n",
);
