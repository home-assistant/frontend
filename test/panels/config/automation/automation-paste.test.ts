import { describe, beforeEach, expect, test, vi } from "vitest";

import "../../../../src/panels/config/automation/manual-automation-editor";
import type { HaManualAutomationEditor } from "../../../../src/panels/config/automation/manual-automation-editor";
import { createMockHass } from "../../../fixtures/hass";
import { showPasteReplaceDialog } from "../../../../src/panels/config/automation/paste-replace-dialog/show-dialog-paste-replace";

const pasteCases = [
  {
    name: "single action",
    paste: `
action: light.turn_on
target:
  entity_id: light.kitchen
`,
    expected: {
      actions: [
        {
          action: "light.turn_on",
          target: { entity_id: "light.kitchen" },
        },
      ],
    },
  },
  {
    name: "single trigger",
    paste: `
trigger: state
entity_id: binary_sensor.front_door
`,
    expected: {
      triggers: [
        {
          trigger: "state",
          entity_id: "binary_sensor.front_door",
        },
      ],
    },
  },
  {
    name: "full automation config with variables ",
    paste: `
variables:
  foo: "bar"
triggers:
  - trigger: state
    entity_id: binary_sensor.front_door
actions:
  - action: light.turn_on
    target:
      entity_id: light.hallway
`,
    expected: {
      variables: {
        foo: "bar",
      },
      triggers: [
        {
          trigger: "state",
          entity_id: "binary_sensor.front_door",
        },
      ],
      actions: [
        {
          action: "light.turn_on",
          target: { entity_id: "light.hallway" },
        },
      ],
    },
  },
  {
    name: "full automation config (array) with variables ",
    paste: `
  - triggers:
      - trigger: state
        entity_id: binary_sensor.front_door
    variables:
      foo: "bar"
    actions:
      - action: light.turn_on
        target:
          entity_id: light.hallway
`,
    expected: {
      variables: {
        foo: "bar",
      },
      triggers: [
        {
          trigger: "state",
          entity_id: "binary_sensor.front_door",
        },
      ],
      actions: [
        {
          action: "light.turn_on",
          target: { entity_id: "light.hallway" },
        },
      ],
    },
  },
  {
    name: "legacy config with variables ",
    paste: `
  - trigger:
      - trigger: state
        entity_id: binary_sensor.front_door
    variables:
      foo: "bar"
`,
    expected: {
      variables: {
        foo: "bar",
      },
      triggers: [
        {
          trigger: "state",
          entity_id: "binary_sensor.front_door",
        },
      ],
    },
  },
  {
    name: "sequence",
    paste: `
actions:
  - sequence:
      - stop: ''
`,
    expected: {
      actions: [{ sequence: [{ stop: "" }] }],
    },
  },
  {
    name: "many variables",
    paste: `
  variables: {}
  actions:
    - variables: {}
`,
    expected: {
      variables: {},
      actions: [{ variables: {} }],
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
        "manual-automation-editor"
      ) as HaManualAutomationEditor;

      el.hass = createMockHass();
      el.config = {
        triggers: [],
        conditions: [],
        actions: [],
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
