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
  {
    name: "full automation config [append]",
    config: {
      variables: { x: 1 },
      trigger_variables: { y: 2 },
      triggers: [{ trigger: "time", at: "1:00:00" }],
      conditions: [
        {
          condition: "window.is_open",
          target: { entity_id: "binary_sensor.window" },
        },
      ],
      actions: [{ stop: "" }],
    },
    paste: `
variables:
  foo: "bar"
trigger_variables:
  z: 3
triggers:
  - trigger: state
    entity_id: binary_sensor.front_door
conditions:
  - "{{ true }}"
actions:
  - action: light.turn_on
    target:
      entity_id: light.hallway
`,
    response: "append",
    expected: {
      variables: {
        foo: "bar",
        x: 1,
      },
      trigger_variables: {
        y: 2,
        z: 3,
      },
      triggers: [
        { trigger: "time", at: "1:00:00" },
        {
          trigger: "state",
          entity_id: "binary_sensor.front_door",
        },
      ],
      conditions: [
        {
          condition: "window.is_open",
          target: { entity_id: "binary_sensor.window" },
        },
        "{{ true }}",
      ],
      actions: [
        { stop: "" },
        {
          action: "light.turn_on",
          target: { entity_id: "light.hallway" },
        },
      ],
    },
  },
  {
    name: "full automation config [replace]",
    config: {
      variables: { x: 1 },
      trigger_variables: { y: 2 },
      triggers: [{ trigger: "time", at: "1:00:00" }],
      conditions: [
        {
          condition: "window.is_open",
          target: { entity_id: "binary_sensor.window" },
        },
      ],
      actions: [{ stop: "" }],
    },
    paste: `
variables:
  foo: "bar"
trigger_variables:
  z: 3
triggers:
  - trigger: state
    entity_id: binary_sensor.front_door
conditions:
  - "{{ true }}"
actions:
  - action: light.turn_on
    target:
      entity_id: light.hallway
`,
    response: "replace",
    expected: {
      variables: {
        foo: "bar",
      },
      trigger_variables: {
        z: 3,
      },
      triggers: [
        {
          trigger: "state",
          entity_id: "binary_sensor.front_door",
        },
      ],
      conditions: ["{{ true }}"],
      actions: [
        {
          action: "light.turn_on",
          target: { entity_id: "light.hallway" },
        },
      ],
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
    async ({ config, paste, expected, response }) => {
      const el = document.createElement(
        "manual-automation-editor"
      ) as HaManualAutomationEditor;
      dialogResponse = response;
      el.hass = createMockHass();
      el.config =
        config ??
        ({
          triggers: [],
          conditions: [],
          actions: [],
        } as any);

      const valueChanged = new Promise<CustomEvent>((resolve) => {
        el.addEventListener("value-changed", resolve as EventListener, {
          once: true,
        });
      });

      // Call the protected method through `any` to avoid full DOM lifecycle.
      await (el as any).handlePaste(makePasteEvent(paste));

      expect(showPasteReplaceDialog).toHaveBeenCalledTimes(response ? 1 : 0);

      const ev = await valueChanged;
      expect(ev.detail.value).toEqual(expected);
    }
  );
});
