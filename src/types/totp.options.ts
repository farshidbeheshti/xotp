export type TOTPOptions = {
  algorithm: "sha1" | "sha256" | "sha512";
  duration: number;
  digits: number;
  window: number;
  timestamp: number;
};
