import { describe, it, expect } from "vitest";
import { getNodeIdFromDevice } from "../../src/data/zwave_js";
import type { DeviceRegistryEntry } from "../../src/data/device/device_registry";

const mockDevice = (identifiers: [string, string][]) =>
  ({ identifiers }) as DeviceRegistryEntry;

describe("getNodeIdFromDevice", () => {
  it("reads the node ID from the identifier", () => {
    expect(
      getNodeIdFromDevice(mockDevice([["zwave_js", "3245146787-25"]]))
    ).toBe(25);
  });

  it("reads the node ID from the extended identifier", () => {
    expect(
      getNodeIdFromDevice(mockDevice([["zwave_js", "3245146787-25-798:5:20"]]))
    ).toBe(25);
  });

  it("returns multi-digit node IDs in full", () => {
    expect(
      getNodeIdFromDevice(mockDevice([["zwave_js", "3245146787-108"]]))
    ).toBe(108);
  });

  it("ignores provisioning entries, whose DSK blocks parse as numbers", () => {
    expect(
      getNodeIdFromDevice(
        mockDevice([
          [
            "zwave_js",
            "provision_50285-00042-09924-30691-15973-33711-04005-03623",
          ],
        ])
      )
    ).toBeUndefined();
  });

  it("ignores identifiers of other integrations", () => {
    expect(
      getNodeIdFromDevice(mockDevice([["mqtt", "3245146787-25"]]))
    ).toBeUndefined();
  });

  it("picks the Z-Wave identifier when a device has several", () => {
    expect(
      getNodeIdFromDevice(
        mockDevice([
          ["matter", "some-other-id"],
          ["zwave_js", "3245146787-14"],
        ])
      )
    ).toBe(14);
  });

  it("returns undefined when there is no node ID", () => {
    expect(getNodeIdFromDevice(mockDevice([]))).toBeUndefined();
    expect(
      getNodeIdFromDevice(mockDevice([["zwave_js", "3245146787"]]))
    ).toBeUndefined();
  });
});
