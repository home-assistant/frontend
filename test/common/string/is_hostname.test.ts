import { describe, expect, it } from "vitest";
import { HOSTNAME_PATTERN } from "../../../src/common/string/is_hostname";
import { IP_ADDRESS_PATTERN } from "../../../src/common/string/is_ip_address";

const HOSTNAMES = [
  "localhost",
  "homeassistant.lan",
  "home-assistant.local",
  "3com.com",
  "sub.domain.example.com",
  "a".repeat(63),
];

const INVALID = [
  "",
  "foo bar",
  "foo_bar",
  "-foo.lan",
  "foo-.lan",
  "foo..lan",
  "héllo.lan",
  "host:8123",
  "http://host",
  "a".repeat(64),
  // All-numeric final label: a mistyped IP address, not a hostname.
  "123",
  "foo.123",
  "300.1.1.1",
  "999.999.999.999",
];

// The browser anchors a `pattern` attribute as `^(?:…)$` and compiles it with
// the `v` flag. A pattern that fails to compile under `v` is silently ignored,
// disabling validation entirely, so compile it exactly the same way here.
const patternRegexp = (pattern: string): RegExp =>
  new RegExp(`^(?:${pattern})$`, "v");

describe("HOSTNAME_PATTERN", () => {
  it("compiles as an HTML pattern attribute", () => {
    expect(() => patternRegexp(HOSTNAME_PATTERN)).not.toThrow();
  });
  it("accepts hostnames", () => {
    const regexp = patternRegexp(HOSTNAME_PATTERN);
    for (const value of HOSTNAMES) {
      expect(regexp.test(value), value).toBe(true);
    }
  });
  it("rejects malformed hostnames", () => {
    const regexp = patternRegexp(HOSTNAME_PATTERN);
    for (const value of INVALID) {
      expect(regexp.test(value), value).toBe(false);
    }
  });
});

// How ha-config-http-form validates its listen addresses.
describe("IP address or hostname pattern", () => {
  const composed = `${IP_ADDRESS_PATTERN}|${HOSTNAME_PATTERN}`;

  it("compiles as an HTML pattern attribute", () => {
    expect(() => patternRegexp(composed)).not.toThrow();
  });
  it("accepts hostnames and IP addresses", () => {
    const regexp = patternRegexp(composed);
    for (const value of [
      ...HOSTNAMES,
      "192.168.1.10",
      "0.0.0.0",
      "255.255.255.255",
      "fe80::1",
      "::1",
    ]) {
      expect(regexp.test(value), value).toBe(true);
    }
  });
  it("rejects malformed addresses", () => {
    const regexp = patternRegexp(composed);
    for (const value of INVALID) {
      expect(regexp.test(value), value).toBe(false);
    }
  });
});
