import { Encoding } from "../types/index.js";
import { base32Decode, base32Encode } from "./base32.js";

const textEncoder = new TextEncoder();
const utf8Decoder = new TextDecoder("utf-8");

function latin1ToBytes(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i) & 0xff;
  }
  return bytes;
}

function bytesToLatin1(bytes: Uint8Array): string {
  let str = "";
  for (let i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return str;
}

function utf16leToBytes(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < str.length; i++) {
    view.setUint16(i * 2, str.charCodeAt(i), true);
  }
  return bytes;
}

function bytesToUtf16le(bytes: Uint8Array): string {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let str = "";
  for (let i = 0; i + 1 < bytes.byteLength; i += 2) {
    str += String.fromCharCode(view.getUint16(i, true));
  }
  return str;
}

function hexToBytes(hex: string): Uint8Array {
  const normalized = hex.length % 2 === 0 ? hex : hex.slice(0, -1);
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(normalized.substr(i * 2, 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

function base64ToBytes(base64: string, url = false): Uint8Array {
  let normalized = base64;
  if (url) normalized = normalized.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized);
  return latin1ToBytes(binary);
}

function bytesToBase64(bytes: Uint8Array, url = false): string {
  const base64 = btoa(bytesToLatin1(bytes));
  if (!url) return base64;
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Encodes a string into bytes using the given {@link Encoding}. */
export function encodeBytes(
  data: string,
  encoding: Encoding = "utf-8",
): Uint8Array {
  switch (encoding) {
    case "utf8":
    case "utf-8":
      return textEncoder.encode(data);
    case "ascii":
    case "latin1":
    case "binary":
      return latin1ToBytes(data);
    case "utf16le":
    case "utf-16le":
    case "ucs2":
    case "ucs-2":
      return utf16leToBytes(data);
    case "base64":
      return base64ToBytes(data);
    case "base64url":
      return base64ToBytes(data, true);
    case "hex":
      return hexToBytes(data);
    case "base32":
      return base32Decode(data);
    default:
      throw new TypeError(`Unsupported encoding: ${encoding}`);
  }
}

/** Decodes bytes into a string using the given {@link Encoding}. */
export function decodeBytes(
  bytes: Uint8Array,
  encoding: Encoding = "utf-8",
): string {
  switch (encoding) {
    case "utf8":
    case "utf-8":
      return utf8Decoder.decode(bytes);
    case "ascii":
    case "latin1":
    case "binary":
      return bytesToLatin1(bytes);
    case "utf16le":
    case "utf-16le":
    case "ucs2":
    case "ucs-2":
      return bytesToUtf16le(bytes);
    case "base64":
      return bytesToBase64(bytes);
    case "base64url":
      return bytesToBase64(bytes, true);
    case "hex":
      return bytesToHex(bytes);
    case "base32":
      return base32Encode(bytes);
    default:
      throw new TypeError(`Unsupported encoding: ${encoding}`);
  }
}
