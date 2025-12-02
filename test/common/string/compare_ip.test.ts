import { assert, describe, it } from "vitest";
import { ipCompare } from "../../../src/common/string/compare";
import { isIPAddress } from "../../../src/common/string/is_ip_address";

describe("compareIpAdresses", () => {
  const ipAddresses: string[] = [
    "192.168.1.1",
    "10.0.0.1",
    "fe80::85d:e82c:9446:7995",
    "192.168.0.1",
    "fe80::85d:e82c:9446:7994",
    "::ffff:192.168.1.1",
    "1050:0000:0000:0000:0005:0600:300c:326b",
  ];
  const expected: string[] = [
    "10.0.0.1",
    "192.168.0.1",
    "192.168.1.1",
    "::ffff:192.168.1.1",
    "1050:0000:0000:0000:0005:0600:300c:326b",
    "fe80::85d:e82c:9446:7994",
    "fe80::85d:e82c:9446:7995",
  ];

  const sorted = [...ipAddresses].sort(ipCompare);

  it("Detects ipv4 addresses", () => {
    assert.isTrue(isIPAddress("192.168.0.1"));
  });

  it("Compares ipv4 and ipv6 addresses", () => {
    assert.deepEqual(sorted, expected);
  });
});
