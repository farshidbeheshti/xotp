import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import { EdgeRuntime } from "edge-runtime";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const entry = path.join(root, "tests/smoke/vercel-edge-worker.mjs");

// EdgeRuntime only accepts a string; bundle dist/esm + checks into one script.
const bundled = await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  target: "es2022",
});

const runtime = new EdgeRuntime({
  initialCode: bundled.outputFiles[0].text,
});

const res = await runtime.dispatchFetch("http://localhost/");
await res.waitUntil();
const body = await res.text();

if (res.status !== 200) {
  console.error(body);
  process.exitCode = 1;
} else {
  console.log("smoke (vercel-edge, dist/esm): ok");
}
