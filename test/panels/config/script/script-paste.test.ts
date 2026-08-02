import { describe, beforeEach, expect, test, vi } from "vitest";

import "../../../../src/panels/config/script/manual-script-editor";
import type { HaManualScriptEditor } from "../../../../src/panels/config/script/manual-script-editor";
import { createMockHass } from "../../../fixtures/hass";
import { showPasteReplaceDialog } from "../../../../src/panels/config/automation/paste-replace-dialog/show-dialog-paste-replace";

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
  beforeEach(() => {
    vi.mocked(showPasteReplaceDialog).mockImplementation(() => {
      throw new Error("showPasteReplaceDialog should not have been called");
    });
  });

  test.each(pasteCases)(
    "pastes $name into an empty editor",
    async ({ paste, expected }) => {
      const el = document.createElement(
        "manual-script-editor"
      ) as HaManualScriptEditor;

      el.hass = createMockHass();
      el.config = {
        sequence: [],
      } as any;

      const valueChanged = new Promise<CustomEvent>((resolve) => {
        el.addEventListener("value-changed", resolve as EventListener, {
          once: true,
        });
      });

      // Call the protected method through `any` to avoid full DOM lifecycle.
      await (el as any).handlePaste(makePasteEvent(paste));

      const ev = await valueChanged;
      expect(ev.detail.value).toEqual(expected);
    }
  );
});
