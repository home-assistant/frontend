import { describe, expect, it } from "vitest";
import { HomeOtherDevicesViewStrategy } from "../../../src/panels/lovelace/strategies/home/home-other-devices-view-strategy";
import type { HomeAssistant } from "../../../src/types";
import {
  mockDevice,
  mockEntity,
  mockStateObj,
} from "../../common/entity/context/context-mock.ts";

const createHass = (overrides: Partial<HomeAssistant> = {}): HomeAssistant =>
  ({
    localize: (key) => key,
    states: {},
    entities: {},
    devices: {},
    areas: {},
    floors: {},
    user: null,
    ...overrides,
  }) as unknown as HomeAssistant;

describe("HomeOtherDevicesViewStrategy", () => {
  it("shows an empty state when only unassigned helpers and entities exist", async () => {
    const view = await HomeOtherDevicesViewStrategy.generate(
      { type: "home-other-devices" },
      createHass({
        states: {
          "input_boolean.helper": mockStateObj({
            entity_id: "input_boolean.helper",
            state: "on",
            attributes: {},
          }),
          "sensor.orphan": mockStateObj({
            entity_id: "sensor.orphan",
            state: "23",
            attributes: {},
          }),
        },
        entities: {
          "input_boolean.helper": mockEntity({
            entity_id: "input_boolean.helper",
            labels: [],
          }),
          "sensor.orphan": mockEntity({
            entity_id: "sensor.orphan",
            labels: [],
          }),
        },
      })
    );

    expect(view).toMatchObject({
      type: "panel",
      cards: [
        {
          type: "empty-state",
          title:
            "ui.panel.lovelace.strategy.home-other-devices.all_organized_title",
        },
      ],
    });
  });

  it("only shows actual device sections when helpers and standalone entities are also present", async () => {
    const view = await HomeOtherDevicesViewStrategy.generate(
      { type: "home-other-devices" },
      createHass({
        states: {
          "light.desk_lamp": mockStateObj({
            entity_id: "light.desk_lamp",
            state: "on",
            attributes: {},
          }),
          "input_boolean.helper": mockStateObj({
            entity_id: "input_boolean.helper",
            state: "on",
            attributes: {},
          }),
          "sensor.orphan": mockStateObj({
            entity_id: "sensor.orphan",
            state: "23",
            attributes: {},
          }),
        },
        entities: {
          "light.desk_lamp": mockEntity({
            entity_id: "light.desk_lamp",
            device_id: "device_1",
            labels: [],
          }),
          "input_boolean.helper": mockEntity({
            entity_id: "input_boolean.helper",
            labels: [],
          }),
          "sensor.orphan": mockEntity({
            entity_id: "sensor.orphan",
            labels: [],
          }),
        },
        devices: {
          device_1: mockDevice({
            id: "device_1",
            name: "Desk lamp",
          }),
        },
      })
    );

    expect(view).toMatchObject({
      type: "sections",
      sections: [
        {
          type: "grid",
          cards: [
            {
              type: "heading",
              heading: "Desk lamp",
            },
            {
              type: "entities",
              entities: [{ entity: "light.desk_lamp" }],
            },
          ],
        },
      ],
    });
    expect(view.type).toBe("sections");
    if (view.type !== "sections") {
      return;
    }
    expect(view.sections).toHaveLength(1);
  });
});
