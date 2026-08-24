import { nothing } from "lit";
import { describe, expect, it, vi } from "vitest";
import type { SecurityFrontendSystemData } from "../../../../src/data/frontend";
import type { EditSecurityDialogParams } from "../../../../src/panels/security/dialogs/show-dialog-edit-security";
import "../../../../src/panels/security/dialogs/dialog-edit-security";
import { createMockHass } from "../../../fixtures/hass";

interface TestEditSecurityDialog extends HTMLElement {
  params: EditSecurityDialogParams;
  _state?: SecurityFrontendSystemData;
  connectedCallback(): void;
  disconnectedCallback(): void;
  performUpdate(): void;
  render(): unknown;
}

describe("dialog-edit-security", () => {
  it("renders with hass supplied through dialog params", () => {
    const dialog = document.createElement(
      "dialog-edit-security"
    ) as unknown as TestEditSecurityDialog;
    dialog.params = {
      hass: createMockHass(),
      config: {},
      saveConfig: vi.fn(),
    };
    dialog.performUpdate = vi.fn();
    dialog.connectedCallback();

    expect(dialog._state).toEqual({ alert_entities: [] });
    expect(dialog.render()).not.toBe(nothing);

    dialog.disconnectedCallback();
  });
});
