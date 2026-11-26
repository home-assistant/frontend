import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UpdateEntity, UpdateManualAction } from "../../src/data/update";
import {
  checkForEntityUpdates,
  computeUpdateStateDisplay,
  localizeUpdateManualAction,
  UpdateEntityFeature,
} from "../../src/data/update";
import { showAlertDialog } from "../../src/dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../src/types";
import {
  createMockEntityState,
  createMockHass,
  mockLocale,
  mockLocalize,
} from "../fixtures/hass";

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

describe("computeUpdateStateDisplay", () => {
  const PHASE_KEY =
    "component.update.entity_component._.state_attributes.install_phase.state";

  it.each([
    {
      scenario: "without progress support",
      features: UpdateEntityFeature.INSTALL,
      attributes: { install_phase: null, update_percentage: null },
      expected: "ui.card.update.installing",
    },
    {
      scenario: "before progress is reported",
      features: UpdateEntityFeature.PROGRESS,
      attributes: { install_phase: null, update_percentage: null },
      expected: "ui.card.update.preparing",
    },
    {
      scenario: "with progress",
      features: UpdateEntityFeature.PROGRESS,
      attributes: { install_phase: null, update_percentage: 40 },
      expected: 'ui.card.update.installing_with_progress: {"progress":"40"}',
    },
    {
      scenario: "with a phase",
      features: UpdateEntityFeature.PROGRESS,
      attributes: { install_phase: "backing_up", update_percentage: null },
      expected: `${PHASE_KEY}.backing_up`,
    },
    {
      scenario: "with a phase and progress",
      features: UpdateEntityFeature.PROGRESS,
      attributes: { install_phase: "downloading", update_percentage: 40 },
      expected: `ui.card.update.phase_with_progress: {"phase":"${PHASE_KEY}.downloading","progress":"40"}`,
    },
  ])(
    "shows the install status $scenario",
    ({ features, attributes, expected }) => {
      const stateObj = createMockEntityState("update.demo", "on", {
        supported_features: features,
        in_progress: true,
        display_precision: 0,
        ...attributes,
      }) as UpdateEntity;

      expect(
        computeUpdateStateDisplay(
          stateObj,
          mockLocalize,
          mockLocale,
          (entity) => entity.state
        )
      ).toBe(expected);
    }
  );
});

describe("localizeUpdateManualAction", () => {
  it.each<{ scenario: string; action: UpdateManualAction; expected: string }>([
    {
      scenario: "a shared action",
      action: {
        translation_domain: "update",
        translation_key: "confirm_on_device",
        translation_placeholders: {},
      },
      expected:
        "component.update.entity_component.manual_actions.confirm_on_device: {}",
    },
    {
      scenario: "an integration action",
      action: {
        translation_domain: "demo",
        translation_key: "power_cycle",
        translation_placeholders: { device_name: "Bulb" },
      },
      expected:
        'component.demo.entity.update.manual_actions.power_cycle: {"device_name":"Bulb"}',
    },
  ])("localizes $scenario", ({ action, expected }) => {
    expect(localizeUpdateManualAction(mockLocalize, action)).toBe(expected);
  });
});
