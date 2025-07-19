import { describe, expect, it, vi } from "vitest";
import { computeDeviceNameDisplay } from "../../../../src/common/entity/compute_device_name";
import { caseInsensitiveStringCompare } from "../../../../src/common/string/compare";
import type { DeviceRegistryEntry } from "../../../../src/data/device_registry";

describe("Device sorting in ha-config-entry-row", () => {
  const mockHass = {
    localize: vi.fn((key, params) => {
      if (key === "ui.panel.config.devices.unnamed_device") {
        return `Unnamed (${params?.type})`;
      }
      if (key.startsWith("ui.panel.config.devices.type.")) {
        return key.split(".").pop();
      }
      return key;
    }),
    locale: { language: "en" },
  } as any;

  const createMockDevice = (
    name: string,
    entryId: string,
    entryType?: string
  ): DeviceRegistryEntry => ({
    id: `device_${name.toLowerCase().replace(/\s+/g, "_")}`,
    name,
    name_by_user: null,
    config_entries: [entryId],
    entry_type: entryType as any,
    manufacturer: "Test Manufacturer",
    model: "Test Model",
    sw_version: "1.0.0",
    hw_version: null,
    identifiers: [],
    connections: [],
    via_device_id: null,
    area_id: null,
    disabled_by: null,
    configuration_url: null,
    serial_number: null,
    suggested_area: null,
    labels: [],
    config_entries_subentries: {},
  });

  it("should sort devices alphabetically by name", () => {
    const devices = [
      createMockDevice("Z2mHueTap02", "test_entry"),
      createMockDevice("Z2mHueTap01", "test_entry"),
      createMockDevice("Z2mIkeaSwitch01", "test_entry"),
      createMockDevice("Z2mHueMotion02", "test_entry"),
      createMockDevice("Z2mHueColour02", "test_entry"),
      createMockDevice("Z2mHueColour01", "test_entry"),
      createMockDevice("Kitchen Motion", "test_entry"),
      createMockDevice("Landing Dimmer", "test_entry"),
      createMockDevice("Z2mHueWhite01", "test_entry"),
      createMockDevice("Andrew Office Dimmer", "test_entry"),
    ];

    // Sort using the same logic as our implementation
    const sortedDevices = devices.sort((a, b) =>
      caseInsensitiveStringCompare(
        computeDeviceNameDisplay(a, mockHass),
        computeDeviceNameDisplay(b, mockHass),
        mockHass.locale.language
      )
    );

    const expectedOrder = [
      "Andrew Office Dimmer",
      "Kitchen Motion",
      "Landing Dimmer",
      "Z2mHueColour01",
      "Z2mHueColour02",
      "Z2mHueMotion02",
      "Z2mHueTap01",
      "Z2mHueTap02",
      "Z2mHueWhite01",
      "Z2mIkeaSwitch01",
    ];

    const actualOrder = sortedDevices.map((device) =>
      computeDeviceNameDisplay(device, mockHass)
    );
    expect(actualOrder).toEqual(expectedOrder);
  });

  it("should handle devices without names properly", () => {
    const devices = [
      createMockDevice("Device A", "test_entry"),
      { ...createMockDevice("", "test_entry"), name: null } as any,
      createMockDevice("Device B", "test_entry"),
    ];

    const sortedDevices = devices.sort((a, b) =>
      caseInsensitiveStringCompare(
        computeDeviceNameDisplay(a, mockHass),
        computeDeviceNameDisplay(b, mockHass),
        mockHass.locale.language
      )
    );

    // Unnamed device should be sorted by its localized name
    const actualOrder = sortedDevices.map((device) =>
      computeDeviceNameDisplay(device, mockHass)
    );
    expect(actualOrder[0]).toBe("Device A");
    expect(actualOrder[1]).toBe("Device B");
    expect(actualOrder[2]).toBe("Unnamed (device)");
  });

  it("should sort services alphabetically too", () => {
    const services = [
      createMockDevice("Service Z", "test_entry", "service"),
      createMockDevice("Service A", "test_entry", "service"),
      createMockDevice("Service M", "test_entry", "service"),
    ];

    const sortedServices = services.sort((a, b) =>
      caseInsensitiveStringCompare(
        computeDeviceNameDisplay(a, mockHass),
        computeDeviceNameDisplay(b, mockHass),
        mockHass.locale.language
      )
    );

    const actualOrder = sortedServices.map((service) =>
      computeDeviceNameDisplay(service, mockHass)
    );
    expect(actualOrder).toEqual(["Service A", "Service M", "Service Z"]);
  });
});
