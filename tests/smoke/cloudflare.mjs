import path from "node:path";
import { fileURLToPath } from "node:url";
import { Miniflare } from "miniflare";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const mf = new Miniflare({
  modules: true,
  modulesRoot: root,
  scriptPath: path.join(root, "tests/smoke/worker.mjs"),
  // dist/esm uses .js with ESM syntax; Miniflare defaults .js to CommonJS.
  modulesRules: [{ type: "ESModule", include: ["**/*.js"], fallthrough: true }],
  compatibilityDate: "2024-11-11",
  cf: false,
});

try {
  const res = await mf.dispatchFetch("http://localhost/");
  const body = await res.text();
  if (res.status !== 200) {
    console.error(body);
    process.exitCode = 1;
  } else {
    console.log("smoke (cloudflare/workerd, dist/esm): ok");
  }
} finally {
  await mf.dispose();
}
