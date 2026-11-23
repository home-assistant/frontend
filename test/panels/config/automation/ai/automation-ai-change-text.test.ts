import type { HassEntities, HassServices } from "home-assistant-js-websocket";
import { describe, expect, it } from "vitest";
import type { LocalizeFunc } from "../../../../../src/common/translations/localize";
import { describeFieldChanges } from "../../../../../src/panels/config/automation/ai/automation-ai-change-text";

const translations: Record<string, string> = {
  "component.light.services.turn_on.fields.brightness_pct.name": "Brightness",
  "ui.components.target-picker.type.entities": "Entities",
  "ui.panel.config.automation.editor.conditions.type.sun.after": "After",
  "ui.panel.config.automation.editor.conditions.type.sun.sunset": "Sunset",
};
const localize = ((key: string) => translations[key] ?? "") as LocalizeFunc;
const states = {
  "light.kitchen": { attributes: { friendly_name: "Kitchen light" } },
  "light.hallway": { attributes: { friendly_name: "Hallway light" } },
} as unknown as HassEntities;

// The sidebar shows these lines instead of config paths and JSON, so a user
// reads what the AI changed in the words of the editor
describe("describeFieldChanges", () => {
  const action = {
    action: "light.turn_on",
    target: { entity_id: "light.hallway" },
    data: { brightness_pct: 30 },
  };

  it("splits added data into its fields, named by the service", () => {
    expect(
      describeFieldChanges(
        [{ path: ["data"], mark: "added", newValue: { brightness_pct: 30 } }],
        action,
        { localize, states }
      )
    ).toEqual([
      {
        label: "Brightness",
        mark: "added",
        oldValue: undefined,
        newValue: "30",
      },
    ]);
  });

  it("adds the unit of a number field of the service", () => {
    const services = {
      light: {
        turn_on: {
          fields: {
            brightness_pct: {
              selector: { number: { unit_of_measurement: "%" } },
            },
          },
        },
      },
    } as unknown as HassServices;
    expect(
      describeFieldChanges(
        [{ path: ["data", "brightness_pct"], mark: "added", newValue: 30 }],
        action,
        { localize, services }
      )[0].newValue
    ).toBe("30 %");
  });

  it("names targets and the entities they point to", () => {
    expect(
      describeFieldChanges(
        [
          {
            path: ["target", "entity_id"],
            mark: "changed",
            oldValue: "light.kitchen",
            newValue: "light.hallway",
          },
        ],
        action,
        { localize, states }
      )
    ).toEqual([
      {
        label: "Entities",
        mark: "changed",
        oldValue: "Kitchen light",
        newValue: "Hallway light",
      },
    ]);
  });

  it("uses the names of condition fields and their choices", () => {
    expect(
      describeFieldChanges(
        [{ path: ["after"], mark: "added", newValue: "sunset" }],
        { condition: "sun", after: "sunset" },
        { localize }
      )
    ).toEqual([
      {
        label: "After",
        mark: "added",
        oldValue: undefined,
        newValue: "Sunset",
      },
    ]);
  });

  it("falls back to the key without a name", () => {
    expect(
      describeFieldChanges(
        [
          {
            path: ["data", "color_temp_kelvin"],
            mark: "removed",
            oldValue: 2700,
          },
        ],
        action,
        { localize }
      )[0].label
    ).toBe("Color temp kelvin");
  });
});
