import type { HassEntity } from "home-assistant-js-websocket";
import {
  mdiArrowCollapseHorizontal,
  mdiArrowDown,
  mdiArrowExpandHorizontal,
  mdiArrowUp,
  mdiDoorClosed,
  mdiDoorOpen,
  mdiGate,
  mdiGateOpen,
} from "@mdi/js";
import { describe, it, expect } from "vitest";
import {
  computeOpenIcon,
  computeCloseIcon,
} from "../../../src/common/entity/cover_icon";

const withDeviceClass = (deviceClass: string) =>
  ({ attributes: { device_class: deviceClass } }) as unknown as HassEntity;

describe("computeOpenIcon", () => {
  it("returns the device class icon for door, gate, curtain and awning", () => {
    expect(computeOpenIcon(withDeviceClass("door"))).toBe(mdiDoorOpen);
    expect(computeOpenIcon(withDeviceClass("gate"))).toBe(mdiGateOpen);
    expect(computeOpenIcon(withDeviceClass("curtain"))).toBe(
      mdiArrowExpandHorizontal
    );
    expect(computeOpenIcon(withDeviceClass("awning"))).toBe(mdiArrowDown);
  });

  it("returns mdiArrowUp for other device classes", () => {
    expect(computeOpenIcon(withDeviceClass("window"))).toBe(mdiArrowUp);
  });
});

describe("computeCloseIcon", () => {
  it("returns the device class icon for door, gate, curtain and awning", () => {
    expect(computeCloseIcon(withDeviceClass("door"))).toBe(mdiDoorClosed);
    expect(computeCloseIcon(withDeviceClass("gate"))).toBe(mdiGate);
    expect(computeCloseIcon(withDeviceClass("curtain"))).toBe(
      mdiArrowCollapseHorizontal
    );
    expect(computeCloseIcon(withDeviceClass("awning"))).toBe(mdiArrowUp);
  });

  it("returns mdiArrowDown for other device classes", () => {
    expect(computeCloseIcon(withDeviceClass("window"))).toBe(mdiArrowDown);
  });
});
