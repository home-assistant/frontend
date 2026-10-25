import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkForEntityUpdates } from "../../src/data/update";
import { showAlertDialog } from "../../src/dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../src/types";
import { createMockEntityState, createMockHass } from "../fixtures/hass";

vi.mock("../../src/dialogs/generic/show-dialog-box", () => ({
  showAlertDialog: vi.fn(),
}));

describe("checkForEntityUpdates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(showAlertDialog).not.toHaveBeenCalled();
  });

  it.each([
    {
      scenario: "all update entities are unavailable",
      states: [createMockEntityState("update.unavailable", "unavailable")],
      messageKey: "unavailable_update_entities",
    },
    {
      scenario: "no update entities exist",
      states: [createMockEntityState("sensor.version", "1.0")],
      messageKey: "no_update_entities",
    },
  ])(
    "shows the correct message when $scenario",
    async ({ states, messageKey }) => {
      const hass = {
        ...createMockHass(
          Object.fromEntries(states.map((entity) => [entity.entity_id, entity]))
        ),
        callService: vi.fn(),
        connection: { subscribeEvents: vi.fn() },
      } as unknown as HomeAssistant;

      const element = document.createElement("div");
      await checkForEntityUpdates(element, hass);

      expect(showAlertDialog).toHaveBeenCalledExactlyOnceWith(element, {
        title: `ui.panel.config.updates.${messageKey}.title`,
        text: `ui.panel.config.updates.${messageKey}.description`,
        warning: true,
      });
      expect(hass.callService).not.toHaveBeenCalled();
      expect(hass.connection.subscribeEvents).not.toHaveBeenCalled();
    }
  );
});
