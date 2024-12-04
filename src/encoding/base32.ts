const formats = {
  RFC4648: {
    alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
    padding: "=",
  },
  RFC3548: { alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567", padding: "=" },
  RFC4648_HEX: { alphabet: "0123456789ABCDEFGHIJKLMNOPQRSTUV", padding: "=" },
  CROCKFORD: { alphabet: "0123456789ABCDEFGHJKMNPQRSTVWXYZ", padding: "" },
};

export const base32Encode = (
  arr: Uint8Array,
  format: "RFC4648" | "RFC4648_HEX" = "RFC4648",
): string => {
  const { padding, alphabet } = formats[format];
  let bytes = 0b0;
  let left = 0;
  let base32 = "";

  for (let i = 0; i < arr.byteLength; i++) {
    bytes = (bytes << 8) | arr[i];
    left += 8;
    for (let j = 1; j <= left / 5; j++) {
      const charAt = (bytes >>> (left - j * 5)) & 0x1f;
      base32 += alphabet[charAt];
    }
    left = left % 5;
  }
  if (left) base32 += alphabet[(bytes << (5 - left)) & 0x1f];
  if (base32.length % 8 != 0) base32 += padding.repeat(8 - (base32.length % 8));

  return base32;
};

export const base32Decode = (
  encodedBase32: string,
  format: "RFC4648" | "RFC4648_HEX" = "RFC4648",
): Uint8Array => {
  const { padding, alphabet } = formats[format];
  const removedPad = encodedBase32.replace(new RegExp(`${padding}+$`), "");
  const bytesLen = ((removedPad.length * 5) / 8) | 0;
  const bytes = new Uint8Array(bytesLen);
  let binary = 0;
  let left = 0;
  let index = 0;

  for (let i = 0; i < removedPad.length; i++) {
    const charNum = alphabet.search(removedPad[i]);
    binary = (binary << 5) | charNum;
    left += 5;
    if (left >= 8) {
      bytes[index++] = (binary >>> (left - 8)) & 0xff;
      left -= 8;
    }
  }
  return bytes;
};
