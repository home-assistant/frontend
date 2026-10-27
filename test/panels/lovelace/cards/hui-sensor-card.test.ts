import { describe, expect, it, vi } from "vitest";
import "../../../../src/panels/lovelace/cards/hui-sensor-card";
import type { HassEntity } from "home-assistant-js-websocket";
import type { SensorCardConfig } from "../../../../src/panels/lovelace/cards/types";
import type { HuiSensorCard } from "../../../../src/panels/lovelace/cards/hui-sensor-card";

vi.hoisted(() => {
  Object.assign(globalThis, {
    __STATIC_PATH__: "/",
    __HASS_URL__: "",
    __BUILD__: "modern",
    __VERSION__: "test",
    __BACKWARDS_COMPAT__: false,
    __SUPERVISOR__: false,
    __NAMESPACE__: "frontend",
  });
});

describe("hui-sensor-card color and configuration", () => {
  const makeCard = (config: Partial<SensorCardConfig> = {}): HuiSensorCard => {
    const card = document.createElement("hui-sensor-card") as HuiSensorCard;
    card.setConfig({
      type: "sensor",
      entity: "sensor.temperature",
      ...config,
    });
    return card;
  };

  it("passes color setting to entity card config and configures graph footer", () => {
    const card = makeCard({
      color: "teal",
      graph: "line",
    });

    const entityCardConfig = (card as any)._config;
    expect(entityCardConfig).toBeDefined();
    expect(entityCardConfig.color).toBe("teal");
    expect(entityCardConfig.footer).toMatchObject({
      type: "graph",
      entity: "sensor.temperature",
    });
  });

  it("computes custom color when active and undefined when unavailable", () => {
    const card = makeCard({ color: "teal" });

    const activeState = {
      entity_id: "sensor.temperature",
      state: "21.5",
      attributes: {},
    } as HassEntity;

    const unavailableState = {
      entity_id: "sensor.temperature",
      state: "unavailable",
      attributes: {},
    } as HassEntity;

    expect((card as any)._computeColor(activeState, "teal")).toBe(
      "var(--teal-color)"
    );
    expect(
      (card as any)._computeColor(unavailableState, "teal")
    ).toBeUndefined();
  });

  it("computes state color for battery sensor when color is default", () => {
    const card = makeCard();

    const batteryState = {
      entity_id: "sensor.battery",
      state: "15",
      attributes: { device_class: "battery" },
    } as HassEntity;

    const color = (card as any)._computeColor(batteryState, undefined);
    expect(color).toContain("--state-sensor-battery-low-color");
  });

  it("getStateColor defaults to true on sensor card and respects state_color: false", () => {
    const card = makeCard();
    const stateObj = {
      entity_id: "sensor.temperature",
      state: "21.5",
      attributes: {},
    } as HassEntity;

    expect((card as any)._getStateColor(stateObj, (card as any)._config)).toBe(
      true
    );

    const cardDisabled = makeCard({ state_color: false });
    expect(
      (cardDisabled as any)._getStateColor(
        stateObj,
        (cardDisabled as any)._config
      )
    ).toBe(false);
  });
});
