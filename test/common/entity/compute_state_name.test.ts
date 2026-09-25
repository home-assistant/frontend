import type { HassEntity } from "home-assistant-js-websocket";
import { describe, it, expect } from "vitest";
import {
  computeStateName,
  computeStateNameFromEntityAttributes,
} from "../../../src/common/entity/compute_state_name";

describe("computeStateName", () => {
  it("should return friendly_name if it exists", () => {
    const stateObj = {
      entity_id: "light.living_room",
      attributes: { friendly_name: "Living Room Light" },
    } as HassEntity;
    expect(computeStateName(stateObj)).toBe("Living Room Light");
  });

  it("should return object id if friendly_name does not exist", () => {
    const stateObj = {
      entity_id: "light.living_room",
      attributes: {},
    } as HassEntity;
    expect(computeStateName(stateObj)).toBe("living room");
  });
});

describe("computeStateNameFromEntityAttributes", () => {
  it("should return friendly_name if it exists", () => {
    const entityId = "light.living_room";
    const attributes = { friendly_name: "Living Room Light" };
    expect(computeStateNameFromEntityAttributes(entityId, attributes)).toBe(
      "Living Room Light"
    );
  });

  it("should return friendly_name 0", () => {
    const entityId = "light.living_room";
    const attributes = { friendly_name: 0 };
    expect(computeStateNameFromEntityAttributes(entityId, attributes)).toBe(
      "0"
    );
  });

  it("should return empty if friendly_name is null", () => {
    const entityId = "light.living_room";
    const attributes = { friendly_name: null };
    expect(computeStateNameFromEntityAttributes(entityId, attributes)).toBe("");
  });

  it("should return object id if friendly_name does not exist", () => {
    const entityId = "light.living_room";
    const attributes = {};
    expect(computeStateNameFromEntityAttributes(entityId, attributes)).toBe(
      "living room"
    );
  });
});
