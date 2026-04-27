import { describe, expect, it } from "vitest";

import { parseAddress } from "../../src/data/hassio/network";

describe("parseAddress", () => {
  it("parses a valid CIDR address", () => {
    expect(parseAddress("192.168.1.2/24")).toEqual({
      ip: "192.168.1.2",
      mask: "255.255.255.0",
      prefix: "24",
    });
  });

  it("returns empty fields for missing addresses", () => {
    expect(parseAddress("")).toEqual({
      ip: "",
      mask: null,
      prefix: null,
    });
    expect(parseAddress(null)).toEqual({
      ip: "",
      mask: null,
      prefix: null,
    });
    expect(parseAddress(undefined)).toEqual({
      ip: "",
      mask: null,
      prefix: null,
    });
  });
});
