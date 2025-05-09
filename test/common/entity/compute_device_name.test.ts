import { describe, expect, it, vi } from "vitest";
import {
  computeDeviceName,
  computeDeviceNameDisplay,
  fallbackDeviceName,
  getDuplicatedDeviceNames,
} from "../../../src/common/entity/compute_device_name";

describe("computeDeviceName", () => {
  it("returns name_by_user if present", () => {
    expect(
      computeDeviceName({
        name_by_user: "User Name",
        name: "Device Name",
      } as any)
    ).toBe("User Name");
  });

  it("returns name if name_by_user is not present", () => {
    expect(computeDeviceName({ name: "Device Name" } as any)).toBe(
      "Device Name"
    );
    expect(
      computeDeviceName({ name_by_user: "", name: "Device Name" } as any)
    ).toBe("Device Name");
  });

  it("returns undefined if neither name_by_user nor name is present", () => {
    expect(computeDeviceName({} as any)).toBeUndefined();
  });

  it("trims whitespace", () => {
    expect(computeDeviceName({ name_by_user: "  User Name  " } as any)).toBe(
      "User Name"
    );
  });
});

describe("computeDeviceNameDisplay", () => {
  const hass = {
    localize: vi.fn((key, params) => {
      if (key === "ui.panel.config.devices.unnamed_device") {
        return `Unnamed (${params?.type})`;
      }
      if (key.startsWith("ui.panel.config.devices.type.")) {
        return key.split(".").pop();
      }
      return key;
    }),
    states: {
      "light.test": {
        entity_id: "light.test",
        attributes: { friendly_name: "Test Light" },
      },
    },
  } as any;

  it("returns device name if present", () => {
    expect(computeDeviceNameDisplay({ name: "Device" } as any, hass)).toBe(
      "Device"
    );
  });

  it("returns fallback name from entities if device name not present", () => {
    const entities: any = [{ entity_id: "light.test" }];
    expect(computeDeviceNameDisplay({} as any, hass, entities)).toBe(
      "Test Light"
    );
  });

  it("returns localized unnamed device if no name or entities", () => {
    expect(
      computeDeviceNameDisplay({ entry_type: "router" } as any, hass)
    ).toBe("Unnamed (router)");
  });
});

describe("fallbackDeviceName", () => {
  const hass = {
    states: {
      "sensor.temp": {
        entity_id: "sensor.temp",
        attributes: { friendly_name: "Temperature" },
      },
      "light.lamp": {
        entity_id: "light.lamp",
        attributes: { friendly_name: "Lamp" },
      },
    },
  } as any;

  it("returns the first entity's friendly name", () => {
    const entities: any = [
      { entity_id: "sensor.temp" },
      { entity_id: "light.lamp" },
    ];
    expect(fallbackDeviceName(hass, entities)).toBe("Temperature");
  });

  it("returns undefined if no entities have state", () => {
    expect(
      fallbackDeviceName({ states: {} } as any, [{ entity_id: "none" } as any])
    ).toBeUndefined();
  });

  it("works with string entity ids", () => {
    expect(fallbackDeviceName(hass, ["light.lamp"])).toBe("Lamp");
  });
});

describe("getDuplicatedDeviceNames", () => {
  it("returns a set of duplicated device names", () => {
    const devices: any = {
      a: { name: "Device" },
      b: { name: "Device" },
      c: { name: "Unique" },
    };
    const result = getDuplicatedDeviceNames(devices);
    expect(result.has("Device")).toBe(true);
    expect(result.has("Unique")).toBe(false);
  });

  it("returns empty set if no duplicates", () => {
    const devices = {
      a: { name: "A" },
      b: { name: "B" },
    };
    expect(getDuplicatedDeviceNames(devices as any).size).toBe(0);
  });
});
