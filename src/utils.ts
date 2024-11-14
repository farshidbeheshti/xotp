export const padStart = (str = "", length = str.length, padString = "") => {
  return padString.repeat(Math.max(length, str.length) - str.length) + str;
};
