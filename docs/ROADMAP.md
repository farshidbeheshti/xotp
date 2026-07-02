# XOTP roadmap & competitive landscape

Last updated: June 2026 · Current release: **1.1.0**

This document sketches a **12-month plan** for `xotp` (core), companion packages (`@xotp/*`), and documentation — plus a **feature-by-feature comparison** against [otplib](https://otplib.yeojz.dev) and [otpauth](https://github.com/hectorm/otpauth).

---

## Strategic positioning

**Keep `xotp` as a zero-dependency OTP core.** Grow adoption through docs, migration guides, and optional ecosystem packages — not by turning the core into a full 2FA platform.

| Layer | Role | Repo |
|-------|------|------|
| **Core** | RFC-correct HOTP/TOTP, `Secret`, `URI` | `xotp` |
| **Ecosystem** | Framework wrappers, recovery codes, replay guard | `@xotp/*`, `nestjs-xotp` |
| **Docs / demo** | Cookbooks, migration, live examples | `xotp` docs, `xotp.dev` |

---

## Competitive matrix (Jun 2026)

Legend: ✅ supported · ⚠️ partial / workaround · ❌ not supported · — not applicable

### Adoption & packaging

| Feature | **xotp** | **otplib** | **otpauth** |
|---------|----------|------------|-------------|
| npm weekly downloads | ~434 | ~2.6M | ~1.6M |
| npm dependents | ~1 | ~584 | ~331 |
| Runtime deps (main pkg) | **0** | 6 (`@noble/hashes`, `@scure/base`, …) | 1 (`@noble/hashes`) |
| Unpacked size | ~59 KB | ~566 KB | ~931 KB (multi-build) |
| First published | Dec 2024 | Apr 2014 | Jan 2017 |

### OTP algorithms & RFC compliance

| Feature | **xotp** | **otplib** | **otpauth** |
|---------|----------|------------|-------------|
| HOTP (RFC 4226) | ✅ | ✅ | ✅ |
| TOTP (RFC 6238) | ✅ | ✅ | ✅ |
| RFC test vectors in CI | ✅ | ✅ | ✅ |
| Hash algorithms | sha1, sha224, sha256, sha384, sha512, sha-512/224, sha-512/256, sha3-* (**11**) | sha1, sha256, sha512 | SHA1, SHA224, SHA256, SHA384, SHA512, SHA3-* |
| Digits | 6, 8 (via options) | 6, 7, 8 | configurable |
| TOTP period / duration | ✅ (`duration`) | ✅ (`period`) | ✅ (`period`) |
| Custom TOTP epoch (`T0`) | ❌ | ✅ (`epoch`, `t0`) | ⚠️ (via counter math) |
| HOTP counter window | ✅ (`window`, symmetric) | ✅ (`counterTolerance`) | ✅ (`window`) |
| TOTP time window | ✅ (`window`, steps) | ✅ (`epochTolerance`, seconds) | ✅ (`window`, steps) |

### API surface

| Feature | **xotp** | **otplib** | **otpauth** |
|---------|----------|------------|-------------|
| Class API | ✅ `TOTP`, `HOTP` | ✅ `OTP` (unified) | ✅ `TOTP`, `HOTP` |
| Functional API | ❌ | ✅ `generate`, `verify`, … | ❌ (class-only) |
| Async API | ❌ (sync only) | ✅ default; sync optional | ❌ (sync only) |
| Bound instance secret | ✅ `generateSecret`, `.create()` | ⚠️ (string secret, not class-bound) | ✅ (auto-generates if omitted) |
| Per-call secret (multi-tenant) | ✅ | ✅ | ✅ |
| `validate()` return type | `boolean` | `{ valid, … }` | `delta \| null` |
| `compare()` / delta | ✅ | ✅ (via verify result) | ✅ (`validate`) |
| `equals()` exact step | ✅ | — | — |
| `timeUsed` / `timeRemaining` | ✅ | ✅ (`getRemainingTime`) | ✅ (`remaining`, `counter`) |
| Typed errors | ⚠️ `TypeError` only | ✅ `SecretTooShortError`, … | ⚠️ generic |
| Constant-time compare | ✅ `timingSafeEqual` | ✅ (plugin-dependent) | ✅ |

### Key URI (`otpauth://`)

| Feature | **xotp** | **otplib** | **otpauth** |
|---------|----------|------------|-------------|
| Export URI | ✅ `toKeyUri()` / `URI.format` | ✅ `generateURI` | ✅ `toString()` / `URI.stringify` |
| Import URI | ✅ `fromKeyUri()` / `URI.parse` | ✅ (via `@otplib/uri`) | ✅ `URI.parse` |
| Issuer label validation | ✅ | ✅ | ✅ |
| Unpadded base32 in URI | ✅ | ✅ | ✅ |
| `otpauth-migration://` | ❌ (out of scope) | ❌ | ❌ |
| Steam Guard (`steam://`) | ❌ (out of scope) | ❌ | ❌ |

### Secret handling

| Feature | **xotp** | **otplib** | **otpauth** |
|---------|----------|------------|-------------|
| Random secret generation | ✅ `Secret`, `Secret.for(algo)` | ✅ `generateSecret()` | ✅ `new Secret()` |
| Algorithm-sized secrets | ✅ | ✅ (128-bit min guardrail) | ✅ (recommends ≥128 bit) |
| Encodings | base32, base64, hex, utf8, … (**10+**) | Base32 default; plugins for alt | Base32 via `Secret` |
| Min secret length enforcement | ❌ | ✅ (configurable guardrails) | ⚠️ docs only |

### Runtime & distribution

| Feature | **xotp** | **otplib** | **otpauth** |
|---------|----------|------------|-------------|
| Node.js | ✅ (`node:crypto`) | ✅ (plugin) | ✅ |
| Bun | ✅ (CI smoke) | ✅ | ✅ |
| Deno | ✅ (CI smoke) | ✅ | ✅ (JSR) |
| Browser | ❌ | ✅ (Web Crypto / noble / IIFE) | ✅ (ESM, UMD, slim, bare) |
| Edge (Workers, Vercel) | ❌ | ✅ | ✅ |
| ESM + CJS dual package | ✅ | ✅ | ✅ (+ many build variants) |
| CDN / script tag | ❌ | ✅ IIFE global | ✅ UMD |
| Pluggable crypto | ❌ | ✅ (node / web / noble) | ⚠️ bare build + custom HMAC |
| Tree-shakeable subpaths | ❌ | ✅ (`@otplib/totp`, …) | ✅ (`otpauth/slim`, `bare`) |

### Security & production extras

| Feature | **xotp** | **otplib** | **otpauth** |
|---------|----------|------------|-------------|
| Recovery codes | ❌ (app layer) | ❌ | ❌ |
| Replay protection | ❌ (app layer) | ❌ | ❌ (docs recommend `counter()`) |
| Rate limiting | ❌ (app layer) | ❌ | ❌ |
| Hooks / custom token encoding | ❌ | ✅ | ❌ |
| Security audit story | — | ✅ noble + scure audited | ✅ noble audited |
| Framework integrations | `nestjs-xotp` | community | community |

### xotp strengths today

1. **Zero runtime dependencies** — smallest trust surface for Node servers.
2. **Extended hash algorithm set** — beyond what most authenticator apps use, but useful for custom systems.
3. **Clear dual usage model** — shared validator vs bound enrollment instance (`AGENTS.md`).
4. **`timingSafeEqual` + `compare()`** — good verify ergonomics for servers.
5. **Rich encoding support** on `Secret`.

### xotp gaps vs leaders

1. **Browser / edge** — blocked by hard `node:crypto` import.
2. **Adoption** — orders of magnitude fewer downloads; no migration guides yet.
3. **Functional API + richer verify result** — otplib/otpauth patterns are familiar to newcomers.
4. **Custom TOTP epoch** — minor but documented in otplib.
5. **Typed errors & guardrails** — otplib v13 invested heavily here.
6. **Ecosystem depth** — otplib modular packages; otpauth multi-build distribution.

---

## 12-month roadmap

Assumes ~1 maintainer, part-time. Adjust scope if full-time.

### Q3 2026 (Jul–Sep) — Foundation & discoverability

**Theme:** Make xotp easy to choose and hard to misuse.

#### Core (`xotp` → **1.2.x**)

| Item | Priority | Notes |
|------|----------|-------|
| `validate()` overload or `verify()` alias returning `{ valid, delta }` | P1 | Non-breaking: add method, keep `validate()` |
| Typed errors (`MissingSecretError`, `InvalidKeyUriError`, …) | P1 | Extend beyond bare `TypeError` |
| Token format pre-check (digits, length) | P2 | Fail fast before HMAC |
| Optional `epoch` / `T0` on TOTP | P2 | Parity with otplib |
| Document server-only runtime scope OR spike crypto interface | P1 | Decision gate for Q4 |

#### Docs & demo

| Item | Priority | Notes |
|------|----------|-------|
| `docs/migrate-from-speakeasy.md` | P0 | Speakeasy unmaintained; high-intent traffic |
| `docs/migrate-from-otplib.md` | P1 | Honest API mapping table |
| `docs/secure-2fa-checklist.md` | P0 | Replay, rate limit, encrypt-at-rest (patterns, not code in core) |
| Express + Hono cookbook pages | P1 | Nest already covered via `nestjs-xotp` |
| Expand `xotp.dev` with “full setup flow” tab | P1 | QR + verify + window explanation |

#### Ecosystem

| Item | Priority | Notes |
|------|----------|-------|
| Refresh `nestjs-xotp` README (`toKeyUri` vs deprecated `keyUri`) | P2 | Align with xotp 1.1 |
| GitHub issue templates + “good first issue” labels | P2 | Start community funnel |

**Release target:** `xotp@1.2.0`

---

### Q4 2026 (Oct–Dec) — Runtime expansion (optional path)

**Theme:** Close the biggest competitive gap without bloating default install.

**Decision point (end Q3):** Pick **Path A** (server-only) or **Path B** (multi-runtime).

#### Path A — Server-only (lower effort)

| Item | Notes |
|------|-------|
| Document “Node / Bun / Deno server library” positioning | Lean into zero-deps advantage |
| `@xotp/node` not needed — stay as-is | |
| Benchmark vs otplib node plugin | Marketing content |

#### Path B — Multi-runtime (recommended for growth)

| Item | Priority | Notes |
|------|----------|-------|
| `@xotp/crypto` interface in core | P0 | `hmac`, `randomBytes`, `timingSafeEqual` |
| `@xotp/crypto-node` | P0 | Default; current behavior |
| `@xotp/crypto-noble` | P1 | Browser / edge / isomorphic (~15 KB gzip) |
| Conditional exports or separate entry (`xotp/browser`) | P1 | Keep main package 0-deps on Node |

#### Core (`xotp` → **1.3.x**)

| Item | Priority |
|------|----------|
| Subpath exports (`xotp/totp`, `xotp/uri`, `xotp/secret`) | P2 |
| `URI.parse` strict mode flag | P3 |

#### `@xotp/*` (new repo or monorepo)

| Package | Priority | Scope |
|---------|----------|-------|
| `@xotp/recovery` | P1 | Generate, hash (scrypt/bcrypt), verify backup codes |
| `@xotp/replay` | P2 | Interface + in-memory impl; Redis adapter later |

#### Docs

| Item | Priority |
|------|----------|
| Next.js App Router example (enroll + verify routes) | P1 |
| Cloudflare Workers example (if Path B) | P1 |
| API reference site (TypeDoc → GitHub Pages) | P2 |

**Release targets:** `xotp@1.3.0`, `@xotp/recovery@0.1.0`

---

### Q1 2027 (Jan–Mar) — Ecosystem & v2 prep

**Theme:** Companion packages and migration to v2.

#### Core (`xotp` → **2.0.0**)

Per `AGENTS.md` planned breaking changes:

| Change | Rationale |
|--------|-----------|
| `generateSecret` defaults to `true` | Better enrollment DX |
| Remove deprecated `keyUri()` | Use `toKeyUri()` |
| Remove `ParsedURI` / `ParsedTOTP` / `ParsedHOTP` aliases | Cleanup |
| Migration guide with codemod or search-replace table | Required for major bump |

Optional v2 additions (if ready):

| Item | Notes |
|------|-------|
| Rename `duration` → `period` alias | otplib/otpauth use `period`; keep `duration` deprecated one major |
| Min secret length guardrail (opt-in) | Match otplib safety story |

#### `@xotp/*`

| Package | Priority | Scope |
|---------|----------|-------|
| `@xotp/replay` Redis adapter | P2 | Production replay guard |
| `@xotp/setup` | P2 | Thin helper: `createEnrollment()` → `{ secret, uri, qr? }` wrapping `qrcode` as optional peer dep |
| `@xotp/express` or `@xotp/hono` | P3 | Middleware helpers (verify body field, attach delta) |

#### Docs

| Item | Priority |
|------|----------|
| v2 migration guide | P0 |
| “Replace speakeasy in production” case study | P1 |
| Security page (threat model, what core does *not* do) | P1 |

**Release targets:** `xotp@2.0.0`, `@xotp/setup@0.1.0`

---

### Q2 2027 (Apr–Jun) — Polish & niche expansion

**Theme:** Maturity, optional niches, community.

#### Core (`xotp` → **2.1.x**)

| Item | Priority | Notes |
|------|----------|-------|
| `otpauth-migration://` parser | P3 | Only if targeting import/migration tools |
| Benchmark suite published in CI | P2 | vs otplib node, otpauth |
| Deno JSR publish | P2 | otpauth precedent |
| Consider `xotp/edge` entry (Web Crypto only) | P2 | If Path B shipped |

#### `@xotp/*`

| Package | Priority |
|---------|----------|
| `@xotp/migration` | P3 | Parse Google Authenticator export blobs |
| Framework: Fastify plugin | P3 |
| `nestjs-xotp` v2 aligned with xotp v2 | P1 |

#### Docs & community

| Item | Priority |
|------|----------|
| Contributor guide + `AGENTS.md` public link | P1 |
| Blog post: “Zero-dep TOTP on Node in 2027” | P2 |
| GitHub stars / npm download tracking in README | P3 |
| Evaluate OIDC/WebAuthn docs (“when not to use TOTP”) | P3 | Positioning, not implementation |

**Release targets:** `xotp@2.1.0`, ecosystem patch releases

---

## Package architecture (target state, mid-2027)

```
xotp                          ← zero-dep core (Node default)
├── TOTP, HOTP, Secret, URI
└── optional peer: @xotp/crypto-node | @xotp/crypto-noble

@xotp/crypto-node             ← node:crypto adapter (default)
@xotp/crypto-noble            ← @noble/hashes adapter (browser/edge)

@xotp/recovery                ← backup codes (hash + verify)
@xotp/replay                  ← used-token guard (memory + Redis)
@xotp/setup                   ← enrollment helper (URI + optional QR)

nestjs-xotp                   ← NestJS DI wrapper (existing)
```

**Rules (from `AGENTS.md`, reinforced):**

- Core stays RFC crypto + URI only.
- No DB, sessions, or user management in `xotp`.
- Recovery, replay, QR, and framework glue live in `@xotp/*`.
- Each companion package is independently versioned; core semver stays strict.

---

## Success metrics (12 months)

| Metric | Now (Jun 2026) | Target (Jun 2027) |
|--------|----------------|-------------------|
| npm weekly downloads | ~434 | 5,000+ (realistic with migration docs + speakeasy churn) |
| npm dependents | ~1 | 25+ |
| GitHub stars | ~29 | 150+ |
| Open issues with responses | 0 issues | < 48 h first response |
| Runtime coverage | Node, Bun, Deno | + browser OR clear server-only brand |
| Ecosystem packages | `nestjs-xotp` | +2 (`@xotp/recovery`, `@xotp/replay` or `@xotp/setup`) |

Downloads are intentionally modest targets — otplib/otpauth have a 10-year head start. Focus on **dependents** and **migration capture** rather than beating otpauth on raw downloads.

---

## What we are explicitly not building

| Item | Why |
|------|-----|
| Full 2FA SaaS / dashboard | Different product; competes with Auth0, Clerk, … |
| Authenticator mobile app | Consumer market; not a library problem |
| Steam Guard / proprietary OTP variants | Out of scope unless demand proves large |
| Built-in encrypted secret storage | App-specific; belongs in `@xotp/*` or app code |
| WebAuthn / passkeys in core | Different spec; link in docs only |

---

## Immediate next actions (if starting today)

1. Write `docs/migrate-from-speakeasy.md` and `docs/secure-2fa-checklist.md`.
2. Add `verify()` returning `{ valid, delta }` alongside `validate()`.
3. Decide Path A vs Path B for runtime by end of Q3 2026.
4. Ship `@xotp/recovery` before `@xotp/replay` — higher demand, simpler API.
5. Plan `xotp@2.0.0` breaking changes on a published timeline (announce in README).

---

## References

- [xotp README](../README.md)
- [xotp AGENTS.md](../AGENTS.md)
- [otplib docs](https://otplib.yeojz.dev)
- [otpauth repo](https://github.com/hectorm/otpauth)
- [nestjs-xotp](https://github.com/farshidbeheshti/nestjs-xotp)
- npm stats (Jun 2026): xotp ~434/wk · otplib ~2.6M/wk · otpauth ~1.6M/wk
