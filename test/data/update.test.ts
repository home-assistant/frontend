import type { TemplateResult } from "lit";
import { render } from "lit";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UpdateEntity, UpdateManualAction } from "../../src/data/update";
import {
  checkForEntityUpdates,
  computeUpdateStateDisplay,
  confirmUpdateManualActions,
  localizeUpdateManualAction,
  UpdateEntityFeature,
} from "../../src/data/update";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../src/dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../src/types";
import {
  createMockEntityState,
  createMockHass,
  mockLocale,
  mockLocalize,
} from "../fixtures/hass";

vi.mock("../../src/dialogs/generic/show-dialog-box", () => ({
  showAlertDialog: vi.fn(),
  showConfirmationDialog: vi.fn(),
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
      attributes: {
        install_phase: "waiting_for_user",
        update_percentage: null,
      },
      expected: `${PHASE_KEY}.waiting_for_user`,
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

const CONFIRM_ON_DEVICE: UpdateManualAction = {
  translation_domain: "demo",
  translation_key: "confirm_on_device",
  translation_placeholders: { screen: "touch" },
};
const ACTION_KEY =
  "component.demo.entity.update.manual_actions.confirm_on_device";

describe("localizeUpdateManualAction", () => {
  it.each(["description", "instruction"] as const)(
    "localizes the %s",
    (text) => {
      expect(
        localizeUpdateManualAction(mockLocalize, CONFIRM_ON_DEVICE, text)
      ).toBe(`${ACTION_KEY}.${text}: {"screen":"touch"}`);
    }
  );
});

describe("confirmUpdateManualActions", () => {
  const DESCRIPTION = `${ACTION_KEY}.description: {"screen":"touch"}`;
  const WARNING = 'ui.dialogs.update_manual_action.warning: {"count":1}';
  const element = document.createElement("div");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not ask when no update needs a manual action", async () => {
    const entities = [
      createMockEntityState("update.demo", "on", {
        manual_action: null,
      }) as UpdateEntity,
    ];

    await expect(
      confirmUpdateManualActions(element, mockLocalize, entities)
    ).resolves.toBe(true);
    expect(showConfirmationDialog).not.toHaveBeenCalled();
  });

  it.each([
    {
      scenario: "without names",
      formatEntityName: undefined,
      confirmed: true,
      expectedText: `${DESCRIPTION}${WARNING}`,
    },
    {
      scenario: "with names",
      formatEntityName: (entity: UpdateEntity) => entity.entity_id,
      confirmed: false,
      expectedText: `ui.dialogs.update_manual_action.item: ${JSON.stringify({
        name: "update.bulb",
        description: DESCRIPTION,
      })}${WARNING}`,
    },
  ])(
    "describes the updates that need a manual action $scenario",
    async ({ formatEntityName, confirmed, expectedText }) => {
      vi.mocked(showConfirmationDialog).mockResolvedValue(confirmed);
      const entities = [
        createMockEntityState("update.bulb", "on", {
          manual_action: CONFIRM_ON_DEVICE,
        }),
        createMockEntityState("update.hub", "on", { manual_action: null }),
      ] as UpdateEntity[];

      await expect(
        confirmUpdateManualActions(
          element,
          mockLocalize,
          entities,
          formatEntityName
        )
      ).resolves.toBe(confirmed);

      expect(showConfirmationDialog).toHaveBeenCalledExactlyOnceWith(
        element,
        expect.objectContaining({
          title: 'ui.dialogs.update_manual_action.title: {"count":1}',
          confirmText: "ui.common.update",
          warning: true,
        })
      );
      const container = document.createElement("div");
      render(
        vi.mocked(showConfirmationDialog).mock.calls[0][1]
          .text as TemplateResult,
        container
      );
      expect(container.textContent).toBe(expectedText);
    }
  );
});
