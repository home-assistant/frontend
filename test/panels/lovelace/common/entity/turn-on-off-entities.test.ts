import { describe, expect, it, vi } from "vitest";
import { CoverEntityFeature } from "../../../../../src/data/feature/cover_entity_feature";
import { turnOnOffEntities } from "../../../../../src/panels/lovelace/common/entity/turn-on-off-entities";
import type { HomeAssistant } from "../../../../../src/types";

const TILT_ONLY = CoverEntityFeature.OPEN_TILT + CoverEntityFeature.CLOSE_TILT;
const OPEN_CLOSE = CoverEntityFeature.OPEN + CoverEntityFeature.CLOSE;

const mockHass = (states: Record<string, any>) => {
  const callService = vi.fn();
  return {
    hass: { states, callService } as unknown as HomeAssistant,
    callService,
  };
};

describe("turnOnOffEntities", () => {
  it("Batches standard domains into a single homeassistant call", () => {
    const { hass, callService } = mockHass({
      "light.one": { entity_id: "light.one", state: "off", attributes: {} },
      "switch.two": { entity_id: "switch.two", state: "off", attributes: {} },
    });
    turnOnOffEntities(hass, ["light.one", "switch.two"], true);

    expect(callService).toHaveBeenCalledOnce();
    expect(callService).toHaveBeenCalledWith("homeassistant", "turn_on", {
      entity_id: ["light.one", "switch.two"],
    });
  });

  it("Uses tilt services for tilt-only covers", () => {
    const { hass, callService } = mockHass({
      "cover.tilt": {
        entity_id: "cover.tilt",
        state: "closed",
        attributes: { supported_features: TILT_ONLY },
      },
    });
    turnOnOffEntities(hass, ["cover.tilt"], true);

    expect(callService).toHaveBeenCalledOnce();
    expect(callService).toHaveBeenCalledWith("cover", "open_cover_tilt", {
      entity_id: ["cover.tilt"],
    });
  });

  it("Splits the call when covers need different services", () => {
    const { hass, callService } = mockHass({
      "cover.regular": {
        entity_id: "cover.regular",
        state: "closed",
        attributes: { supported_features: OPEN_CLOSE },
      },
      "cover.tilt": {
        entity_id: "cover.tilt",
        state: "closed",
        attributes: { supported_features: TILT_ONLY },
      },
    });
    turnOnOffEntities(hass, ["cover.regular", "cover.tilt"], true);

    expect(callService).toHaveBeenCalledTimes(2);
    expect(callService).toHaveBeenCalledWith("cover", "open_cover", {
      entity_id: ["cover.regular"],
    });
    expect(callService).toHaveBeenCalledWith("cover", "open_cover_tilt", {
      entity_id: ["cover.tilt"],
    });
  });

  it("Skips entities already in the requested state", () => {
    const { hass, callService } = mockHass({
      "light.on": { entity_id: "light.on", state: "on", attributes: {} },
      "light.off": { entity_id: "light.off", state: "off", attributes: {} },
    });
    turnOnOffEntities(hass, ["light.on", "light.off"], true);

    expect(callService).toHaveBeenCalledOnce();
    expect(callService).toHaveBeenCalledWith("homeassistant", "turn_on", {
      entity_id: ["light.off"],
    });
  });
});
