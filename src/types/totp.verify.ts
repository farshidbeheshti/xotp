export type TOTPVerifyResult =
  | {
      valid: true;
      timeStep: number;
      delta: number;
    }
  | { valid: false };
