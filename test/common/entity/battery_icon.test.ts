import type { HassEntity } from "home-assistant-js-websocket";
import { describe, it, expect } from "vitest";
import {
  batteryIcon,
  batteryLevelIcon,
} from "../../../src/common/entity/battery_icon";

describe("batteryIcon", () => {
  it("should return correct icon for battery level", () => {
    const stateObj: HassEntity = { state: "50" } as HassEntity;
    expect(batteryIcon(stateObj)).toBe("mdi:battery-50");
  });

  it("should return correct icon for battery level with state", () => {
    const stateObj: HassEntity = { state: "50" } as HassEntity;
    expect(batteryIcon(stateObj, "20")).toBe("mdi:battery-20");
  });
});

describe("batteryLevelIcon", () => {
  it("should return correct icon for battery level", () => {
    expect(batteryLevelIcon(50)).toBe("mdi:battery-50");
  });

  it("should return correct icon for charging battery", () => {
    expect(batteryLevelIcon(50, true)).toBe("mdi:battery-charging-50");
  });

  it("should return charging outline icon for charging battery with 9%", () => {
    expect(batteryLevelIcon(9, true)).toBe("mdi:battery-charging-outline");
  });

  it("should return alert icon for low battery", () => {
    expect(batteryLevelIcon(5)).toBe("mdi:battery-alert-variant-outline");
  });

  it("should return unknown icon for invalid battery level", () => {
    expect(batteryLevelIcon("invalid")).toBe("mdi:battery-unknown");
  });

  it("should return battery icon for on/off", () => {
    expect(batteryLevelIcon("off")).toBe("mdi:battery");
    expect(batteryLevelIcon("on")).toBe("mdi:battery-alert");
  });
});
