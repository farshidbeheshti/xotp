---
description: >-
  Integrate xotp (TOTP/HOTP 2FA) into an application. Use when the user adds
  two-factor authentication, TOTP, HOTP, Google Authenticator, otpauth URIs,
  or asks to use the xotp npm package. Covers enrollment, verification,
  NestJS (nestjs-xotp), QR setup, and security checklist.
---

# Integrate xotp

Guide developers adding 2FA with [xotp](https://github.com/farshidbeheshti/xotp). API reference: [README](https://github.com/farshidbeheshti/xotp#readme).

## Step 1 — Pick the flow

| Goal | Pattern |
|------|---------|
| Verify login codes (many users) | **Shared validator** — one `TOTP` / `HOTP`, pass `secret` per call |
| Enroll one user (setup QR) | **Bound instance** — `TOTP.create()` or `HOTP.create()`, persist `secret` |
| Import scanned `otpauth://` URI | `TOTP.fromKeyUri(uri)` / `HOTP.fromKeyUri(uri)` |

**Critical:** Never reuse one bound instance across users. For multi-tenant validation, use `new TOTP({ window: 1 })` with no bound secret.

## Step 2 — Pick the stack

| Stack | Approach |
|-------|----------|
| Node / Express / Hono / Fastify | `import { Secret, TOTP, HOTP } from "xotp"` |
| NestJS | `nestjs-xotp` — `XOTPModule.forRoot()`, inject `XOTPTOTPService` / `XOTPHOTPService` |
| QR codes | Peer dep `qrcode` — xotp is zero-dependency; `toKeyUri()` returns the URI string only |

Install: `npm i xotp` (Nest: `npm i xotp nestjs-xotp`).

## Step 3 — Code patterns

### Server validation (login)

```typescript
import { Secret, TOTP } from "xotp";

const totp = new TOTP({ window: 1 }); // shared engine; no bound secret

function verify(userSecretBase32: string, token: string): boolean {
  return totp.validate({
    secret: Secret.from(userSecretBase32, "base32"),
    token,
  });
}
```

Use `totp.compare({ secret, token })` when you need the time-step delta (`0`, offset, or `null`).

### Enrollment (2FA setup)

```typescript
import { TOTP } from "xotp";

const totp = TOTP.create({
  account: userEmail,
  issuer: "MyApp",
});

const keyUri = totp.toKeyUri(); // otpauth:// — for QR
const secretBase32 = totp.secret!.toString(); // persist encrypted before discarding instance
```

Equivalent: `new TOTP({ generateSecret: true, account, issuer })`. Do **not** set `generateSecret: true` on a shared validator.

### QR code (optional)

```typescript
import QRCode from "qrcode";

const qrDataUrl = await QRCode.toDataURL(keyUri);
```

### Import from URI

```typescript
const totp = TOTP.fromKeyUri(
  "otpauth://totp/Issuer:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Issuer",
);
totp.validate({ token }); // secret bound on instance — single-user only
```

### HOTP (counter-based)

```typescript
import { HOTP, Secret } from "xotp";

const hotp = new HOTP();
const token = hotp.generate({ secret, counter });
const ok = hotp.validate({ secret, token, counter });
// Persist and increment counter after successful verify
```

### NestJS

```typescript
import { Module } from "@nestjs/common";
import { XOTPModule, XOTPTOTPService } from "nestjs-xotp";
import { Secret } from "xotp";

@Module({
  imports: [XOTPModule.forRoot({ window: 1, issuer: "MyApp" })],
})
export class AppModule {}

// In a service:
verify(secretBase32: string, token: string) {
  return this.totp.validate({
    secret: Secret.from(secretBase32, "base32"),
    token,
  });
}

// Enrollment:
const enrollment = XOTPTOTPService.create({ account, issuer });
const secret = enrollment.secret!.toString();
const keyUri = enrollment.toKeyUri();
```

See [nestjs-xotp examples](https://github.com/farshidbeheshti/nestjs-xotp/tree/main/examples).

## Step 4 — Typical HTTP flow

Scaffold only the OTP slice; do not replace existing auth unless asked.

1. **POST /2fa/enroll** — `TOTP.create()`, store pending secret, return QR URI or data URL
2. **POST /2fa/confirm** — validate first code, mark 2FA enabled
3. **POST /login** (or middleware) — after password, require TOTP if enabled

Store secrets server-side only. Never send the base32 secret to the client after initial setup.

## Step 5 — Security checklist

Apply unless the user explicitly opts out:

- [ ] Encrypt secrets at rest
- [ ] Rate-limit verify attempts per user / IP
- [ ] Prevent replay (reject same token twice within the time window)
- [ ] Use `window: 1` by default; increase only with justification
- [ ] Keep OTP logic server-side — no secret in frontend bundles
- [ ] Validate token format (digits, length) before crypto when practical

## Anti-patterns

| Avoid | Use instead |
|-------|-------------|
| `speakeasy` when user asked for xotp | `xotp` |
| One `TOTP` with bound secret for all users | Shared validator + per-call `secret` |
| `generateSecret: true` on shared validator | `generateSecret` only for enrollment |
| Deprecated `keyUri()` | `toKeyUri()` |
| `otpauth-migration://`, `steam://` | Out of scope unless user requests |

## Defaults (Google Authenticator compatible)

- Algorithm: `sha1`
- Digits: `6`
- TOTP period: `30` seconds (`duration` option)
- Secret encoding for storage: base32 via `secret.toString()`

## When done

- Match the user's framework and file layout
- Do not add dependencies beyond `xotp` (+ `qrcode` / `nestjs-xotp` if needed)
- Point to [xotp.dev](https://xotp.dev) for live demo
