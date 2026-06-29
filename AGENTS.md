# Agent instructions (xotp)

Read this before changing code in this repository.

## Naming (TypeScript)

| Kind | Convention | Examples |
|------|------------|----------|
| Types / interfaces | PascalCase | `TOTPOptions`, `KeyUri` |
| Acronyms in types | Full caps | `TOTP`, `HOTP`, `URI` — use `TOTPKeyUri`, `HOTPKeyUri`, `TOTPOptions` |
| Functions, methods, variables | camelCase | `URI.parse`, `toKeyUri`, `resolveSecret` |
| Classes | PascalCase | `TOTP`, `HOTP`, `Secret`, `URI` |
| Discriminant literals | lowercase strings | `type: "totp"`, `type: "hotp"` |
| Files (domain class) | lowercase, matches concept | `totp.ts`, `hotp.ts`, `secret.ts`, `uri.ts` |
| Files (shared logic) | camelCase under `shared/` | `shared/resolveSecret.ts`, `shared/totpDefaults.ts`, `shared/parseKeyUriAlgorithm.ts` |
| Type definition files | under `types/` | `types/totp.options.ts`, `types/uri.ts` |

## Source layout

```
src/
  totp.ts, hotp.ts, secret.ts, uri.ts   # main public concepts
  utils.ts                      # generic helpers only (e.g. padStart)
  shared/                       # logic shared by TOTP and HOTP — not generic utils
  types/                        # option and parse result types
  encoding/                     # base32, uint8
skills/                         # Claude Code plugin skills (repo root is the plugin)
.claude-plugin/                 # marketplace.json + plugin.json
.cursor/skills/                 # Cursor agent skills
```

- Put **shared OTP logic** (e.g. `resolveSecret`, URI parse helpers) in `src/shared/`, not `utils.ts` and not on `Secret`.
- Do **not** add parallel types like `OTPAccount` or `OTPCredential` — extend `TOTP` and `HOTP` only.
- Prefer `@src/...` path aliases for imports under `src/` when consistent with surrounding code.

## TOTP / HOTP API patterns

### Two usage modes (same class)

1. **Server / multi-tenant** — shared engine, no bound secret, pass `secret` per call:
   ```ts
   new TOTP({ algorithm: "sha256", window: 1 });
   totp.validate({ secret: userSecret, token });
   ```

2. **Enrollment / import** — secret bound on the instance; methods may omit `secret`:
   ```ts
   TOTP.create({ account: "user@example.com" });
   TOTP.fromKeyUri(uri);
   totp.generate();
   ```

### Constructor options

| Option | v1 default | Notes |
|--------|------------|-------|
| `secret` | — | Binds one enrollment to the instance |
| `generateSecret` | `false` | `true` creates one random secret at construction if `secret` omitted |

- **`generateSecret` is constructor-only** — do not add it to `defaults` getters (those are per-operation OTP settings).
- v2 will default `generateSecret` to `true`; document migration with `{ generateSecret: false }` for servers.

### Static factories

| Method | Purpose |
|--------|---------|
| `TOTP.create()` / `HOTP.create()` | Shorthand for `{ generateSecret: true }` (enrollment) |
| `TOTP.fromKeyUri()` / `HOTP.fromKeyUri()` | Import from `otpauth://` URI |

## Key URI (import / export)

Export: instance method **`toKeyUri()`** (symmetric with `fromKeyUri`). **`keyUri()`** remains as a deprecated alias until v2.

Import (public API):

| Name | Role |
|------|------|
| `URI.parse(uri)` | Low-level parser in `src/uri.ts` |
| `URI.format(keyUri)` | Low-level formatter; inverse of `URI.parse` |
| `TOTP.fromKeyUri(uri)` | Returns bound `TOTP` |
| `HOTP.fromKeyUri(uri)` | Returns bound `HOTP` |
| `TOTP.toKeyUri()` / `HOTP.toKeyUri()` | Instance export; delegates to `URI.format` |

Types in `src/types/uri.ts`:

- `TOTPKeyUri` — `type: "totp"`, `secret`, `account`, plus optional `algorithm`, `digits`, `duration`, `issuer`
- `HOTPKeyUri` — `type: "hotp"`, `secret`, `account`, plus optional `algorithm`, `digits`, `counter`, `issuer`
- `KeyUri` — union of `TOTPKeyUri` and `HOTPKeyUri`; used by both `URI.parse` and `URI.format`
- `ParsedURI`, `ParsedTOTP`, `ParsedHOTP` — deprecated aliases; remove in v2

`fromKeyUri` must use the URI secret only (`generateSecret: false`), never auto-generate.

Key URI Format (Google): `otpauth://TYPE/LABEL?PARAMETERS`

- `secret` required (Base32, no padding)
- HOTP: `counter` required
- TOTP: `period` optional (default 30, must be >= 1)
- `digits` optional (6 or 8, default 6)
- `algorithm` optional (SHA1 default; xotp also accepts extended algorithms)
- Label: `issuer:account` or `account`; optional spaces after `:`
- If both label issuer prefix and `issuer` param exist, they must be equal

Out of scope unless requested: `otpauth-migration://`, `steam://`.

## `resolveSecret`

- Lives in `src/shared/resolveSecret.ts`.
- Resolves `argSecret ?? instanceSecret`; throws if both missing.
- Used by `TOTP` and `HOTP` methods — not a method on `Secret`.

## Tests

- Tests live in `tests/` (e.g. `totp.test.ts`, `hotp.test.ts`).
- RFC vectors: `tests/data/rfc4226.ts`, `tests/data/rfc6238.ts`.
- Group instance-secret tests under `describe("instance secret")`.
- Group URI import tests under `describe("fromKeyUri")` or `describe("URI.parse")`.
- Run: `npm test` and `npm run build` before finishing.

## Releases

- **1.1.0** — instance secret, `generateSecret` (default `false`), URI import; minor bump.
- **2.0** — `generateSecret` defaults to `true`; major bump with migration notes.

## Consumer integration

| Target | Path |
|--------|------|
| Cursor | `.cursor/skills/integrate-xotp/SKILL.md` |
| Claude Code | `skills/integrate/SKILL.md` (`.claude-plugin/marketplace.json`, `source: "./"`) |

For NestJS, point users to nestjs-xotp's `integrate-nestjs-xotp` skill. Keep Cursor and Claude skill content in sync when changing integration guidance.

## General principles

- Minimize scope; match existing style in surrounding files.
- Zero runtime dependencies.
- Do not commit secrets or bump version unless asked.
