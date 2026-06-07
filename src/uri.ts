import { Secret } from "./secret";
import { hotpDefaults } from "./shared/hotpDefaults";
import {
  formatKeyUriAlgorithm,
  parseKeyUriAlgorithm,
} from "./shared/parseKeyUriAlgorithm";
import { parseKeyUriDigits } from "./shared/parseKeyUriDigits";
import { parseIntParam } from "./shared/parseIntParam";
import { parseKeyUriLabel } from "./shared/parseKeyUriLabel";
import { totpDefaults } from "./shared/totpDefaults";
import { KeyUri, TOTPKeyUri, HOTPKeyUri } from "@src/types";

function withOptionalIssuer<T extends { issuer?: string }>(
  keyUri: T,
  issuer: string | undefined,
): T {
  if (issuer) {
    keyUri.issuer = issuer;
  }
  return keyUri;
}

class URI {
  static format(keyUri: KeyUri): string {
    const e = encodeURIComponent;
    const defaults = keyUri.type === "totp" ? totpDefaults : hotpDefaults;
    const algorithm = formatKeyUriAlgorithm(
      keyUri.algorithm ?? defaults.algorithm,
    );
    const digits = keyUri.digits ?? defaults.digits;
    const secret = keyUri.secret.toString("base32").replace(/=+$/, "");

    const params = [
      `secret=${e(secret)}`,
      `algorithm=${e(algorithm)}`,
      `digits=${e(digits)}`,
    ];

    if (keyUri.type === "totp") {
      const duration = keyUri.duration ?? totpDefaults.duration;
      params.push(`period=${e(duration)}`);
    } else {
      const counter = keyUri.counter ?? hotpDefaults.counter;
      params.push(`counter=${e(counter)}`);
    }

    let label = keyUri.account;
    const issuer = keyUri.issuer;
    if (issuer) {
      label = `${e(issuer)}:${e(label)}`;
      params.push(`issuer=${e(issuer)}`);
    }

    return `otpauth://${keyUri.type}/${label}?${params.join("&")}`;
  }

  static parse(uri: string): KeyUri {
    let url: URL;
    try {
      url = new URL(uri);
    } catch {
      throw new TypeError("Invalid key URI");
    }

    if (url.protocol !== "otpauth:") {
      throw new TypeError(`Unsupported URI protocol: ${url.protocol}`);
    }

    const type = url.hostname;
    if (type !== "totp" && type !== "hotp") {
      throw new TypeError(`Unsupported key URI type: ${type}`);
    }

    const { account, issuer } = parseKeyUriLabel(
      url.pathname,
      url.searchParams.get("issuer"),
    );

    const secretParam = url.searchParams.get("secret");
    if (!secretParam) {
      throw new TypeError("Key URI is missing required parameter: secret");
    }

    const secret = Secret.from(secretParam.replace(/\s+/g, ""), "base32");
    const algorithm = parseKeyUriAlgorithm(
      url.searchParams.get("algorithm"),
      type === "totp" ? totpDefaults.algorithm : hotpDefaults.algorithm,
    );
    const digits = parseKeyUriDigits(
      url.searchParams.get("digits"),
      type === "totp" ? totpDefaults.digits : hotpDefaults.digits,
    );

    if (type === "totp") {
      const duration = parseIntParam(
        url.searchParams.get("period"),
        totpDefaults.duration,
        "period",
        1,
      );
      return withOptionalIssuer<TOTPKeyUri>(
        { type: "totp", secret, account, algorithm, digits, duration },
        issuer,
      );
    }

    const counterParam = url.searchParams.get("counter");
    if (counterParam == null || counterParam === "") {
      throw new TypeError("Key URI is missing required parameter: counter");
    }
    const counter = parseIntParam(
      counterParam,
      hotpDefaults.counter,
      "counter",
    );

    return withOptionalIssuer<HOTPKeyUri>(
      { type: "hotp", secret, account, algorithm, digits, counter },
      issuer,
    );
  }
}

export { URI };
