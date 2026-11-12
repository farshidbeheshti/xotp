export function uintEncode(num: number): Uint8Array {
  const bytes = new Uint8Array(8).fill(0);
  for (let i = 7; i >= 0; i--) {
    bytes[i] = num & 0xff;

    // Shift 8 bits to the right and rounds down the result!
    // NOTE: Right shift (>>) operator only works on 32-bit
    // integers, but `num` could be an 8-byte integer!
    num = (num / 2 ** 8) | 0;
  }
  return bytes;
}

export function uintDecode(bytes: Uint8Array): number {
  let num = 0;
  for (let i = 0; i < bytes.length; i++) {
    num = num * 2 ** 8 + bytes[i];
  }
  return num;
}

export function uint64Encode(num: number | bigint): Uint8Array {
  let int64Num = BigInt(num);
  const bytes = new Uint8Array(8);
  const dataView = new DataView(bytes.buffer);
  dataView.setBigInt64(0, int64Num);
  return bytes;
}

export function uint64Decode(bytes: Uint8Array): bigint {
  const dataView = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  );
  return dataView.getBigUint64(0);
}
