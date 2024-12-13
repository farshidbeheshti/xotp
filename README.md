# XOTP

It is an One-Time Password (HOTP/TOTP) library, ideal for use in Multi-Factor Authentication (MFA) / Two-Factor Authentication (2FA).

It implements both HOTP - [RFC 4226][rfc-4226] and TOTP - [RFC 6238][rfc-6238],
and are tested against the test vectors provided in their respective RFC specifications.
These datasets can be found in the `tests/data` folder:

- [RFC 4226 Dataset][rfc-4226-dataset]
- [RFC 6238 Dataset][rfc-6238-dataset]

`xotp` is compatible with well-known authenticator apps including Google Authenticator and Microsoft Authenticator.

# Install

`npm install xotp --save`

# Usage

### Generate a time-based OTP token.

`import {Secret, TOTP} from "xotp";`

If your have already a secret key in any supported encoding.

```
const secret = Secret.from("your Secret Key")
```

Or create a secret, if you don't have any!

```
const secret = new Secret(); // a random 32-byte key
```

Generate a token based on secret you've created!

```
const totp = new TOTP(/* options, if any! */);
const token = totp.generate({ secret });
```

You can customize the token by passing an option argument to TOTP consturctor.
to know all options available for totp, see section TOTP Options!

## Validate tokens

```
const token = 'user token';
const isValidated = totp.validate({secret, token})
```

You also could pass more options to the `validate(options)` method to overwrite options when the TOTP instance is initialized!

## Calculating delta of given token

If you want to get difference between the current time step and the time step at which the token was found, use `compare()` method.

```
const token = 'user token';
const isValidated = totp.compare({secret, token})
```

Returns `0` if a token is for the current time step and `null` if the token is not found in the serach window. You could change search window in options passed to the method and also options passed to the TOTP constructor, if you want to change the default value. Default value for the window is 1.

## Convert to Google Authenticator key URI format

```
const account = 'fullname, username or email'
const keyuri = totp.keyuri( {secret, account})
```

The `account` is name of the user who otp is crated for. It's used only to show the user in authenticator apps like google authenticator.
Also you're able to pass more options. As default, options passed to the constructor when initialized a TOTP instance are used.

You may want to generate and display a QR Code of the generated key uri above, so that could be used by authenticator apps like Google Authenticator and user does not have to enter manually the secret.

# Reference

## TOTP Options

| Option    | Type   | Default | Description                                                                                                                                            |
| --------- | ------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| algorithm | string | sha1    | Algorithm used for the HMAC function, see supported algorithms!                                                                                        |
| digits    | number | 6       | length og generated token                                                                                                                              |
| window    | number | 1       | Number of window(s) within which validate the token. Try to validate token in the previous and future window if token is not validated in current time |
| duration  | number | 30      | duration of time (in seconds) for which a token is valid.                                                                                              |
| issuer    | string |         | The provider or service with which the token is associated. Used in the keyuri to show the user in authenticator apps like google authenticator        |

## HOTP

#### xotp also support HOTP. To see HOTP's otions see source code please!

## Supported encodings:

`base32`
`ascii`
`utf8`
`utf-8`
`utf16le`
`utf-16le`
`ucs2`
`ucs-2`
`base64`
`base64url`
`latin1`
`binary`
`hex`

NOTE: Google Authenticator uses base32 on the secret!

## Supported algorithms:

`sha1`
`sha224`
`sha256`
`sha512`
`sha384`
`sha-512/224`
`sha-512/256`
`sha3-224`
`sha3-256`
`sha3-384`
`sha3-512`

NOTE: At the time of writing this library Google Authenticator only supports `sha1`,`sha256`, `sha512` algorithms

## License

`xotp` is [MIT licensed][project-license]

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
