# XOTP

`XOTP`(/zɔːtipi/) is a robust One-Time Password (HOTP/TOTP) library for Node.js, Deno and Bun. Ideal for use in Two-Factor Authentication (2FA) / Multi-Factor Authentication (MFA) and is fully compatible with well-known authenticator apps including Google Authenticator and Microsoft Authenticator.

It implements both HOTP - [RFC 4226][rfc-4226] and TOTP - [RFC 6238][rfc-6238],
and is tested against the test vectors provided in their respective RFC specifications.
These datasets can be found in the `tests/data` folder:

- [RFC 4226 Dataset][rfc-4226-dataset]
- [RFC 6238 Dataset][rfc-6238-dataset]

# Install

```
npm i xotp --save
```

# Usage

```
import { Secret, TOTP } from "xotp";
```

As a quick start, you could generate and verify OTPs in two easy steps:

### Getting a Secret

First, you need a secret key with which to generate a OTP.
If you already have a secret key as a string in any [supported encodings](#supported-encodings):

```js
const secret = Secret.from("your Secret Key");
```

Or use the `Secret` constructor function to generate a cryptographically strong 20-byte random key:

```js
const secret = new Secret();
```

See other [secret](#secret-reference) features if you need to generate the secret from a native Buffer type or store the secret in any encoding!

### Generating a OTP token

Then generate a OTP token with the secret you have just got:

```js
const totp = new TOTP(/* options, if any! */);
const token = totp.generate({ secret });
```

You can customize tokens using the optional argument of the `new TOTP()` constructor.
To know all options available for the `TOTP` constructor function and their defaults, see section [TOTP Options](#totp-options).

However, you can aslo call the `generate({secret, ...options})` method with specific option values to use them instead of what you initialized the TOTP instance with.

## OTP Verification

The user has submitted a token that you previously generated using XOTP or one of the authentication apps like Google Authenticator, and now you need to verify that:

```js
const token = "token submitted by user"; // Token sent by user to validate against
const isValidToken = totp.validate({ secret, token });
```

Like almost all `TOTP` and `HOTP` methods, you can pass new option values to the `validate({secret, token, ...options})` method to use them instead of what you initialized the TOTP instance with.

## Calculating Delta of Token

If you want to find the difference between the current time step and the time step in which a given token was generated, use the `compare` method:

```js
const token = "user token";
const delta = totp.compare({ secret, token });
```

It returns `0` if a token is for the current time step and `null` if the token is not found in the serach window, otherwise, returns the differences in window.
You could change search window in options passed to the method and also options passed to the TOTP constructor function, if you want to change the default value. Default value for the window is 1 and it means that it checks one time step before (-1) and also after (1) the current time step (0) to see if the token is generated in one of them.

## Google Authenticator Key URI

```js
const account = "fullname, username or email";
const keyUri = totp.keyUri({ secret, account });
```

The `account` is the name of the user who otp is created for. It's used only to show the user in authenticator apps like google authenticator.
Again, you could use different values for options of ones you previously initialized a TOTP instance with.

> [!TIP]
> You may want to generate and display a QR Code of the generated `keyUri` above, so that could be scanned by authenticator apps like Google Authenticator and user does not have to manually enter the secret.

<a id="reference"><a>

# References

## Secret

<a id="secret-reference"><a>

You use `Secret` to generate and retrieve your secret keys in various encodings, so we're going to take a quick look at some of the its functions.

Use the `Secret` constructor function to generate a secret key of desired size in bytes. It generates a cryptographically strong random key for you.

```js
const secret = new Secret({ size: 64 });
```

The size argument is a number indicating the number of bytes to generate, the default value is 20 bytes.

```js
const secret = new Secret();
// Same as
const secret = new Secret({ size: 20 });
```

If you don't have idea of what size is right for your needs and only know the algorithm you're going to use, call the `for` static method to get an instance of the `Secret` for a specific algorithm of [supported variants](#supported-algorithms).

```js
const secret = Secret.for("sha512");
```

> [!NOTE]
> XOTP uses `sha1` as the default algorithm for generating both `TOTP` and `HOTP` tokens. You could use the `sha1`, If you don't still know what algorithm you will use.

If you already have a secret key in binary, you could use a native `Buffer` object or javascript `ArrayBuffer` to initialize an instance of `Secret`, for example:

```js
// Just to define a dummy buffer of random 42-byte binary.
// you would replace it with your buffer.
const buffer = Buffer.from(Array.from({ length: 42 }, () => Math.round(Math.random())));

const secret = new Secret({ buffer });
```

Or use the `from` static method to retrieve a `Secret` instance from the buffer:

```js
const secret = Secret.from(buffer);
```

You could also use `from` static method to get a `Secret` instance from a string in [different encodings](#supported-encodings).

```js
const secret = Secret.from("LBHVIUBAFBKE6VCQF5EE6VCQFE======", "base32");
```

Almost all applications need to store the secret key to verify the user's token later. To do so, use `toString` method to get the string of the secret in one of the [available encodings](#supported-encodings):

```js
const secretKey = secret.toString("hex");
```

The default encoding for `toString()` is `base32`, because some authenticator apps, including Google Authenticator, use `base32` as the default for the secret key.

> [!NOTE]
> The default encoding for the `from` method is `utf-8` and the default encoding for `toString` is `base32`, so you need to pass the second argument in one of these two functions. That means:
>
> ```js
> const base32SecretKey = secret.toString();
> const secret = secret.from(base32SecretKey, "base32");
> ```
>
> Or vice versa:
>
> ```js
> const utf8SecretKey = secret.toString("utf-8");
> const secret = secret.from(utf8SecretKey);
> ```
>
> We recommend the former!

<a id="totp_options"><a>

## TOTP Options

| Option    | Type     | Default | Description                                                                                                                                                   |
| --------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| algorithm | `string` | "sha1"  | The algorithm used for calculating the HMAC, see [supported algorithms](#supported-algorithms)!                                                               |
| digits    | `number` | 6       | The length of the OTP token.                                                                                                                                  |
| window    | `number` | 1       | Number of window(s) within which validate the token. Try to validate token in the previous and future window if token is not validated in current time        |
| duration  | `number` | 30      | duration (in seconds) a token is valid for.                                                                                                                   |
| issuer    | `string` | "xotp"  | The provider or service with which the token is associated, e.g. Github. Used in the keyuri to show the user in authenticator apps like Google Authenticator. |
| account   | `string` |         | The account with which the token is associated, e.g. the user's email. Used in the keyuri to show the user in authenticator apps like Google Authenticator.   |

> [!TIP]
> You can see that XOTP only gets options that are application-scoped and not user-specific ones, so you need only one instance of `TOTP` or `HOTP` class and reuse that throughout your application.
> This is also why XOTP does not allow the secret key to be included in the options, to avoid the terrible security problems of using a shared secret key.

## HOTP

XOTP also supports HOTP. Use "HOTP" instead of "TOTP" in all the examples above to see HOTP functions in action. Depending on your requirements, you may need to replace the `timestamp` argument with the `counter` if you are not using its functions with default arguments.

<a id="supported_encodings"><a>

## Supported Encodings:

- `base32`
- `base64`
- `base64url`
- `utf8` / `utf-8`
- `utf16le` / `utf-16le` / `ucs2` / `ucs-2`
- `latin1`
- `ascii`
- `binary`
- `hex`

If you need an encoding that is not on this list, let us know via [issues][issues]!

> [!TIP]
> Google Authenticator uses `base32` encoding for the secret key!

<a id="supported_algorithms"><a>

## Supported Algorithms:

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

  If you need an algorithm that is not in these options, please open an [issue][issues] for that!

> [!TIP]
> Google Authenticator only supports `sha1`,`sha256`, `sha512` algorithms.

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
