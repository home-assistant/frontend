/* eslint-disable lit/no-template-arrow */
import type { TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators";
import { mockAreaRegistry } from "../../../../demo/src/stubs/area_registry";
import { mockConfigEntries } from "../../../../demo/src/stubs/config_entries";
import { mockDeviceRegistry } from "../../../../demo/src/stubs/device_registry";
import { mockEntityRegistry } from "../../../../demo/src/stubs/entity_registry";
import { mockHassioSupervisor } from "../../../../demo/src/stubs/hassio_supervisor";
import { computeInitialHaFormData } from "../../../../src/components/ha-form/compute-initial-ha-form-data";
import "../../../../src/components/ha-form/ha-form";
import type { HaFormSchema } from "../../../../src/components/ha-form/types";
import type { AreaRegistryEntry } from "../../../../src/data/area_registry";
import { getEntity } from "../../../../src/fake_data/entity";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import type { HomeAssistant } from "../../../../src/types";
import "../../components/demo-black-white-row";
import type { DeviceRegistryEntry } from "../../../../src/data/device_registry";

const ENTITIES = [
  getEntity("alarm_control_panel", "alarm", "disarmed", {
    friendly_name: "Alarm",
  }),
  getEntity("media_player", "livingroom", "playing", {
    friendly_name: "Livingroom",
    media_content_type: "music",
    device_class: "tv",
  }),
  getEntity("media_player", "lounge", "idle", {
    friendly_name: "Lounge",
    supported_features: 444983,
    device_class: "speaker",
  }),
  getEntity("light", "bedroom", "on", {
    friendly_name: "Bedroom",
    effect: "colorloop",
    effect_list: ["colorloop", "random"],
  }),
  getEntity("switch", "coffee", "off", {
    friendly_name: "Coffee",
    device_class: "switch",
  }),
];

const DEVICES: DeviceRegistryEntry[] = [
  {
    area_id: "bedroom",
    configuration_url: null,
    config_entries: ["config_entry_1"],
    config_entries_subentries: {},
    connections: [],
    disabled_by: null,
    entry_type: null,
    id: "device_1",
    identifiers: [["demo", "volume1"] as [string, string]],
    manufacturer: null,
    model: null,
    model_id: null,
    name_by_user: null,
    name: "Dishwasher",
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
    area_id: "backyard",
    configuration_url: null,
    config_entries: ["config_entry_2"],
    config_entries_subentries: {},
    connections: [],
    disabled_by: null,
    entry_type: null,
    id: "device_2",
    identifiers: [["demo", "pwm1"] as [string, string]],
    manufacturer: null,
    model: null,
    model_id: null,
    name_by_user: null,
    name: "Lamp",
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
    config_entries: ["config_entry_3"],
    config_entries_subentries: {},
    connections: [],
    disabled_by: null,
    entry_type: null,
    id: "device_3",
    identifiers: [["demo", "pwm1"] as [string, string]],
    manufacturer: null,
    model: null,
    model_id: null,
    name_by_user: "User name",
    name: "Technical name",
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

const AREAS: AreaRegistryEntry[] = [
  {
    area_id: "backyard",
    floor_id: null,
    name: "Backyard",
    icon: null,
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
    floor_id: null,
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
    area_id: "livingroom",
    floor_id: null,
    name: "Livingroom",
    icon: "mdi:sofa",
    picture: null,
    aliases: [],
    labels: [],
    temperature_entity_id: null,
    humidity_entity_id: null,
    created_at: 0,
    modified_at: 0,
  },
];

const SCHEMAS: {
  title: string;
  translations?: Record<string, string>;
  error?: Record<string, string>;
  schema: HaFormSchema[];
  data?: Record<string, any>;
}[] = [
  {
    title: "Selectors",
    translations: {
      addon: "Addon",
      entity: "Entity",
      device: "Device",
      area: "Area",
      target: "Target",
      number: "Number",
      boolean: "Boolean",
      time: "Time",
      action: "Action",
      text: "Text",
      text_multiline: "Text Multiline",
      object: "Object",
      select: "Select",
      icon: "Icon",
      media: "Media",
      location: "Location",
      entities: "Entities",
    },
    schema: [
      { name: "addon", selector: { addon: {} } },
      { name: "entity", selector: { entity: {} } },
      {
        name: "Attribute",
        selector: { attribute: { entity_id: "" } },
        context: { filter_entity: "entity" },
      },
      {
        name: "State",
        selector: { state: { entity_id: "" } },
        context: { filter_entity: "entity", filter_attribute: "Attribute" },
      },
      { name: "Device", selector: { device: {} } },
      { name: "Config entry", selector: { config_entry: {} } },
      { name: "Duration", selector: { duration: {} } },
      { name: "area", selector: { area: {} } },
      { name: "target", selector: { target: {} } },
      { name: "number", selector: { number: { min: 0, max: 10 } } },
      { name: "boolean", selector: { boolean: {} } },
      { name: "time", required: true, selector: { time: {} } },
      { name: "datetime", required: true, selector: { datetime: {} } },
      { name: "date", required: true, selector: { date: {} } },
      { name: "action", selector: { action: {} } },
      { name: "text", selector: { text: { multiline: false } } },
      { name: "text_multiline", selector: { text: { multiline: true } } },
      { name: "object", selector: { object: {} } },
      {
        name: "select",
        selector: {
          select: { options: ["Everyone Home", "Some Home", "All gone"] },
        },
      },
      {
        name: "icon",
        selector: {
          icon: {},
        },
      },
      {
        name: "media",
        selector: {
          media: {},
        },
      },
      {
        name: "location",
        selector: { location: { radius: true, icon: "mdi:home" } },
      },
      {
        name: "entities",
        selector: { entity: { multiple: true } },
      },
    ],
  },
  {
    title: "Authentication",
    translations: {
      username: "Username",
      password: "Password",
      invalid_login: "Invalid username or password",
    },
    error: {
      base: "invalid_login",
    },
    schema: [
      {
        type: "string",
        name: "username",
        required: true,
      },
      {
        type: "string",
        name: "password",
        required: true,
      },
    ],
  },

  {
    title: "One of each",
    schema: [
      {
        type: "constant",
        value: "Constant Value",
        name: "constant",
        required: true,
      },
      {
        type: "boolean",
        name: "bool",
        default: false,
      },
      {
        type: "integer",
        name: "int",
        default: 10,
      },
      {
        type: "float",
        name: "float",
        required: true,
      },
      {
        type: "string",
        name: "string",
        default: "Default",
      },
      {
        type: "select",
        options: [
          ["default", "default"],
          ["other", "other"],
        ],
        name: "select",
        default: "default",
      },
      {
        type: "multi_select",
        options: {
          default: "Default",
          other: "Other",
        },
        name: "multi",
        default: ["default"],
      },
      {
        type: "positive_time_period_dict",
        name: "time",
        required: true,
      },
    ],
  },
  {
    title: "Numbers",
    schema: [
      {
        type: "integer",
        name: "int",
        required: true,
      },
      {
        type: "integer",
        name: "int with default",
        default: 10,
      },
      {
        type: "integer",
        name: "int range required",
        required: true,
        default: 5,
        valueMin: 0,
        valueMax: 10,
      },
      {
        type: "integer",
        name: "int range optional",
        valueMin: 0,
        valueMax: 10,
      },
    ],
  },
  {
    title: "select",
    schema: [
      {
        type: "select",
        options: [
          ["default", "Default"],
          ["other", "Other"],
        ],
        name: "select",
        required: true,
        default: "default",
      },
      {
        type: "select",
        options: [
          ["default", "Default"],
          ["other", "Other"],
        ],
        name: "select optional",
      },
      {
        type: "select",
        options: [
          ["default", "Default"],
          ["other", "Other"],
          ["uno", "mas"],
          ["one", "more"],
          ["and", "another_one"],
          ["option", "1000"],
        ],
        name: "select many options",
        default: "default",
      },
    ],
  },
  {
    title: "Multi select",
    schema: [
      {
        type: "multi_select",
        options: {
          default: "Default",
          other: "Other",
        },
        name: "multi",
        required: true,
        default: ["default"],
      },
      {
        type: "multi_select",
        options: {
          default: "Default",
          other: "Other",
          uno: "mas",
          one: "more",
          and: "another_one",
          option: "1000",
        },
        name: "multi many options",
        default: ["default"],
      },
    ],
  },
  {
    title: "Field specific error",
    data: {
      new_password: "hello",
      new_password_2: "bye",
    },
    translations: {
      new_password: "New Password",
      new_password_2: "Re-type Password",
      not_match: "The passwords do not match",
    },
    error: {
      new_password_2: "not_match",
    },
    schema: [
      {
        type: "string",
        name: "new_password",
        required: true,
      },
      {
        type: "string",
        name: "new_password_2",
        required: true,
      },
    ],
  },
  {
    title: "OctoPrint",
    translations: {
      username: "Username",
      host: "Host",
      port: "Port Number",
      path: "Application Path",
      ssl: "Use SSL",
    },
    schema: [
      { type: "string", name: "username", required: true, default: "" },
      { type: "string", name: "host", required: true, default: "" },
      {
        type: "integer",
        valueMin: 1,
        valueMax: 65535,
        name: "port",
        default: 80,
      },
      { type: "string", name: "path", default: "/" },
      { type: "boolean", name: "ssl", default: false },
    ],
  },
];

@customElement("demo-components-ha-form")
class DemoHaForm extends LitElement {
  @state() private hass!: HomeAssistant;

  private data = SCHEMAS.map(
    ({ schema, data }) => data || computeInitialHaFormData(schema)
  );

  private disabled = SCHEMAS.map(() => false);

  constructor() {
    super();
    const hass = provideHass(this);
    hass.updateTranslations(null, "en");
    hass.updateTranslations("config", "en");
    hass.addEntities(ENTITIES);
    mockEntityRegistry(hass);
    mockDeviceRegistry(hass, DEVICES);
    mockConfigEntries(hass);
    mockAreaRegistry(hass, AREAS);
    mockHassioSupervisor(hass);
  }

  protected render(): TemplateResult {
    return html`
      ${SCHEMAS.map((info, idx) => {
        const translations = info.translations || {};
        return html`
          <demo-black-white-row
            .title=${info.title}
            .value=${this.data[idx]}
            .disabled=${this.disabled[idx]}
            @submitted=${this._handleSubmit}
            .sampleIdx=${idx}
          >
            ${["light", "dark"].map(
              (slot) => html`
                <ha-form
                  slot=${slot}
                  .hass=${this.hass}
                  .data=${this.data[idx]}
                  .schema=${info.schema}
                  .error=${info.error}
                  .disabled=${this.disabled[idx]}
                  .computeError=${(error) => translations[error] || error}
                  .computeLabel=${(schema) =>
                    translations[schema.name] || schema.name}
                  .computeHelper=${() => "Helper text"}
                  @value-changed=${this._handleValueChanged}
                  .sampleIdx=${idx}
                ></ha-form>
              `
            )}
          </demo-black-white-row>
        `;
      })}
    `;
  }

  private _handleValueChanged(ev) {
    const sampleIdx = ev.target.sampleIdx;
    this.data[sampleIdx] = ev.detail.value;
    this.requestUpdate();
  }

  private _handleSubmit(ev) {
    const sampleIdx = ev.target.sampleIdx;
    this.disabled[sampleIdx] = true;
    this.requestUpdate();
    setTimeout(() => {
      this.disabled[sampleIdx] = false;
      this.requestUpdate();
    }, 2000);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-form": DemoHaForm;
  }
}
