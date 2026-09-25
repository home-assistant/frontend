import { describe, expect, it } from "vitest";
import {
  IP_ADDRESS_OR_NETWORK_PATTERN,
  IP_ADDRESS_PATTERN,
  isIPAddress,
  isIPAddressV4OrV6,
  isIPNetwork,
  isIPv6Address,
} from "../../../src/common/string/is_ip_address";

describe("isIPAddress (IPv4)", () => {
  it("accepts valid IPv4 addresses", () => {
    expect(isIPAddress("192.168.1.10")).toBe(true);
    expect(isIPAddress("0.0.0.0")).toBe(true);
    expect(isIPAddress("255.255.255.255")).toBe(true);
  });
  it("rejects invalid IPv4 addresses", () => {
    expect(isIPAddress("256.1.1.1")).toBe(false);
    expect(isIPAddress("192.168.1")).toBe(false);
    expect(isIPAddress("192.168.1.10/24")).toBe(false);
    expect(isIPAddress("fe80::1")).toBe(false);
    expect(isIPAddress("")).toBe(false);
  });
});

describe("isIPv6Address", () => {
  it("accepts valid IPv6 addresses", () => {
    expect(isIPv6Address("fe80::85d:e82c:9446:7995")).toBe(true);
    expect(isIPv6Address("::1")).toBe(true);
    expect(isIPv6Address("1050:0000:0000:0000:0005:0600:300c:326b")).toBe(true);
    expect(isIPv6Address("::ffff:192.168.1.1")).toBe(true);
  });
  it("rejects invalid IPv6 addresses", () => {
    expect(isIPv6Address("192.168.1.10")).toBe(false);
    expect(isIPv6Address("fe80::85d::7995")).toBe(false);
    expect(isIPv6Address("gggg::1")).toBe(false);
    expect(isIPv6Address("")).toBe(false);
  });
});

describe("isIPAddressV4OrV6", () => {
  it("accepts both families", () => {
    expect(isIPAddressV4OrV6("192.168.1.10")).toBe(true);
    expect(isIPAddressV4OrV6("fe80::1")).toBe(true);
  });
  it("rejects networks and garbage", () => {
    expect(isIPAddressV4OrV6("192.168.1.0/24")).toBe(false);
    expect(isIPAddressV4OrV6("not-an-ip")).toBe(false);
  });
});

describe("isIPNetwork (CIDR)", () => {
  it("accepts valid networks", () => {
    expect(isIPNetwork("192.168.1.0/24")).toBe(true);
    expect(isIPNetwork("10.0.0.0/8")).toBe(true);
    expect(isIPNetwork("172.16.0.0/12")).toBe(true);
    expect(isIPNetwork("0.0.0.0/0")).toBe(true);
    expect(isIPNetwork("fd00::/8")).toBe(true);
    expect(isIPNetwork("fe80::/128")).toBe(true);
  });
  it("rejects invalid networks", () => {
    // Prefix out of range — the reported production error.
    expect(isIPNetwork("172.30.33.0/24444444")).toBe(false);
    expect(isIPNetwork("192.168.1.0/33")).toBe(false);
    expect(isIPNetwork("fd00::/129")).toBe(false);
    expect(isIPNetwork("192.168.1.0")).toBe(false);
    expect(isIPNetwork("192.168.1.0/24/24")).toBe(false);
    expect(isIPNetwork("not-a-network/24")).toBe(false);
  });
});

// The HTML `pattern` attribute is anchored by the browser as `^(?:…)$`.
const matchesPattern = (pattern: string, value: string): boolean =>
  new RegExp(`^(?:${pattern})$`).test(value);

describe("IP_ADDRESS_PATTERN", () => {
  it("accepts IPv4 and IPv6 addresses", () => {
    expect(matchesPattern(IP_ADDRESS_PATTERN, "192.168.1.10")).toBe(true);
    expect(matchesPattern(IP_ADDRESS_PATTERN, "fe80::1")).toBe(true);
  });
  it("rejects networks and garbage", () => {
    expect(matchesPattern(IP_ADDRESS_PATTERN, "192.168.1.0/24")).toBe(false);
    expect(matchesPattern(IP_ADDRESS_PATTERN, "not-an-ip")).toBe(false);
    expect(matchesPattern(IP_ADDRESS_PATTERN, "256.1.1.1")).toBe(false);
  });
});

describe("IP_ADDRESS_OR_NETWORK_PATTERN", () => {
  it("accepts addresses and networks", () => {
    expect(matchesPattern(IP_ADDRESS_OR_NETWORK_PATTERN, "192.168.1.10")).toBe(
      true
    );
    expect(
      matchesPattern(IP_ADDRESS_OR_NETWORK_PATTERN, "192.168.1.0/24")
    ).toBe(true);
    expect(matchesPattern(IP_ADDRESS_OR_NETWORK_PATTERN, "fd00::/8")).toBe(
      true
    );
  });
  it("rejects out-of-range prefixes and garbage", () => {
    // The reported production error.
    expect(
      matchesPattern(IP_ADDRESS_OR_NETWORK_PATTERN, "172.30.33.0/24444444")
    ).toBe(false);
    expect(
      matchesPattern(IP_ADDRESS_OR_NETWORK_PATTERN, "192.168.1.0/33")
    ).toBe(false);
    expect(
      matchesPattern(IP_ADDRESS_OR_NETWORK_PATTERN, "1.1.1.1/233444")
    ).toBe(false);
    expect(matchesPattern(IP_ADDRESS_OR_NETWORK_PATTERN, "not-an-ip")).toBe(
      false
    );
  });
});
