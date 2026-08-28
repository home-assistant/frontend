import { describe, expect, test, vi } from "vitest";

import { goBack, navigate } from "../../../../src/common/navigate";
import type * as NavigateModule from "../../../../src/common/navigate";
import "../../../../src/panels/config/automation/ha-automation-editor";
import type { HaAutomationEditor } from "../../../../src/panels/config/automation/ha-automation-editor";
import { createMockHass } from "../../../fixtures/hass";

vi.mock("../../../../src/common/navigate", async (importOriginal) => {
  const actual = await importOriginal<typeof NavigateModule>();
  return {
    ...actual,
    goBack: vi.fn(),
    navigate: vi.fn(),
  };
});

vi.mock("../../../../src/dialogs/generic/show-dialog-box", () => ({
  showAlertDialog: vi.fn(async () => undefined),
  showConfirmationDialog: vi.fn(async () => true),
}));

describe("automation editor disconnected load", () => {
  test("ignores a config fetch that 404s after the editor is disconnected", async () => {
    const el = document.createElement(
      "ha-automation-editor"
    ) as HaAutomationEditor;
    const hass = createMockHass();
    let rejectLoad!: (reason: { status_code: number }) => void;
    (hass as any).callApi = vi.fn(
      () =>
        new Promise((_resolve, reject) => {
          rejectLoad = reject;
        })
    );
    el.hass = hass;
    el.automations = [];

    let connected = true;
    Object.defineProperty(el, "isConnected", {
      configurable: true,
      get: () => connected,
    });

    const load = (el as any).loadConfig("missing");
    connected = false;
    rejectLoad({ status_code: 404 });
    await load;

    expect(goBack).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
