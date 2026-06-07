export type ParsedKeyUriLabel = {
  account: string;
  issuer?: string;
};

export function parseKeyUriLabel(
  pathname: string,
  issuerParam?: string | null,
): ParsedKeyUriLabel {
  const label = decodeURIComponent(pathname.replace(/^\//, ""));
  const issuerFromQuery = issuerParam?.trim() || undefined;

  const colon = label.indexOf(":");

  if (colon >= 0) {
    const issuerFromLabel = label.slice(0, colon);
    // Optional spaces may precede the account name (Key URI Format spec).
    const account = label.slice(colon + 1).trimStart();
    if (
      issuerFromQuery &&
      issuerFromLabel &&
      issuerFromQuery !== issuerFromLabel
    ) {
      throw new TypeError(
        "Issuer parameter and label prefix must be equal when both are present",
      );
    }
    const issuer = issuerFromQuery || issuerFromLabel || undefined;
    return { account, issuer };
  }

  return {
    account: label,
    issuer: issuerFromQuery,
  };
}
