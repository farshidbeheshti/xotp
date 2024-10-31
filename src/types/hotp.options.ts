export type HOTPOptions = {
  algorithm: "sha1" | "sha256" | "sha512";
  counter: number;
  digits: number;
  window: number;
};
