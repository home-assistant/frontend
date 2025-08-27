import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators";
import { mockAreaRegistry } from "../../../../demo/src/stubs/area_registry";
import { mockConfigEntries } from "../../../../demo/src/stubs/config_entries";
import { mockDeviceRegistry } from "../../../../demo/src/stubs/device_registry";
import { mockEntityRegistry } from "../../../../demo/src/stubs/entity_registry";
import { mockFloorRegistry } from "../../../../demo/src/stubs/floor_registry";
import type { AreaRegistryEntry } from "../../../../src/data/area_registry";
import type { DeviceRegistryEntry } from "../../../../src/data/device_registry";
import type { EntityRegistryEntry } from "../../../../src/data/entity_registry";
import type { FloorRegistryEntry } from "../../../../src/data/floor_registry";
import { getEntity } from "../../../../src/fake_data/entity";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import type { ProvideHassElement } from "../../../../src/mixins/provide-hass-lit-mixin";
import type { HomeAssistant } from "../../../../src/types";
import "../../../../src/components/ha-selector/ha-selector-entity-name";
import "../../../../src/components/ha-selector/ha-selector-entity";
import { mockIcons } from "../../../../demo/src/stubs/icons";

const ENTITIES = [
  getEntity("light", "living_room", "on", {
    friendly_name: "Living Room Light",
  }),
  getEntity("switch", "bedroom_lamp", "off", {
    friendly_name: "Bedroom Lamp",
  }),
  getEntity("sensor", "kitchen_temperature", "22.5", {
    friendly_name: "Kitchen Temperature",
    unit_of_measurement: "°C",
  }),
  getEntity("binary_sensor", "front_door", "off", {
    friendly_name: "Front Door",
  }),
  getEntity("climate", "thermostat", "heat", {
    friendly_name: "Main Thermostat",
  }),
];

const DEVICES: DeviceRegistryEntry[] = [
  {
    area_id: "living_room",
    configuration_url: null,
    config_entries: ["config_entry_1"],
    config_entries_subentries: {},
    connections: [],
    disabled_by: null,
    entry_type: null,
    id: "device_living_room_light",
    identifiers: [["demo", "living_room_light"] as [string, string]],
    manufacturer: "Philips",
    model: "Hue Bulb",
    model_id: null,
    name_by_user: null,
    name: "Smart Light Device",
    sw_version: null,
    hw_version: null,
    via_device_id: null,
    serial_number: null,
    labels: [],
    created_at: 0,
    modified_at: 0,
    primary_config_entry: null,
  },
  {
    area_id: null,
    configuration_url: null,
    config_entries: ["config_entry_2"],
    config_entries_subentries: {},
    connections: [],
    disabled_by: null,
    entry_type: null,
    id: "device_bedroom_lamp",
    identifiers: [["demo", "bedroom_lamp"] as [string, string]],
    manufacturer: "IKEA",
    model: "TRÅDFRI",
    model_id: null,
    name_by_user: "Bedside Light",
    name: "IKEA Lamp",
    sw_version: null,
    hw_version: null,
    via_device_id: null,
    serial_number: null,
    labels: [],
    created_at: 0,
    modified_at: 0,
    primary_config_entry: null,
  },
  {
    area_id: "kitchen",
    configuration_url: null,
    config_entries: ["config_entry_3"],
    config_entries_subentries: {},
    connections: [],
    disabled_by: null,
    entry_type: null,
    id: "device_kitchen_sensor",
    identifiers: [["demo", "kitchen_sensor"] as [string, string]],
    manufacturer: "Xiaomi",
    model: "Temperature Sensor",
    model_id: null,
    name_by_user: null,
    name: "Kitchen Sensor",
    sw_version: null,
    hw_version: null,
    via_device_id: null,
    serial_number: null,
    labels: [],
    created_at: 0,
    modified_at: 0,
    primary_config_entry: null,
  },
];

const ENTITY_REGISTRY: EntityRegistryEntry[] = [
  // Entity with device + area + floor (most complete example)
  {
    entity_id: "light.living_room",
    unique_id: "living_room_light_unique",
    platform: "demo",
    area_id: "living_room",
    config_entry_id: "config_entry_1",
    device_id: "device_living_room_light",
    disabled_by: null,
    entity_category: null,
    hidden_by: null,
    icon: null,
    id: "light_living_room_id",
    has_entity_name: false,
    name: null,
    original_name: "Living Room Light",
    translation_key: undefined,
    labels: [],
    created_at: 0,
    modified_at: 0,
    options: {},
    config_subentry_id: null,
    categories: {},
  },
  // Entity with device only (device inherits area from device registry)
  {
    entity_id: "switch.bedroom_lamp",
    unique_id: "bedroom_lamp_unique",
    platform: "demo",
    area_id: null,
    config_entry_id: "config_entry_2",
    device_id: "device_bedroom_lamp",
    disabled_by: null,
    entity_category: null,
    hidden_by: null,
    icon: null,
    id: "switch_bedroom_lamp_id",
    has_entity_name: false,
    name: null,
    original_name: "Bedroom Lamp",
    translation_key: undefined,
    labels: [],
    created_at: 0,
    modified_at: 0,
    options: {},
    config_subentry_id: null,
    categories: {},
  },
  // Entity with area + floor only (no device)
  {
    entity_id: "sensor.kitchen_temperature",
    unique_id: "kitchen_temp_unique",
    platform: "demo",
    area_id: "kitchen",
    config_entry_id: "config_entry_3",
    device_id: null,
    disabled_by: null,
    entity_category: null,
    hidden_by: null,
    icon: null,
    id: "sensor_kitchen_temp_id",
    has_entity_name: false,
    name: null,
    original_name: "Kitchen Temperature",
    translation_key: undefined,
    labels: [],
    created_at: 0,
    modified_at: 0,
    options: {},
    config_subentry_id: null,
    categories: {},
  },
  // Entity with area only (no device, no floor)
  {
    entity_id: "binary_sensor.front_door",
    unique_id: "front_door_unique",
    platform: "demo",
    area_id: "entrance",
    config_entry_id: "config_entry_4",
    device_id: null,
    disabled_by: null,
    entity_category: null,
    hidden_by: null,
    icon: null,
    id: "binary_sensor_front_door_id",
    has_entity_name: false,
    name: null,
    original_name: "Front Door",
    translation_key: undefined,
    labels: [],
    created_at: 0,
    modified_at: 0,
    options: {},
    config_subentry_id: null,
    categories: {},
  },
  // Entity with no device or area (entity name only)
  {
    entity_id: "climate.thermostat",
    unique_id: "thermostat_unique",
    platform: "demo",
    area_id: null,
    config_entry_id: "config_entry_5",
    device_id: null,
    disabled_by: null,
    entity_category: null,
    hidden_by: null,
    icon: null,
    id: "climate_thermostat_id",
    has_entity_name: false,
    name: null,
    original_name: "Main Thermostat",
    translation_key: undefined,
    labels: [],
    created_at: 0,
    modified_at: 0,
    options: {},
    config_subentry_id: null,
    categories: {},
  },
];

const AREAS: AreaRegistryEntry[] = [
  {
    area_id: "living_room",
    floor_id: "ground_floor",
    name: "Living Room",
    icon: "mdi:sofa",
    picture: null,
    aliases: [],
    labels: [],
    temperature_entity_id: null,
    humidity_entity_id: null,
    created_at: 0,
    modified_at: 0,
  },
  {
    area_id: "bedroom",
    floor_id: "first_floor",
    name: "Bedroom",
    icon: "mdi:bed",
    picture: null,
    aliases: [],
    labels: [],
    temperature_entity_id: null,
    humidity_entity_id: null,
    created_at: 0,
    modified_at: 0,
  },
  {
    area_id: "kitchen",
    floor_id: "ground_floor",
    name: "Kitchen",
    icon: "mdi:chef-hat",
    picture: null,
    aliases: [],
    labels: [],
    temperature_entity_id: null,
    humidity_entity_id: null,
    created_at: 0,
    modified_at: 0,
  },
  {
    area_id: "entrance",
    floor_id: null,
    name: "Entrance",
    icon: "mdi:door",
    picture: null,
    aliases: [],
    labels: [],
    temperature_entity_id: null,
    humidity_entity_id: null,
    created_at: 0,
    modified_at: 0,
  },
];

const FLOORS: FloorRegistryEntry[] = [
  {
    floor_id: "ground_floor",
    name: "Ground Floor",
    level: 0,
    icon: null,
    aliases: [],
    created_at: 0,
    modified_at: 0,
  },
  {
    floor_id: "first_floor",
    name: "First Floor",
    level: 1,
    icon: "mdi:numeric-1",
    aliases: [],
    created_at: 0,
    modified_at: 0,
  },
];

@customElement("demo-components-ha-selector-entity-name")
export class DemoHaSelectorEntityName
  extends LitElement
  implements ProvideHassElement
{
  @state() public hass!: HomeAssistant;

  @state() private _value = "";

  @state() private _entityId = "light.living_room";

  public provideHass(el: any) {
    el.hass = this.hass;
  }

  connectedCallback() {
    super.connectedCallback();
  }

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    const hass = provideHass(this);
    hass.updateTranslations(null, "en");
    hass.updateTranslations("config", "en");
    hass.addEntities(ENTITIES);
    mockEntityRegistry(hass);
    mockDeviceRegistry(hass, DEVICES);
    mockConfigEntries(hass);
    mockAreaRegistry(hass, AREAS);
    mockFloorRegistry(hass, FLOORS);
    mockIcons(hass);
    this._setupMockData();
    // Delay to ensure all components are properly initialized
    setTimeout(() => {
      console.log("Ready");
    }, 100);
  }

  private _setupMockData() {
    // Ensure entity registry is properly set
    if (!this.hass.entities || Object.keys(this.hass.entities).length === 0) {
      this.hass.entities = {};
      ENTITY_REGISTRY.forEach((entity) => {
        this.hass.entities[entity.entity_id] = {
          entity_id: entity.entity_id,
          name: entity.name ?? undefined,
          icon: entity.icon ?? undefined,
          device_id: entity.device_id ?? undefined,
          area_id: entity.area_id ?? undefined,
          labels: entity.labels,
          hidden: entity.hidden_by !== null,
          entity_category: entity.entity_category ?? undefined,
          translation_key: entity.translation_key ?? undefined,
          platform: entity.platform ?? undefined,
          has_entity_name: entity.has_entity_name ?? undefined,
        };
      });
    }

    // Ensure floors are properly set
    if (!this.hass.floors) {
      this.hass.floors = {};
      FLOORS.forEach((floor) => {
        this.hass.floors[floor.floor_id] = floor;
      });
    }
  }

  private _selectorValueChanged(ev: CustomEvent) {
    this._value = ev.detail.value;
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html`<div>Loading...</div>`;
    }

    return html`
      <div class="card-content">
        <h3>Entity name selector</h3>
        <p>
          The <code>ha-selector-entity_name</code> component provides name
          options from entity, device, area, and floor names. Select an entity
          to see the available options.
        </p>

        <div class="selector-container">
          <ha-selector-entity
            .hass=${this.hass}
            .selector=${{ entity: { multiple: false } }}
            .value=${this._entityId}
            .label=${"Select entity"}
            @value-changed=${this._entityChanged}
          ></ha-selector-entity>
        </div>

        <div class="selector-container">
          <ha-selector-entity_name
            .hass=${this.hass}
            .selector=${{ entity_name: { entity: this._entityId } }}
            .value=${this._value}
            .label=${"Custom name"}
            .helper=${this.hass.localize(
              "ui.components.entity.entity-name-picker.helper"
            )}
            @value-changed=${this._selectorValueChanged}
          ></ha-selector-entity_name>
        </div>

        <div class="result">
          <strong>Selected value:</strong> ${this._value || "(none)"}
        </div>

        <div class="states">
          <h4>Entity information:</h4>
          <div class="entity-info">
            <div><strong>Entity ID:</strong> ${this._entityId}</div>
            <div>
              <strong>Friendly name:</strong>
              ${this.hass.states[this._entityId]?.attributes.friendly_name ||
              "(not set)"}
            </div>
            <div>
              <strong>Device:</strong>
              ${this._getDeviceName() || "(no device)"}
            </div>
            <div>
              <strong>Area:</strong>
              ${this._getAreaName() || "(no area)"}
            </div>
            <div>
              <strong>Floor:</strong>
              ${this._getFloorName() || "(no floor)"}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private _entityChanged(ev: CustomEvent) {
    this._entityId = ev.detail.value;
    this._value = "";
  }

  private _getDeviceName(): string | undefined {
    const entityReg = this.hass.entities?.[this._entityId];

    if (!entityReg?.device_id) {
      return undefined;
    }

    const device = this.hass.devices?.[entityReg.device_id];

    const deviceName = device?.name_by_user || device?.name;

    return deviceName || undefined;
  }

  private _getAreaName(): string | undefined {
    const entityReg = this.hass.entities?.[this._entityId];

    let areaId = entityReg?.area_id;

    if (!areaId) {
      const deviceId = entityReg?.device_id;
      if (deviceId) {
        const device = this.hass.devices?.[deviceId];
        if (device?.area_id) {
          areaId = device.area_id;
        }
      }
    }

    if (areaId) {
      const area = this.hass.areas?.[areaId];
      return area?.name;
    }
    return undefined;
  }

  private _getFloorName(): string | undefined {
    const areaName = this._getAreaName();
    if (!areaName) return undefined;

    const area = Object.values(this.hass.areas || {}).find(
      (a) => a.name === areaName
    );
    if (!area?.floor_id) return undefined;

    return this.hass.floors?.[area.floor_id]?.name;
  }

  static styles = css`
    .card-content {
      max-width: 800px;
      margin: 16px auto;
      // padding: 16px;
    }

    .selector-container {
      margin: 16px 0;
    }

    .result {
      margin: 16px 0;
      padding: 12px;
      background: var(
        --code-editor-background-color,
        var(--secondary-background-color)
      );
      border-radius: 4px;
      font-family: monospace;
    }

    .states {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid var(--divider-color);
    }

    .entity-info {
      margin-top: 8px;
      font-size: 0.9em;
    }

    .entity-info > div {
      margin: 4px 0;
      color: var(--secondary-text-color);
    }

    h3 {
      margin-top: 0;
    }

    h4 {
      margin: 16px 0 8px 0;
      color: var(--primary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-selector-entity-name": DemoHaSelectorEntityName;
  }
}
