import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
export default {
  input: "dist/index.js",
  output: {
    file: "dist/index.mjs",
    format: "es",
  },
  plugins: [nodeResolve(), commonjs()],
};
