import { describe, expect, it, vi } from "vitest";
import type { SecurityFrontendSystemData } from "../../../../src/data/frontend";
import type { EditSecurityDialogParams } from "../../../../src/panels/security/dialogs/show-dialog-edit-security";
import type { HomeAssistantInternationalization } from "../../../../src/types";
import "../../../../src/panels/security/dialogs/dialog-edit-security";
import { createMockHass } from "../../../fixtures/hass";

interface TestEditSecurityDialog extends HTMLElement {
  params: EditSecurityDialogParams;
  _i18n: HomeAssistantInternationalization;
  isDirtyState: boolean;
  connectedCallback(): void;
  disconnectedCallback(): void;
  performUpdate(): void;
}

const alertEntitiesChanged = (
  dialog: TestEditSecurityDialog,
  ev: CustomEvent
) =>
  (
    dialog as unknown as Record<
      "_alertEntitiesChanged",
      (event: CustomEvent) => void
    >
  )["_alertEntitiesChanged"](ev);

describe("dialog-edit-security", () => {
  const createDialog = (config: SecurityFrontendSystemData = {}) => {
    const hass = createMockHass();
    const dialog = document.createElement(
      "dialog-edit-security"
    ) as unknown as TestEditSecurityDialog;
    dialog._i18n = hass;
    dialog.params = {
      config,
      saveConfig: vi.fn(),
    };
    dialog.performUpdate = vi.fn();
    dialog.connectedCallback();
    return dialog;
  };

  it("becomes clean after nested configuration is restored", () => {
    const alertEntities = [
      { entity: "binary_sensor.window", severity: "warning" as const },
    ];
    const dialog = createDialog({ alert_entities: alertEntities });

    alertEntitiesChanged(
      dialog,
      new CustomEvent("value-changed", {
        detail: {
          value: [{ ...alertEntities[0], severity: "alert" }],
        },
      })
    );
    expect(dialog.isDirtyState).toBe(true);

    alertEntitiesChanged(
      dialog,
      new CustomEvent("value-changed", {
        detail: { value: [{ ...alertEntities[0] }] },
      })
    );
    expect(dialog.isDirtyState).toBe(false);

    dialog.disconnectedCallback();
  });
});
