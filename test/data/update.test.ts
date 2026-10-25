import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkForEntityUpdates } from "../../src/data/update";
import type { HomeAssistant } from "../../src/types";
import { createMockEntityState, createMockHass } from "../fixtures/hass";

describe("checkForEntityUpdates", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("refreshes update entities except those that are unavailable", async () => {
    const states = [
      createMockEntityState("update.available", "on"),
      createMockEntityState("update.up_to_date", "off"),
      createMockEntityState("update.unknown", "unknown"),
      createMockEntityState("update.unavailable", "unavailable", {
        restored: true,
      }),
      createMockEntityState("sensor.version", "1.0"),
    ];
    const unsubscribe = vi.fn();
    const hass = {
      ...createMockHass(
        Object.fromEntries(states.map((entity) => [entity.entity_id, entity]))
      ),
      callService: vi.fn().mockResolvedValue(undefined),
      connection: {
        subscribeEvents: vi.fn().mockResolvedValue(unsubscribe),
      },
    } as unknown as HomeAssistant;

    const refresh = checkForEntityUpdates(document.createElement("div"), hass);
    await vi.runAllTimersAsync();
    await refresh;

    expect(hass.callService).toHaveBeenCalledExactlyOnceWith(
      "homeassistant",
      "update_entity",
      {
        entity_id: ["update.available", "update.unknown", "update.up_to_date"],
      }
    );
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("does not call the service when all update entities are unavailable", async () => {
    const hass = {
      ...createMockHass({
        "update.unavailable": createMockEntityState(
          "update.unavailable",
          "unavailable"
        ),
      }),
      callService: vi.fn(),
      connection: { subscribeEvents: vi.fn() },
    } as unknown as HomeAssistant;

    await checkForEntityUpdates(document.createElement("div"), hass);

    expect(hass.callService).not.toHaveBeenCalled();
    expect(hass.connection.subscribeEvents).not.toHaveBeenCalled();
  });
});
