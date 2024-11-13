import { HOTP } from "../src/hotp";

describe("HOTP with RFC #4226 input/output data sets ", () => {
  test.each([
    {
      count: 0,
      hmacSha1Result: "cc93cf18508d94934c64b65d8ba7667fb7cde4b0",
      hotp: 755224,
    },
    {
      count: 1,
      hmacSha1Result: "75a48a19d4cbe100644e8ac1397eea747a2d33ab",
      hotp: 287082,
    },
    {
      count: 2,
      hmacSha1Result: "0bacb7fa082fef30782211938bc1c5e70416ff44",
      hotp: 359152,
    },
    {
      count: 3,
      hmacSha1Result: "66c28227d03a2d5529262ff016a1e6ef76557ece",
      hotp: 969429,
    },
    {
      count: 4,
      hmacSha1Result: "a904c900a64b35909874b33e61c5938a8e15ed1c",
      hotp: 338314,
    },
    {
      count: 5,
      hmacSha1Result: "a37e783d7b7233c083d4f62926c7a25f238d0316",
      hotp: 254676,
    },
    {
      count: 6,
      hmacSha1Result: "bc9cd28561042c83f219324d3c607256c03272ae",
      hotp: 287922,
    },
    {
      count: 7,
      hmacSha1Result: "a4fb960c0bc06e1eabb804e5b397cdc4b45596fa",
      hotp: 162583,
    },
    {
      count: 8,
      hmacSha1Result: "1b3c89f65e6c9e883012052823443f048b4332db",
      hotp: 399871,
    },
    {
      count: 9,
      hmacSha1Result: "1637409809a679dc698207310c8c7fc07290d9e5",
      hotp: 520489,
    },
  ])(
    "HOTP - It expects token: $hotp and HMAC-SHA-1(count, secret): 0x$hmacSha1Result for count: $count",
    ({ count, hotp: expected }) => {
      const hotp = new HOTP().generate({
        secretKey: "12345678901234567890",
        counter: count,
      });
      expect(hotp).toBe(expected);
    },
  );
});
