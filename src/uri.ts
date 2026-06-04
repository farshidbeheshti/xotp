import { Secret } from "./secret";
import { Algorithm, HOTPOptions, TOTPOptions } from "./types";

type ParsedTOTP = {
  type: "totp";
  secret: Secret;
  account: string;
  options: Partial<Omit<TOTPOptions, "account">>;
};

type ParsedHOTP = {
  type: "hotp";
  secret: Secret;
  account: string;
  options: Partial<Omit<HOTPOptions, "account">>;
};

type ParsedURI = ParsedTOTP | ParsedHOTP;

class URI {
  static parse(uri: string): ParsedURI {
    const match = uri.match(/^otpauth:\/\/(totp|hotp)\/([^?]+)\?(.+)$/);
    if (!match) {
      throw new Error("Invalid OTP URI format");
    }

    const [, type, label, query] = match;
    const params = new URLSearchParams(query);

    const secretParam = params.get("secret");
    if (!secretParam) {
      throw new Error("Missing secret parameter in URI");
    }

    const secret = Secret.from(secretParam, "base32");
    const { account, issuer: labelIssuer } = this.#parseLabel(label);

    const algorithm = this.#parseAlgorithm(params.get("algorithm"));
    const digits = this.#parseDigits(params.get("digits"));
    const issuer = params.get("issuer") || labelIssuer || undefined;

    if (type === "totp") {
      const duration = this.#parseDuration(params.get("period"));
      return {
        type: "totp",
        secret,
        account,
        options: { algorithm, digits, duration, issuer },
      };
    } else {
      const counter = this.#parseCounter(params.get("counter"));
      return {
        type: "hotp",
        secret,
        account,
        options: { algorithm, digits, counter, issuer },
      };
    }
  }

  static #parseLabel(label: string): { account: string; issuer?: string } {
    const decoded = decodeURIComponent(label);
    const colonIndex = decoded.indexOf(":");
    if (colonIndex !== -1) {
      return {
        issuer: decoded.slice(0, colonIndex),
        account: decoded.slice(colonIndex + 1).trimStart(),
      };
    }
    return { account: decoded };
  }

  static #parseAlgorithm(value: string | null): Algorithm | undefined {
    if (!value) return undefined;
    const lower = value.toLowerCase();
    return lower as Algorithm;
  }

  static #parseDigits(value: string | null): number | undefined {
    if (!value) return undefined;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? undefined : parsed;
  }

  static #parseDuration(value: string | null): number | undefined {
    if (!value) return undefined;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? undefined : parsed;
  }

  static #parseCounter(value: string | null): number | undefined {
    if (!value) return undefined;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? undefined : parsed;
  }
}

export { URI };
