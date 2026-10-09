<p align="center" style="margin-bottom:0">
  <img src="https://github.com/user-attachments/assets/8ef372d6-3cd7-4202-88b2-519f45f67160" width="180" alt="XOTP Logo" />
</p>

<h1 align="center">XOTP</h1>

<p align="center">
  <strong>Universal, Zero-Dependency One-Time Password (HOTP/TOTP) Library</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/xotp"><img src="https://img.shields.io/npm/v/xotp" alt="npm version" /></a>
  <a href="https://github.com/farshidbeheshti/xotp/actions/workflows/ci.yml"><img src="https://github.com/farshidbeheshti/xotp/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://codecov.io/gh/farshidbeheshti/xotp"><img src="https://codecov.io/gh/farshidbeheshti/xotp/graph/badge.svg" alt="codecov" /></a>
  <a href="https://github.com/farshidbeheshti/xotp/blob/master/LICENSE"><img src="https://img.shields.io/github/license/farshidbeheshti/xotp" alt="License: MIT" /></a>
  <a href="https://github.com/farshidbeheshti/xotp"><img src="https://img.shields.io/badge/TypeScript-3178C9?logo=TypeScript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://xotp.dev"><img src="https://img.shields.io/badge/demo-xotp.dev-026dfd" alt="demo" /></a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/xotp"><img src="https://img.shields.io/npm/dm/xotp" alt="npm downloads" /></a>
  <a href="#installation"><img src="https://img.shields.io/badge/runtimes-Node%20%7C%20Bun%20%7C%20Deno%20%7C%20Browser%20%7C%20Edge-blue" alt="runtimes" /></a>
</p>

<p align="center">
  <a href="https://xotp.dev"><img src="https://img.shields.io/badge/Try_demo-→_xotp.dev-026dfd?style=for-the-badge" alt="Try demo at xotp.dev" /></a>
  &nbsp;
  <a href="#quick-start"><img src="https://img.shields.io/badge/Quick_start-→-3178C6?style=for-the-badge" alt="Quick start" /></a>
</p>

> [!IMPORTANT]
> **v2 is async.** Token methods (`generate`, `validate`, `compare`, `equals`) now return Promises because they use the standard Web Crypto API under the hood. `await` them. See [Migrating from v1](#migrating-from-v1).

## Description

`XOTP` (/zɔːtipi/) is a zero-dependency HOTP/TOTP library that runs anywhere the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) is available — Node.js 20+, Bun, Deno, browsers, and edge runtimes. Use it for 2FA/MFA with Google Authenticator and other standard authenticator apps.

<details open>
<summary><strong>Table of contents</strong></summary>

<br>

**Getting started**

- [Installation](#installation)
- [Try it](#try-it)
- [Quick start](#quick-start)

**Guides**

- [Enrollment](#enrollment-bound-instance)
- [Usage](#usage)
- [Key URI & QR codes](#key-uri--qr-code-generation)

**API reference**

- [Secret](#secret)
- [TOTP options](#totp-options)
- [HOTP](#hotp)
- [Encodings](#supported-encodings)
- [Algorithms](#supported-algorithms)

**Other**

- [Migrating from v1](#migrating-from-v1)
- [Contributing](#contributing--feature-requests)
- [License](#license)

</details>

## Installation

```bash
npm i xotp
bun add xotp
deno add npm:xotp
```

Works with both `import` (ESM) and `require()` (CommonJS):

```javascript
import { TOTP } from "xotp";
// or: const { TOTP } = require("xotp");
```

XOTP ships a tree-shakeable ES module, has no dependencies, and uses only Web Standard APIs (`crypto.subtle`, `Uint8Array`, `TextEncoder`) — so it adds no Node polyfills to your browser or edge bundle. No build configuration is required.

XOTP implements [RFC 4226][rfc-4226] (HOTP) and [RFC 6238][rfc-6238] (TOTP) and is tested against their official vectors: [RFC 4226 Dataset][rfc-4226-dataset] and [RFC 6238 Dataset][rfc-6238-dataset].

## Try it

```javascript
import { Secret, TOTP } from "xotp";

const secret = Secret.from("JBSWY3DPEHPK3PXP", "base32");
const totp = new TOTP();

const token = await totp.generate({ secret });
const ok = await totp.validate({ secret, token });

console.log({ token, ok }); // { token: '...', ok: true }
```

No install? Try the live demo at [xotp.dev][demo].

## Quick start

### Server-side validation

Shared `TOTP` engine; pass each user's secret per call (API login, multi-tenant apps):

```typescript
import { Secret, TOTP } from "xotp";

const secret = Secret.from("JBSWY3DPEHPK3PXP", "base32");
const totp = new TOTP();

const token = await totp.generate({ secret });
await totp.validate({ secret, token }); // true
```

See [Usage](#usage) for secret storage, options, and token delta.

### Enrollment

Generate a secret and `otpauth://` URI for one user (2FA setup, QR onboarding):

```typescript
import { TOTP } from "xotp";

const totp = TOTP.create({ account: "user@example.com", issuer: "MyApp" });

console.log(totp.toKeyUri());
console.log(totp.secret!.toString()); // base32 — persist before discarding the instance
```

See [Enrollment (bound instance)](#enrollment-bound-instance) and [Key URI & QR Code Generation](#key-uri--qr-code-generation).

## Enrollment (bound instance)

`TOTP.create({ account, issuer })` binds a generated secret to the instance — use it for enrollment flows. Equivalent:

```typescript
new TOTP({ generateSecret: true, account: "user@example.com", issuer: "MyApp" });
```

After `generate()` or `toKeyUri()`, persist `totp.secret` (e.g. `totp.secret!.toString()` for base32 storage).

> [!TIP]
> For **server-side validation** of many users, use a shared engine without a bound secret and pass each user's secret per call: `await totp.validate({ secret: userSecret, token })`. Do not reuse one bound instance across users.

## Usage

```typescript
import { Secret, TOTP } from "xotp";
```

The following walks through the **server-side validation** flow in more detail:

### Get a Secret

First, you need a secret key with which to generate or verify a OTP token.

If you already have a secret key as a string in any [supported encoding](#supported-encodings), you can use it like this:

```typescript
const secret = Secret.from("<YOUR_SECRET_KEY>");
```

Otherwise, use the `Secret` constructor to generate a cryptographically strong 20-byte random key:

```typescript
const secret = new Secret();
```

If you need to generate a secret from raw bytes (`Uint8Array`), or store it in a particular encoding, see the [Secret reference section](#secret-reference).

### Generate an OTP Token

Next, generate a OTP token with the secret you've created:

```typescript
const totp = new TOTP(/* options, if any! */);
const token = await totp.generate({ secret });
```

You can customize token generation by passing optional arguments to the `new TOTP()` constructor. All available options and their default values are detailed in the [TOTP Options](#totp-options) section. While the `new TOTP()` constructor accepts options, you can override these by passing specific values to the `generate({secret, ...options})` method for individual token requests.

### Verify an OTP token

When a user submits a token—either one you generated with XOTP or one from an authentication app like Google Authenticator—you'll need to verify it:

```typescript
const isValidToken = await totp.validate({ secret, token: "<USER_SUBMITTED_TOKEN>" });
```

Similar to all `TOTP` and `HOTP` methods, you can pass new option values to the `validate({secret, token, ...options})` method to override those set during the TOTP instance initialization.

### Calculating Token Delta

To determine the difference between the current time step and the time step when a given token was generated, use the `compare` method:

```typescript
const delta = await totp.compare({ secret, token: "<USER_SUBMITTED_TOKEN>" });
```

This method returns `0` if the token is for the current time step, or `null` if the token is not found within the search window. Otherwise, it returns the difference in the window.

You can adjust the search window through the options passed to the method, or by modifying the default value in the options passed to the `TOTP` constructor. The default window value is `1`, meaning it checks one time step before and one time step after the current time step to see if the token was generated in any of those steps.

## Key URI & QR Code Generation

### Export (generate a key URI)

`toKeyUri()` returns an `otpauth://` URI **string**. For a structured object, use `URI.parse()` (see Import below).

```typescript
const uri = totp.toKeyUri({
  secret,
  account: "<fullname, username or email>",
  issuer: "MyApp", // default is "xotp" if omitted
});
```

The `account` and `issuer` fields are display labels shown in authenticator apps like Google Authenticator.
You can override options per call even when they differ from the `TOTP` instance defaults.

### Import (parse an `otpauth://` URI)

Import from a scanned QR code or pasted key URI:

```typescript
import { URI, TOTP, HOTP } from "xotp";

const totp = TOTP.fromKeyUri(
  "otpauth://totp/Issuer:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Issuer",
);
const token = await totp.generate();
const isValid = await totp.validate({ token: "<USER_SUBMITTED_TOKEN>" });

// Low-level parse / format
const scannedUri =
  "otpauth://totp/Issuer:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Issuer";
const keyUri = URI.parse(scannedUri);
const uriAgain = URI.format(keyUri);
const otp =
  keyUri.type === "totp"
    ? TOTP.fromKeyUri(scannedUri)
    : HOTP.fromKeyUri(scannedUri);

// Or build a Key URI without parsing
const uri = URI.format({
  type: "totp",
  secret,
  account: "user@example.com",
  issuer: "MyApp",
});
```

`HOTP.fromKeyUri(uri)` works the same for `otpauth://hotp/...` URIs. The imported instance binds `secret` from the URI so you do not pass `secret` on each call.

### Generating a QR Code

The `toKeyUri` method returns a standard `otpauth://` URI string, which you can encode into a QR code for authenticator apps. XOTP stays zero-dependency — pair it with a QR library such as [`qrcode`](https://www.npmjs.com/package/qrcode):

```bash
npm install qrcode
npm install @types/qrcode  # TypeScript
```

```typescript
import QRCode from "qrcode";
import { TOTP } from "xotp";

const totp = TOTP.create({
  account: "user@example.com",
  issuer: "MyApp",
});

const uri = totp.toKeyUri();
const qrCodeDataURL = await QRCode.toDataURL(uri); // web <img src="...">
await QRCode.toFile("qrcode.png", uri); // or save to disk
```

#### Complete setup flow

```typescript
import { TOTP } from "xotp";
import QRCode from "qrcode";

async function setup2FA(userEmail: string) {
  const totp = TOTP.create({ account: userEmail, issuer: "MyApp" });
  const uri = totp.toKeyUri();
  const qrCodeDataURL = await QRCode.toDataURL(uri);
  const secretKey = totp.secret!.toString(); // base32 — store securely

  return { secretKey, qrCodeDataURL };
}
```

> [!CAUTION]
> Always store the secret key securely and never expose it to the client-side after the initial setup.

<details>
<summary>More QR options (<code>qr-image</code>, in-browser display)</summary>

**`qr-image`**

```bash
npm install qr-image
npm install @types/qr-image  # TypeScript
```

```typescript
import qr from "qr-image";
import fs from "fs";

const uri = totp.toKeyUri();
qr.image(uri, { type: "png" }).pipe(fs.createWriteStream("qrcode.png"));
const qrSvg = qr.imageSync(uri, { type: "svg" });
```

**In-browser display**

```typescript
const qrCodeDataURL = await QRCode.toDataURL(uri);
const img = document.createElement("img");
img.src = qrCodeDataURL;
img.alt = "QR Code for 2FA Setup";
document.body.appendChild(img);
```

</details>

<a id="reference"></a>

## References

Public API: `TOTP`, `HOTP`, `Secret`, `URI`, and types (`KeyUri`, `TOTPKeyUri`, `HOTPKeyUri`, `Algorithm`, `Encoding`, option types). Full type declarations ship with the package.

### Secret

<a id="secret-reference"></a>

The `Secret` class allows you to generate and retrieve your secret keys in various encodings. Let's explore some of its key functions:

Use the `Secret` constructor to generate a cryptographically strong random key of a desired size in bytes.

```typescript
const secret = new Secret({ size: 64 });
```

The default size is `20` bytes.

```typescript
const secret = new Secret();
// Equivalent to:
const secret = new Secret({ size: 20 });
```

If you're unsure about the appropriate size and only know the algorithm you plan to use, call the `for` static method to get a Secret instance tailored for a specific [supported algorithm](#supported-algorithms).

```typescript
const secret = Secret.for("sha512");
```

> [!NOTE]
> XOTP uses `sha1` as the default algorithm for generating both `TOTP` and `HOTP` tokens.

If you already have a secret key in binary, you can initialize a `Secret` instance from a `Uint8Array`. (A Node.js `Buffer` works too, since it is a `Uint8Array`.) For example:

```typescript
// This defines a dummy 42-byte random key.
// You would replace it with your own bytes.
const bytes = crypto.getRandomValues(new Uint8Array(42));

const secret = new Secret({ data: bytes });
```

Alternatively, use the `from` static method to retrieve a `Secret` instance from a `Uint8Array`:

```typescript
const secret = Secret.from(bytes);
```

You can also use `from` static method to get a `Secret` instance from a string in [various encodings](#supported-encodings).

```typescript
const secret = Secret.from("LBHVIUBAFBKE6VCQF5EE6VCQFE======", "base32");
```

Almost all applications need to store the secret key to generate and verify the user's token later. To do this, use the `toString` method to get the secret key in one of the [available encodings](#supported-encodings):

```typescript
const secretKey = secret.toString("hex");
```

The default encoding for `toString()` is `base32` because most authentication apps, including Google Authenticator, use `base32` as the default encoding for the secret key.

> [!NOTE]
> The default encoding for the `from` method is `utf-8`, while the default encoding for `toString` is `base32`. Therefore, you need to pass the second argument in one of these two functions. This means:
>
> ```typescript
> const base32SecretKey = secret.toString();
> const clonedSecret = Secret.from(base32SecretKey, "base32");
> ```
>
> Or vice versa:
>
> ```typescript
> const utf8SecretKey = secret.toString("utf-8");
> const clonedSecret = Secret.from(utf8SecretKey);
> ```
>
> We recommend the former!

<a id="totp_options"></a>

### TOTP Options

| Option    | Type     | Default | Description                                                                                                                                                                         |
| --------- | -------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| algorithm | `string` | "sha1"  | The algorithm used for calculating the HMAC, see [supported algorithms](#supported-algorithms)!                                                                                     |
| digits    | `number` | 6       | The length of the OTP token.                                                                                                                                                        |
| window    | `number` | 1       | The number of window(s) within which to validate the token. If the token isn't validated in the current time step, XOTP attempts to validate it in the previous and future windows. |
| duration  | `number` | 30      | The duration (in seconds) for which a token is valid.                                                                                                                               |
| issuer    | `string` | "xotp"  | The provider or service associated with the token (e.g., "Github"). This is just a display field to display the issuer's name in authenticator apps like Google Authenticator.      |
| account         | `string`  |         | The account associated with the token (e.g., the user's email). This is also a display field to display the account name in authenticator apps like Google Authenticator.           |
| secret          | `Secret`  |         | Binds a secret to the instance. When set, `generate`, `validate`, and related methods can omit `secret` in each call.                                                                 |
| generateSecret  | `boolean` | `false` | Set to `true` when enrolling new 2FA (no `secret` yet) so one random secret is created at construction — use `TOTP.create()` or persist `instance.secret`. Keep `false` (default) for server validators that pass each user's `secret` per call. |

### HOTP

XOTP also supports [RFC 4226][rfc-4226] HOTP (counter-based OTP). Unlike TOTP, HOTP uses a `counter` instead of a time step — pass `counter` to `generate` and `validate`.

```typescript
import { HOTP, Secret } from "xotp";

const hotp = new HOTP();
const secret = Secret.from("<YOUR_SECRET_KEY>", "base32");

const token = await hotp.generate({ secret, counter: 0 });
const isValid = await hotp.validate({ secret, token, counter: 0 });
```

Enrollment and key URIs work the same as TOTP: `HOTP.create()`, `HOTP.fromKeyUri()`, and `hotp.toKeyUri()`. HOTP key URIs require a `counter` query parameter.

When a bound `HOTP` instance generates without an explicit `counter`, the instance counter increments automatically.

#### HOTP Options

| Option         | Type      | Default | Description                                                                                                                                                                         |
| -------------- | --------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| algorithm      | `string`  | "sha1"  | HMAC algorithm; see [supported algorithms](#supported-algorithms).                                                                                                                  |
| digits         | `number`  | 6       | Token length (6 or 8).                                                                                                                                                              |
| window         | `number`  | 1       | Counter values before/after the expected counter to accept during validation.                                                                                                       |
| counter        | `number`  | 0       | Current counter value. Required in HOTP key URIs.                                                                                                                                   |
| issuer         | `string`  | "xotp"  | Display label for the service name in authenticator apps.                                                                                                                           |
| account        | `string`  |         | Display label for the user (e.g. email).                                                                                                                                            |
| secret         | `Secret`  |         | Binds a secret to the instance so methods can omit `secret` per call.                                                                                                               |
| generateSecret | `boolean` | `false` | Set to `true` for enrollment, or use `HOTP.create()`. Keep `false` for shared server validators.                                                                                  |

<a id="supported_encodings"></a>

### Supported Encodings:

- `base32`
- `base64`
- `base64url`
- `utf8` / `utf-8`
- `utf16le` / `utf-16le` / `ucs2` / `ucs-2`
- `latin1`
- `ascii`
- `binary`
- `hex`

If you require an encoding not listed here, please let us know by opening an [issue][issues]!

> [!TIP]
> Google Authenticator uses `base32` encoding for the secret key!

<a id="supported_algorithms"></a>

### Supported Algorithms:

Token generation/validation uses the Web Crypto API, which supports HMAC with:

- `sha1` (default)
- `sha256`
- `sha384`
- `sha512`

These are the only algorithms used by real-world authenticator apps and the RFC test vectors. Passing any other algorithm to `generate`/`validate` throws a clear error.

> [!TIP]
> Google Authenticator ignores the algorithm type and defaults to `sha1`.

If you need an algorithm that is not listed, please open an [issue][issues] for it!

## Migrating from v1

v2 makes XOTP universal (browser + edge) by switching from Node's `crypto` module to the Web Crypto API. This brings a few breaking changes:

- **Token methods are async.** `await` `generate`, `validate`, `compare`, and `equals` on both `TOTP` and `HOTP`. `Secret` construction, `toString`, `toKeyUri`, and `URI` parsing stay synchronous.

  ```diff
  - const token = totp.generate({ secret });
  - const ok = totp.validate({ secret, token });
  + const token = await totp.generate({ secret });
  + const ok = await totp.validate({ secret, token });
  ```

- **Secrets use `Uint8Array` instead of `Buffer`.** `Secret.from(bytes)` and `new Secret({ data })` accept a `Uint8Array`; `secret.buffer` returns a `Uint8Array`. A Node `Buffer` still works anywhere a `Uint8Array` is expected.
- **Algorithms are limited to `sha1`, `sha256`, `sha384`, `sha512`** — the set supported by Web Crypto HMAC (and the only ones used by authenticator apps).
- **Runtime requirement:** Node.js **20+** (for global `crypto`), or any browser/edge runtime with the Web Crypto API. Bun and Deno are supported.

## Contributing & Feature Requests

XOTP thrives on community input! Got an idea that could make OTP handling even better?

- [Open an issue](https://github.com/farshidbeheshti/xotp/issues) with your feature suggestion/request and we **will** provide feedback lightning-fast.

Let's build the best OTP library together!

## License

`XOTP` is [MIT licensed][project-license]

<!-- External Links -->

[rfc-3548]: http://tools.ietf.org/html/rfc3548
[rfc-4226-dataset]: https://github.com/farshidbeheshti/xotp/blob/master/tests/data/rfc4226.ts
[rfc-4226-wiki]: http://en.wikipedia.org/wiki/HMAC-based_One-time_Password_Algorithm
[rfc-4226]: http://tools.ietf.org/html/rfc4226
[rfc-4648]: https://tools.ietf.org/html/rfc4648
[rfc-6238-dataset]: https://github.com/farshidbeheshti/xotp/blob/master/tests/data/rfc6238.ts
[rfc-6238-wiki]: http://en.wikipedia.org/wiki/Time-based_One-time_Password_Algorithm
[rfc-6238]: http://tools.ietf.org/html/rfc6238
[project-license]: https://github.com/farshidbeheshti/xotp/blob/master/LICENSE
[issues]: https://github.com/farshidbeheshti/xotp/issues
[demo]: https://xotp.dev
