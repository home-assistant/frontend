import { describe, beforeEach, expect, test, vi } from "vitest";

import "../../../../src/panels/config/script/manual-script-editor";
import type { HaManualScriptEditor } from "../../../../src/panels/config/script/manual-script-editor";
import { createMockHass } from "../../../fixtures/hass";
import { showPasteReplaceDialog } from "../../../../src/panels/config/automation/paste-replace-dialog/show-dialog-paste-replace";
import { PASTED_CONFIG_TOAST_ID } from "../../../../src/panels/config/automation/ha-manual-editor-mixin";

const pasteCases = [
  {
    name: "empty sequence",
    paste: `
sequence: []
`,
    expected: {
      sequence: [],
    },
  },
  {
    name: "sequence action",
    paste: `
sequence: []
metadata: {}
`,
    expected: {
      sequence: [{ sequence: [] }],
    },
  },
  {
    name: "sequence with top variables",
    paste: `
sequence: []
variables: {}
`,
    expected: {
      sequence: [],
      variables: {},
    },
  },
  {
    name: "mixed sequence and variables",
    paste: `
  - variables:
      a: b
    sequence:
      - variables:
          c: d
      - sequence:
          - stop: ""
`,
    expected: {
      sequence: [{ variables: { c: "d" } }, { sequence: [{ stop: "" }] }],
      variables: { a: "b" },
    },
  },
  {
    name: "append test",
    config: {
      variables: { a: 1 },
      fields: { x: {} },
      sequence: [{ stop: "1" }],
    },
    response: "append",
    paste: `
  - variables:
      b: 2
    fields:
      "y": {}
    sequence:
      - stop: "2"
`,
    expected: {
      sequence: [{ stop: "1" }, { stop: "2" }],
      fields: { x: {}, y: {} },
      variables: { a: 1, b: 2 },
    },
  },
  {
    name: "replace test",
    config: {
      variables: { a: 1 },
      fields: { x: {} },
      sequence: [{ stop: "1" }],
    },
    response: "replace",
    paste: `
  - variables:
      b: 2
    fields:
      "y": {}
    sequence:
      - stop: "2"
`,
    expected: {
      sequence: [{ stop: "2" }],
      fields: { y: {} },
      variables: { b: 2 },
    },
  },
];

vi.mock(
  "../../../../src/panels/config/automation/paste-replace-dialog/show-dialog-paste-replace",
  () => ({
    showPasteReplaceDialog: vi.fn(),
  })
);

const makePasteEvent = (text: string): ClipboardEvent => {
  const event = new Event("paste", {
    bubbles: true,
    cancelable: true,
    composed: true,
  }) as ClipboardEvent;

  Object.defineProperty(event, "clipboardData", {
    value: {
      getData: (type: string) => (type === "text" ? text : ""),
    },
  });

  Object.defineProperty(event, "composedPath", {
    value: () => [document.body],
  });

  return event;
};

describe("manual automation paste", () => {
  let dialogResponse: string | undefined;
  beforeEach(() => {
    vi.clearAllMocks();
    dialogResponse = undefined;
    vi.mocked(showPasteReplaceDialog).mockImplementation((_ctx, options) => {
      if (dialogResponse === "append") {
        options.onAppend();
        return;
      }
      if (dialogResponse === "replace") {
        options.onReplace();
        return;
      }
      throw new Error("Did not expect dialog to be raised");
    });
  });

  test.each(pasteCases)(
    "pastes $name into an empty editor",
    async ({ config, paste, response, expected }) => {
      const el = document.createElement(
        "manual-script-editor"
      ) as HaManualScriptEditor;

      dialogResponse = response;
      el.hass = createMockHass();
      el.config =
        config ??
        ({
          sequence: [],
        } as any);

      const valueChanged = new Promise<CustomEvent>((resolve) => {
        el.addEventListener("value-changed", resolve as EventListener, {
          once: true,
        });
      });
      const notification = vi.fn();
      el.addEventListener("hass-notification", notification);

      // Call the protected method through `any` to avoid full DOM lifecycle.
      await (el as any).handlePaste(makePasteEvent(paste));

      expect(showPasteReplaceDialog).toHaveBeenCalledTimes(response ? 1 : 0);

      const ev = await valueChanged;
      expect(ev.detail.value).toEqual(expected);
      expect(notification.mock.calls[0][0].detail.id).toBe(
        PASTED_CONFIG_TOAST_ID
      );
    }
  );
});
