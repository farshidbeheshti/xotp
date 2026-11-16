import { runChecks } from "./checks.mjs";
import { TOTP, HOTP, Secret } from "../../dist/esm/index.js";

addEventListener("fetch", (event) => {
  event.respondWith(
    (async () => {
      try {
        await runChecks({ TOTP, HOTP, Secret });
        return new Response("ok");
      } catch (err) {
        return new Response(String(err?.stack ?? err), { status: 500 });
      }
    })(),
  );
});
