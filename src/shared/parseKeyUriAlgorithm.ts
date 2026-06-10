import { Algorithm } from "@src/types";
import { totpDefaults } from "./totpDefaults";

const URI_ALGORITHMS: Record<string, Algorithm> = {
  "SHA1": "sha1",
  "SHA224": "sha224",
  "SHA256": "sha256",
  "SHA384": "sha384",
  "SHA512": "sha512",
  "SHA-512/224": "sha-512/224",
  "SHA512/224": "sha-512/224",
  "SHA-512/256": "sha-512/256",
  "SHA512/256": "sha-512/256",
  "SHA3-224": "sha3-224",
  "SHA3-256": "sha3-256",
  "SHA3-384": "sha3-384",
  "SHA3-512": "sha3-512",
};

const URI_ALGORITHM_NAMES = Object.entries(URI_ALGORITHMS).reduce(
  (names, [uriName, algorithm]) => {
    if (!names[algorithm]) {
      names[algorithm] = uriName;
    }
    return names;
  },
  {} as Record<Algorithm, string>,
);

export function parseKeyUriAlgorithm(
  value?: string | null,
  defaultAlgorithm: Algorithm = totpDefaults.algorithm,
): Algorithm {
  if (value == null || value === "") return defaultAlgorithm;

  const normalized = value.trim().toUpperCase();
  const algorithm = URI_ALGORITHMS[normalized];

  if (!algorithm) {
    throw new TypeError(`Unsupported algorithm: ${value}`);
  }

  return algorithm;
}

export function formatKeyUriAlgorithm(algorithm: Algorithm): string {
  const name = URI_ALGORITHM_NAMES[algorithm];
  if (!name) {
    throw new TypeError(`Unsupported algorithm: ${algorithm}`);
  }
  return name;
}
