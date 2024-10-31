export type TOTPOptions = {
  algorithm: "sha1" | "sha256" | "sha512";
  step: number;
  digits: number;
  window: number;
  epoch: number;
};
