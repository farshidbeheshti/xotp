/*
Test vectors provided in the spec, see Appendix B of RFC#6238 (TOTP):
https://datatracker.ietf.org/doc/html/rfc6238#appendix-B
+-------------+--------------+------------------+----------+--------+
  |  Time (sec) |   UTC Time   | Value of T (hex) |   TOTP   |  Mode  |
  +-------------+--------------+------------------+----------+--------+
  |      59     |  1970-01-01  | 0000000000000001 | 94287082 |  sha1  |
  |             |   00:00:59   |                  |          |        |
  |      59     |  1970-01-01  | 0000000000000001 | 46119246 | sha256 |
  |             |   00:00:59   |                  |          |        |
  |      59     |  1970-01-01  | 0000000000000001 | 90693936 | sha512 |
  |             |   00:00:59   |                  |          |        |
  |  1111111109 |  2005-03-18  | 00000000023523EC | 07081804 |  sha1  |
  |             |   01:58:29   |                  |          |        |
  |  1111111109 |  2005-03-18  | 00000000023523EC | 68084774 | sha256 |
  |             |   01:58:29   |                  |          |        |
  |  1111111109 |  2005-03-18  | 00000000023523EC | 25091201 | sha512 |
  |             |   01:58:29   |                  |          |        |
  |  1111111111 |  2005-03-18  | 00000000023523ED | 14050471 |  sha1  |
  |             |   01:58:31   |                  |          |        |
  |  1111111111 |  2005-03-18  | 00000000023523ED | 67062674 | sha256 |
  |             |   01:58:31   |                  |          |        |
  |  1111111111 |  2005-03-18  | 00000000023523ED | 99943326 | sha512 |
  |             |   01:58:31   |                  |          |        |
  |  1234567890 |  2009-02-13  | 000000000273EF07 | 89005924 |  sha1  |
  |             |   23:31:30   |                  |          |        |
  |  1234567890 |  2009-02-13  | 000000000273EF07 | 91819424 | sha256 |
  |             |   23:31:30   |                  |          |        |
  |  1234567890 |  2009-02-13  | 000000000273EF07 | 93441116 | sha512 |
  |             |   23:31:30   |                  |          |        |
  |  2000000000 |  2033-05-18  | 0000000003F940AA | 69279037 |  sha1  |
  |             |   03:33:20   |                  |          |        |
  |  2000000000 |  2033-05-18  | 0000000003F940AA | 90698825 | sha256 |
  |             |   03:33:20   |                  |          |        |
  |  2000000000 |  2033-05-18  | 0000000003F940AA | 38618901 | sha512 |
  |             |   03:33:20   |                  |          |        |
  | 20000000000 |  2603-10-11  | 0000000027BC86AA | 65353130 |  sha1  |
  |             |   11:33:20   |                  |          |        |
  | 20000000000 |  2603-10-11  | 0000000027BC86AA | 77737706 | sha256 |
  |             |   11:33:20   |                  |          |        |
  | 20000000000 |  2603-10-11  | 0000000027BC86AA | 47863826 | sha512 |
  |             |   11:33:20   |                  |          |        |
  +-------------+--------------+------------------+----------+--------+
*/

// There was three different secrets
export const secret = {
  sha1: "12345678901234567890",
  sha256: "12345678901234567890123456789012",
  sha512: "1234567890123456789012345678901234567890123456789012345678901234",
};

// Time Step X = 30
export const duration = 30;

export const data: {
  timestamp: number; // Time in sec
  utc: string; // UTC time
  steps: number; // The number of time steps since the Unix epoch in hex. calculated by utc / timeSte
  totp: string; // TOTP token
  mode: "sha1" | "sha256" | "sha512";
}[] = [
  {
    timestamp: 59, // Time in sec
    utc: "1970-01-01 000:00:59", // UTC time
    steps: 0x0000000000000001, // The number of time steps since the Unix epoch in hex. calculated by utc / timeSte
    totp: "94287082", // TOTP token
    mode: "sha1", // The hashing algorithm
  },
  {
    timestamp: 59, // Time in sec
    utc: "1970-01-01 000:00:59", // UTC time
    steps: 0x0000000000000001, // The number of time steps since the Unix epoch in hex. calculated by utc / timeSte
    totp: "46119246", // TOTP token
    mode: "sha256", // The hashing algorithm
  },
  {
    timestamp: 59, // Time in sec
    utc: "1970-01-01 000:00:59", // UTC time
    steps: 0x0000000000000001, // The number of time steps since the Unix epoch in hex. calculated by utc / timeSte
    totp: "90693936", // TOTP token
    mode: "sha512", // The hashing algorithm
  },

  {
    timestamp: 1111111109, // Time in sec
    utc: "2005-03-18 01:58:29", // UTC time
    steps: 0x00000000023523ec, // The number of time steps since the Unix epoch in hex. calculated by utc / timeSte
    totp: "07081804", // TOTP token
    mode: "sha1", // The hashing algorithm
  },
  {
    timestamp: 1111111109, // Time in sec
    utc: "2005-03-18 01:58:29", // UTC time
    steps: 0x00000000023523ec, // The number of time steps since the Unix epoch in hex. calculated by utc / timeSte
    totp: "68084774", // TOTP token
    mode: "sha256", // The hashing algorithm
  },
  {
    timestamp: 1111111109, // Time in sec
    utc: "2005-03-18 01:58:29", // UTC time
    steps: 0x00000000023523ec, // The number of time steps since the Unix epoch in hex. calculated by utc / timeSte
    totp: "25091201", // TOTP token
    mode: "sha512", // The hashing algorithm
  },

  {
    timestamp: 1111111111, // Time in sec
    utc: "2005-03-18 01:58:31", // UTC time
    steps: 0x00000000023523ed, // The number of time steps since the Unix epoch in hex. calculated by utc / timeSte
    totp: "14050471", // TOTP token
    mode: "sha1", // The hashing algorithm
  },
  {
    timestamp: 1111111111, // Time in sec
    utc: "2005-03-18 01:58:31", // UTC time
    steps: 0x00000000023523ed, // The number of time steps since the Unix epoch in hex. calculated by utc / timeSte
    totp: "67062674", // TOTP token
    mode: "sha256", // The hashing algorithm
  },
  {
    timestamp: 1111111111, // Time in sec
    utc: "2005-03-18 01:58:31", // UTC time
    steps: 0x00000000023523ed, // The number of time steps since the Unix epoch in hex. calculated by utc / timeSte
    totp: "99943326", // TOTP token
    mode: "sha512", // The hashing algorithm
  },

  {
    timestamp: 1234567890, // Time in sec
    utc: "2009-02-13 23:31:30", // UTC time
    steps: 0x000000000273ef07, // The number of time steps since the Unix epoch in hex. calculated by utc / timeSte
    totp: "89005924", // TOTP token
    mode: "sha1", // The hashing algorithm
  },
  {
    timestamp: 1234567890, // Time in sec
    utc: "2009-02-13 23:31:30", // UTC time
    steps: 0x000000000273ef07, // The number of time steps since the Unix epoch in hex. calculated by utc / timeSte
    totp: "91819424", // TOTP token
    mode: "sha256", // The hashing algorithm
  },
  {
    timestamp: 1234567890, // Time in sec
    utc: "2009-02-13 23:31:30", // UTC time
    steps: 0x000000000273ef07, // The number of time steps since the Unix epoch in hex. calculated by utc / timeSte
    totp: "93441116", // TOTP token
    mode: "sha512", // The hashing algorithm
  },

  ///
  {
    timestamp: 2000000000, // Time in sec
    utc: "2033-05-18 03:33:20", // UTC time
    steps: 0x0000000003f940aa, // The number of time steps since the Unix epoch in hex. calculated by utc / timeSte
    totp: "69279037", // TOTP token
    mode: "sha1", // The hashing algorithm
  },
  {
    timestamp: 2000000000, // Time in sec
    utc: "2033-05-18 03:33:20", // UTC time
    steps: 0x0000000003f940aa, // The number of time steps since the Unix epoch in hex. calculated by utc / timeSte
    totp: "90698825", // TOTP token
    mode: "sha256", // The hashing algorithm
  },
  {
    timestamp: 2000000000, // Time in sec
    utc: "2033-05-18 03:33:20", // UTC time
    steps: 0x0000000003f940aa, // The number of time steps since the Unix epoch in hex. calculated by utc / timeSte
    totp: "38618901", // TOTP token
    mode: "sha512", // The hashing algorithm
  },

  ///
  {
    timestamp: 20000000000, // Time in sec
    utc: "2603-10-11 11:33:20", // UTC time
    steps: 0x0000000027bc86aa, // The number of time steps since the Unix epoch in hex. calculated by utc / timeSte
    totp: "65353130", // TOTP token
    mode: "sha1", // The hashing algorithm
  },
  {
    timestamp: 20000000000, // Time in sec
    utc: "2603-10-11 11:33:20", // UTC time
    steps: 0x0000000027bc86aa, // The number of time steps since the Unix epoch in hex. calculated by utc / timeSte
    totp: "77737706", // TOTP token
    mode: "sha256", // The hashing algorithm
  },
  {
    timestamp: 20000000000, // Time in sec
    utc: "2603-10-11 11:33:20", // UTC time
    steps: 0x0000000027bc86aa, // The number of time steps since the Unix epoch in hex. calculated by utc / timeSte
    totp: "47863826", // TOTP token
    mode: "sha512", // The hashing algorithm
  },
];
