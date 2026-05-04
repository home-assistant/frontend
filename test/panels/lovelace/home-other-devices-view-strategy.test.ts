import type { HassEntity } from "home-assistant-js-websocket";
import { describe, expect, it } from "vitest";
import type { DeviceRegistryEntry } from "../../../src/data/device/device_registry";
import type { EntityRegistryDisplayEntry } from "../../../src/data/entity/entity_registry";
import { HomeOtherDevicesViewStrategy } from "../../../src/panels/lovelace/strategies/home/home-other-devices-view-strategy";
import type { HomeAssistant } from "../../../src/types";

const mockState = (partial: Partial<HassEntity>): HassEntity => ({
  entity_id: "",
  attributes: {},
  state: "on",
  last_changed: "",
  last_updated: "",
  context: {
    id: "",
    user_id: null,
    parent_id: null,
  },
  ...partial,
});

const mockEntity = (
  partial: Partial<EntityRegistryDisplayEntry>
): EntityRegistryDisplayEntry => ({
  entity_id: "",
  labels: [],
  ...partial,
});

const mockDevice = (
  partial: Partial<DeviceRegistryEntry>
): DeviceRegistryEntry => ({
  id: "",
  config_entries: [],
  config_entries_subentries: {},
  connections: [],
  identifiers: [],
  manufacturer: null,
  model: null,
  model_id: null,
  name: null,
  labels: [],
  sw_version: null,
  hw_version: null,
  serial_number: null,
  via_device_id: null,
  area_id: null,
  name_by_user: null,
  entry_type: null,
  disabled_by: null,
  configuration_url: null,
  primary_config_entry: null,
  created_at: 0,
  modified_at: 0,
  ...partial,
});

const createHass = (overrides: Partial<HomeAssistant> = {}): HomeAssistant =>
  ({
    localize: (key) => key,
    states: {},
    entities: {},
    devices: {},
    areas: {},
    floors: {},
    ...overrides,
  }) as unknown as HomeAssistant;

describe("HomeOtherDevicesViewStrategy", () => {
  it("shows an empty state when only unassigned helpers and entities exist", async () => {
    const view = await HomeOtherDevicesViewStrategy.generate(
      { type: "home-other-devices" },
      createHass({
        states: {
          "input_boolean.helper": mockState({
            entity_id: "input_boolean.helper",
            state: "on",
          }),
          "sensor.orphan": mockState({
            entity_id: "sensor.orphan",
            state: "23",
          }),
        },
        entities: {
          "input_boolean.helper": mockEntity({
            entity_id: "input_boolean.helper",
          }),
          "sensor.orphan": mockEntity({
            entity_id: "sensor.orphan",
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
          "light.desk_lamp": mockState({
            entity_id: "light.desk_lamp",
            state: "on",
          }),
          "input_boolean.helper": mockState({
            entity_id: "input_boolean.helper",
            state: "on",
          }),
          "sensor.orphan": mockState({
            entity_id: "sensor.orphan",
            state: "23",
          }),
        },
        entities: {
          "light.desk_lamp": mockEntity({
            entity_id: "light.desk_lamp",
            device_id: "device_1",
          }),
          "input_boolean.helper": mockEntity({
            entity_id: "input_boolean.helper",
          }),
          "sensor.orphan": mockEntity({
            entity_id: "sensor.orphan",
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
  });
});
