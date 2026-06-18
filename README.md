<p align="center" style="margin-bottom:0">
  <img src="https://github.com/user-attachments/assets/8ef372d6-3cd7-4202-88b2-519f45f67160" width="200"  />
</p>
<h1 align="center">XOTP</h1>

[![npm version](https://img.shields.io/npm/v/xotp)](https://www.npmjs.com/package/xotp)
[![CI](https://github.com/farshidbeheshti/xotp/actions/workflows/ci.yml/badge.svg)](https://github.com/farshidbeheshti/xotp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/github/license/farshidbeheshti/xotp)](https://github.com/farshidbeheshti/xotp/blob/master/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C9?logo=TypeScript&logoColor=white)](https://github.com/farshidbeheshti/xotp)
[![demo](https://img.shields.io/badge/demo-xotp.dev-026dfd)](https://xotp.dev)

[![npm downloads](https://img.shields.io/npm/dm/xotp)](https://www.npmjs.com/package/xotp)
[![runtimes](https://img.shields.io/badge/runtimes-Node%20%7C%20Bun%20%7C%20Deno-blue)](#installation)

## Description

`XOTP`(/zɔːtipi/) is a robust One-Time Password (HOTP/TOTP) library for Node.js, Bun, and Deno environments with zero dependencies. It's perfect for implementing two-factor authentication (2FA) / multifactor authentication (MFA) systems and is fully compatible with Google Authenticator and other well-known authentication apps and devices.

XOTP implements both [RFC 4226][rfc-4226] (HOTP) and [RFC 6238][rfc-6238] (TOTP) and has been fully tested against the test vectors provided in their respective RFC specifications: [RFC 4226 Dataset][rfc-4226-dataset] and [RFC 6238 Dataset][rfc-6238-dataset].

You can try XOTP with the demo available at [xotp.dev][demo]!

## Table of contents

- [Installation](#installation)
- [What's new in 1.1.0](#whats-new-in-110)
- [Quick start](#quick-start)
- [Enrollment (bound instance)](#enrollment-bound-instance)
- [Usage](#usage)
- [Key URI & QR Code Generation](#key-uri--qr-code-generation)
- [References](#references)
  - [Secret](#secret)
  - [TOTP Options](#totp-options)
  - [HOTP](#hotp)
  - [Supported Encodings](#supported-encodings)
  - [Supported Algorithms](#supported-algorithms)

## Installation

```bash
npm i xotp
bun add xotp
deno add npm:xotp
```

## What's new in 1.1.0

- **Bound instance secret** — pass `{ secret }` to the constructor, or `{ generateSecret: true }` / `TOTP.create()` to generate one at construction.
- **Key URI import/export** — `TOTP.fromKeyUri()` / `HOTP.fromKeyUri()` and `toKeyUri()` (replaces deprecated `keyUri()`).
- **Low-level URI helpers** — `URI.parse()` and `URI.format()` for `otpauth://` strings and `KeyUri` objects.

`generateSecret` defaults to `false` so existing server validators keep passing `secret` per call. For enrollment, use `TOTP.create()` or `{ generateSecret: true }`. In v2, `generateSecret` will default to `true`; pin `{ generateSecret: false }` if you rely on the current default.

## Quick start

Pick the pattern that matches your use case:

### Server-side validation

Use a shared `TOTP` instance without a bound secret. Pass each user's secret on every call (API login, multi-tenant apps):

```typescript
import { TOTP } from "xotp";

const totp = new TOTP();
totp.validate({ secret: userSecret, token });
```

See [Usage](#usage) below for secret handling, generation, and token delta.

### Enrollment

Generate a secret and key URI for one user (2FA setup, QR onboarding):

```typescript
import { TOTP } from "xotp";

const totp = TOTP.create({ account: "user@example.com", issuer: "MyApp" });
const uri = totp.toKeyUri(); // otpauth://... — encode as QR for the user
```

Persist `totp.secret` before discarding the instance. See [Enrollment (bound instance)](#enrollment-bound-instance) and [Key URI & QR Code Generation](#key-uri--qr-code-generation) for more detail.

## Enrollment (bound instance)

For new 2FA setup (CLI, client, or single-user flows), bind a secret to the instance:

```typescript
import { TOTP } from "xotp";

const totp = TOTP.create({ account: "user@example.com", issuer: "MyApp" });
// or: new TOTP({ generateSecret: true, account: "user@example.com", issuer: "MyApp" });

const token = totp.generate();
const uri = totp.toKeyUri();
```

Persist `totp.secret` before discarding the instance.

> [!TIP]
> For **server-side validation** of many users, use a shared engine without a bound secret and pass each user's secret per call: `totp.validate({ secret: userSecret, token })`. Do not reuse one bound instance across users.

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

If you need to generate a secret from a native `Buffer` type, or store it in a particular encoding, see the [Secret reference section](#secret-reference).

### Generate an OTP Token

Next, generate a OTP token with the secret you've created:

```typescript
const totp = new TOTP(/* options, if any! */);
const token = totp.generate({ secret });
```

You can customize token generation by passing optional arguments to the `new TOTP()` constructor. All available options and their default values are detailed in the [TOTP Options](#totp-options) section. While the `new TOTP()` constructor accepts options, you can override these by passing specific values to the `generate({secret, ...options})` method for individual token requests.

### Verify an OTP token

When a user submits a token—either one you generated with XOTP or one from an authentication app like Google Authenticator—you'll need to verify it:

```typescript
const isValidToken = totp.validate({ secret, token: "<USER_SUBMITTED_TOKEN>" });
```

Similar to all `TOTP` and `HOTP` methods, you can pass new option values to the `validate({secret, token, ...options})` method to override those set during the TOTP instance initialization.

### Calculating Token Delta

To determine the difference between the current time step and the time step when a given token was generated, use the `compare` method:

```typescript
const delta = totp.compare({ secret, token: "<USER_SUBMITTED_TOKEN>" });
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
const token = totp.generate();
const isValid = totp.validate({ token: "<USER_SUBMITTED_TOKEN>" });

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

Public API: `TOTP`, `HOTP`, `Secret`, `URI`, and types (`KeyUri`, `TOTPKeyUri`, `HOTPKeyUri`, `Algorithm`, `Encoding`, option types). Full signatures ship in `dist/index.d.ts`.

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

If you already have a secret key in binary, you can initialize a `Secret` instance using a native `Buffer` object or a JavaScript `ArrayBuffer`. For example:

```typescript
// This defines a dummy buffer of random 42-byte binary.
// You would replace it with your buffer.
const buffer = Buffer.from(
  Array.from({ length: 42 }, () => Math.round(Math.random())),
);

const secret = new Secret({ data: buffer });
```

Alternatively, use the `from` static method to retrieve a `Secret` instance from a buffer:

```typescript
const secret = Secret.from(buffer);
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

const token = hotp.generate({ secret, counter: 0 });
const isValid = hotp.validate({ secret, token, counter: 0 });
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

- `sha1`
- `sha224`
- `sha256`
- `sha512`
- `sha384`
- `sha-512/224`
- `sha-512/256`
- `sha3-224`
- `sha3-256`
- `sha3-384`
- `sha3-512`

If you need an algorithm that is not listed, please open an [issue][issues] for it!

> [!TIP]
> Google Authenticator ignores the algorithm type and defaults to `sha1`.

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
