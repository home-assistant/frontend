import { beforeEach, describe, expect, it, vi } from "vitest";
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
  });

  it.each([
    {
      scenario: "all update entities are restored",
      states: [
        createMockEntityState("update.unavailable", "unavailable", {
          restored: true,
        }),
      ],
      messageKey: "update_integrations_not_loaded",
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
