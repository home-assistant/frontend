// Unanchored regex fragments, shared as the single source of truth for both
// the boolean validators below and the HTML `pattern` attribute (the browser
// anchors a pattern as `^(?:…)$`).

// Decimal octet 0-255 without leading zeros.
const DEC_OCTET = "(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])";

const IPV4 = `(?:${DEC_OCTET}\\.){3}${DEC_OCTET}`;

// IPv6 grammar from RFC 3986, section 3.2.2.
const H16 = "[0-9a-fA-F]{1,4}";
const LS32 = `(?:${H16}:${H16}|${IPV4})`;

const IPV6 = `(?:${[
  `(?:${H16}:){6}${LS32}`,
  `::(?:${H16}:){5}${LS32}`,
  `(?:${H16})?::(?:${H16}:){4}${LS32}`,
  `(?:(?:${H16}:){0,1}${H16})?::(?:${H16}:){3}${LS32}`,
  `(?:(?:${H16}:){0,2}${H16})?::(?:${H16}:){2}${LS32}`,
  `(?:(?:${H16}:){0,3}${H16})?::${H16}:${LS32}`,
  `(?:(?:${H16}:){0,4}${H16})?::${LS32}`,
  `(?:(?:${H16}:){0,5}${H16})?::${H16}`,
  `(?:(?:${H16}:){0,6}${H16})?::`,
].join("|")})`;

// CIDR prefix lengths: 0-32 for IPv4, 0-128 for IPv6.
const IPV4_PREFIX = "(?:3[0-2]|[12]?[0-9])";
const IPV6_PREFIX = "(?:12[0-8]|1[01][0-9]|[1-9]?[0-9])";

// IPv4 or IPv6 address.
export const IP_ADDRESS_PATTERN = `${IPV4}|${IPV6}`;

// IPv4/IPv6 address, optionally with a CIDR prefix (network).
export const IP_ADDRESS_OR_NETWORK_PATTERN = `${IPV4}(?:/${IPV4_PREFIX})?|${IPV6}(?:/${IPV6_PREFIX})?`;

const anchored = (pattern: string): RegExp => new RegExp(`^(?:${pattern})$`);

const ipv4Regexp = anchored(IPV4);
const ipv6Regexp = anchored(IPV6);

// IPv4 address, e.g. 192.168.1.10
export const isIPAddress = (input: string): boolean => ipv4Regexp.test(input);

// IPv6 address, e.g. fe80::85d:e82c:9446:7995
export const isIPv6Address = (input: string): boolean => ipv6Regexp.test(input);

// IPv4 or IPv6 address
export const isIPAddressV4OrV6 = (input: string): boolean =>
  isIPAddress(input) || isIPv6Address(input);

// IP network in CIDR notation, e.g. 192.168.1.0/24 or fd00::/8
export const isIPNetwork = (input: string): boolean => {
  const parts = input.split("/");
  if (parts.length !== 2) {
    return false;
  }
  const [address, prefix] = parts;
  if (!/^\d{1,3}$/.test(prefix)) {
    return false;
  }
  const prefixLength = Number(prefix);
  if (isIPAddress(address)) {
    return prefixLength >= 0 && prefixLength <= 32;
  }
  if (isIPv6Address(address)) {
    return prefixLength >= 0 && prefixLength <= 128;
  }
  return false;
};
