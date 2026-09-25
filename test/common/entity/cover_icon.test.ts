import type { HassEntity } from "home-assistant-js-websocket";
import {
  mdiArrowCollapseHorizontal,
  mdiArrowDown,
  mdiArrowExpandHorizontal,
  mdiArrowUp,
} from "@mdi/js";
import { describe, it, expect } from "vitest";
import {
  computeOpenIcon,
  computeCloseIcon,
} from "../../../src/common/entity/cover_icon";

describe("computeOpenIcon", () => {
  it("returns mdiArrowExpandHorizontal for awning, door, gate, and curtain", () => {
    const stateObj = { attributes: { device_class: "awning" } } as HassEntity;
    expect(computeOpenIcon(stateObj)).toBe(mdiArrowExpandHorizontal);

    stateObj.attributes.device_class = "door";
    expect(computeOpenIcon(stateObj)).toBe(mdiArrowExpandHorizontal);

    stateObj.attributes.device_class = "gate";
    expect(computeOpenIcon(stateObj)).toBe(mdiArrowExpandHorizontal);

    stateObj.attributes.device_class = "curtain";
    expect(computeOpenIcon(stateObj)).toBe(mdiArrowExpandHorizontal);
  });

  it("returns mdiArrowUp for other device classes", () => {
    const stateObj = { attributes: { device_class: "window" } } as HassEntity;
    expect(computeOpenIcon(stateObj)).toBe(mdiArrowUp);
  });
});

describe("computeCloseIcon", () => {
  it("returns mdiArrowCollapseHorizontal for awning, door, gate, and curtain", () => {
    const stateObj = { attributes: { device_class: "awning" } } as HassEntity;
    expect(computeCloseIcon(stateObj)).toBe(mdiArrowCollapseHorizontal);

    stateObj.attributes.device_class = "door";
    expect(computeCloseIcon(stateObj)).toBe(mdiArrowCollapseHorizontal);

    stateObj.attributes.device_class = "gate";
    expect(computeCloseIcon(stateObj)).toBe(mdiArrowCollapseHorizontal);

    stateObj.attributes.device_class = "curtain";
    expect(computeCloseIcon(stateObj)).toBe(mdiArrowCollapseHorizontal);
  });

  it("returns mdiArrowDown for other device classes", () => {
    const stateObj = { attributes: { device_class: "window" } } as HassEntity;
    expect(computeCloseIcon(stateObj)).toBe(mdiArrowDown);
  });
});
