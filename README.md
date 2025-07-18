<p align="center" style="margin-bottom:0">
  <img src="https://github.com/user-attachments/assets/8ef372d6-3cd7-4202-88b2-519f45f67160" width="200"  />
</p>
<h1 align="center">XOTP</h1>

[![Github Release](https://img.shields.io/github/v/release/farshidbeheshti/xotp)](https://www.npmjs.com/package/xotp)
[![NPM Downloads](https://img.shields.io/npm/d18m/xotp)](https://www.npmjs.com/package/xotp)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C9?logo=TypeScript&logoColor=white)](https://github.com/farshidbeheshti/xotp)

## Description

`XOTP`(/zɔːtipi/) is a robust One-Time Password (HOTP/TOTP) library for Node.js, Bun, and Deno environments with zero dependencies. It's perfect for implementing two-factor authentication (2FA) / multifactor authentication (MFA) systems and is fully compatible with Google Authenticator and other well-known authentication apps and devices.

XOTP implements both [RFC 4226][rfc-4226] (HOTP) and [RFC 6238][rfc-6238] (TOTP) and has been fully tested against the test vectors provided in their respective RFC specifications: [RFC 4226 Dataset][rfc-4226-dataset] and [RFC 6238 Dataset][rfc-6238-dataset].

You can try XOTP with the demo available at [xotp.dev][demo]!

## Installation

```
npm i xotp
```

## Usage

```typescript
import { Secret, TOTP } from "xotp";
```

To quickly get started, you can generate or verify OTP tokens in two straightforward steps:

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

## Google Authenticator Key URI

```typescript
const keyUri = totp.keyUri({
  secret,
  account: "<fullname, username or email>",
});
```

The `account` is the name of the user for whom the OTP is created. It is just a display field used to show the user in authentication apps like google authenticator.
You can use different values for options than those with which you initially configured a `TOTP` instance.

> [!TIP]
> You may want to generate and display a QR Code of the generated `keyUri` to allow authentication apps like Google Authenticator to scan it, eliminating the need for the user to manually enter the secret key.

<a id="reference"><a>

## References

### Secret

<a id="secret-reference"><a>

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

If you're unsure about the appropriate size and only know the algorithm you plan to use, call the for static method to get a Secret instance tailored for a specific [supported algorithm](#supported-algorithms).

```typescript
const secret = Secret.for("sha512");
```

> [!NOTE]
> XOTP uses `sha1` as the default algorithm for generating both `TOTP` and `HOTP` tokens.

If you already have a secret key in binary, you can initialize a `Secret` instance using a native Buffer object or a JavaScript `ArrayBuffer`. For example:

```typescript
// This defines a dummy buffer of random 42-byte binary.
// You would replace it with your buffer.
const buffer = Buffer.from(
  Array.from({ length: 42 }, () => Math.round(Math.random())),
);

const secret = new Secret({ buffer });
```

Alternatively, use the `from` static method to retrieve a `Secret` instance from a buffer:

```typescript
const secret = Secret.from(buffer);
```

You can also use `from` static method to get a `Secret` instance from a string in [ various encodings](#supported-encodings).

```typescript
const secret = Secret.from("LBHVIUBAFBKE6VCQF5EE6VCQFE======", "base32");
```

Almost all applications need to store the secret key to verify the user's token later. To do this, use the `toString` method to get the secret key in one of the [available encodings](#supported-encodings):

```typescript
const secretKey = secret.toString("hex");
```

The default encoding for `toString()` is `base32` because most authemtication apps, including Google Authenticator, use `base32` as the default encoding for the secret key.

> [!NOTE]
> The default encoding for the `from` method is `utf-8`, while the default encoding for `toString` is `base32`,Therefore, you need to pass the second argument in one of these two functions. This means:
>
> ```typescript
> const base32SecretKey = secret.toString();
> const clonedSecret = secret.from(base32SecretKey, "base32");
> ```
>
> Or vice versa:
>
> ```typescript
> const utf8SecretKey = secret.toString("utf-8");
> const clonedSecret = secret.from(utf8SecretKey);
> ```
>
> We recommend the former!

<a id="totp_options"><a>

### TOTP Options

| Option    | Type     | Default | Description                                                                                                                                                                         |
| --------- | -------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| algorithm | `string` | "sha1"  | The algorithm used for calculating the HMAC, see [supported algorithms](#supported-algorithms)!                                                                                     |
| digits    | `number` | 6       | The length of the OTP token.                                                                                                                                                        |
| window    | `number` | 1       | The number of window(s) within which to validate the token. If the token isn't validated in the current time step, XOTP attempts to validate it in the previous and future windows. |
| duration  | `number` | 30      | The duration (in seconds) for which a token is valid.                                                                                                                               |
| issuer    | `string` | "xotp"  | The provider or service associated with the token (e.g., "Github"). This is just a display field to display the issuer's name in authenticator apps like Google Authenticator.      |
| account   | `string` |         | The account associated with the token (e.g., the user's email). This is also a display field to display the account name in authenticator apps like Google Authenticator.           |

> [!TIP]
> XOTP accepts options that are **application-scoped** rather than user-specific. This means you typically only need a single instance of the `TOTP` or `HOTP` class, which you can reuse throughout your application.
> That's why XOTP does not allow the secret key to be included in the options, to avoid the terrible security problems of using a shared secret key.

### HOTP

XOTP also supports HOTP. To use HOTP functions, simply replace "TOTP" with "HOTP" in the examples provided above. Depending on your requirements, you may need to replace the `timestamp` argument with the `counter` if you are not using its functions with default arguments.

<a id="supported_encodings"><a>

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

<a id="supported_algorithms"><a>

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
> Google Authenticator ignores the algorithm type and and defaults to `sha1`.

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
