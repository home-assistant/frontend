import "@material/mwc-button";
import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators";
import { mockAreaRegistry } from "../../../../demo/src/stubs/area_registry";
import { mockConfigEntries } from "../../../../demo/src/stubs/config_entries";
import { mockDeviceRegistry } from "../../../../demo/src/stubs/device_registry";
import { mockEntityRegistry } from "../../../../demo/src/stubs/entity_registry";
import { mockFloorRegistry } from "../../../../demo/src/stubs/floor_registry";
import { mockHassioSupervisor } from "../../../../demo/src/stubs/hassio_supervisor";
import { mockLabelRegistry } from "../../../../demo/src/stubs/label_registry";
import "../../../../src/components/ha-formfield";
import "../../../../src/components/ha-selector/ha-selector";
import "../../../../src/components/ha-settings-row";
import type { AreaRegistryEntry } from "../../../../src/data/area_registry";
import type { BlueprintInput } from "../../../../src/data/blueprint";
import type { DeviceRegistryEntry } from "../../../../src/data/device_registry";
import type { FloorRegistryEntry } from "../../../../src/data/floor_registry";
import type { LabelRegistryEntry } from "../../../../src/data/label_registry";
import { showDialog } from "../../../../src/dialogs/make-dialog-manager";
import { getEntity } from "../../../../src/fake_data/entity";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import type { ProvideHassElement } from "../../../../src/mixins/provide-hass-lit-mixin";
import type { HomeAssistant } from "../../../../src/types";
import "../../components/demo-black-white-row";

const ENTITIES = [
  getEntity("alarm_control_panel", "alarm", "disarmed", {
    friendly_name: "Alarm",
  }),
  getEntity("media_player", "livingroom", "playing", {
    friendly_name: "Livingroom",
  }),
  getEntity("media_player", "lounge", "idle", {
    friendly_name: "Lounge",
    supported_features: 444983,
  }),
  getEntity("light", "bedroom", "on", {
    friendly_name: "Bedroom",
  }),
  getEntity("switch", "coffee", "off", {
    friendly_name: "Coffee",
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
    floor_id: "ground",
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
    floor_id: "first",
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
    floor_id: "ground",
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

const FLOORS: FloorRegistryEntry[] = [
  {
    floor_id: "ground",
    name: "Ground floor",
    level: 0,
    icon: null,
    aliases: [],
    created_at: 0,
    modified_at: 0,
  },
  {
    floor_id: "first",
    name: "First floor",
    level: 1,
    icon: "mdi:numeric-1",
    aliases: [],
    created_at: 0,
    modified_at: 0,
  },
  {
    floor_id: "second",
    name: "Second floor",
    level: 2,
    icon: "mdi:numeric-2",
    aliases: [],
    created_at: 0,
    modified_at: 0,
  },
];

const LABELS: LabelRegistryEntry[] = [
  {
    label_id: "energy",
    name: "Energy",
    icon: null,
    color: "yellow",
    description: null,
    created_at: 0,
    modified_at: 0,
  },
  {
    label_id: "entertainment",
    name: "Entertainment",
    icon: "mdi:popcorn",
    color: "blue",
    description: null,
    created_at: 0,
    modified_at: 0,
  },
];

const SCHEMAS: {
  name: string;
  input: Record<string, (BlueprintInput & { required?: boolean }) | null>;
}[] = [
  {
    name: "One of each",
    input: {
      label: { name: "Label", selector: { label: {} } },
      floor: { name: "Floor", selector: { floor: {} } },
      area: { name: "Area", selector: { area: {} } },
      device: { name: "Device", selector: { device: {} } },
      entity: { name: "Entity", selector: { entity: {} } },
      target: { name: "Target", selector: { target: {} } },
      state: {
        name: "State",
        selector: { state: { entity_id: "alarm_control_panel.alarm" } },
      },
      attribute: {
        name: "Attribute",
        selector: { attribute: { entity_id: "" } },
      },
      config_entry: {
        name: "Integration",
        selector: { config_entry: {} },
      },
      duration: { name: "Duration", selector: { duration: {} } },
      addon: { name: "Addon", selector: { addon: {} } },
      number_box: {
        name: "Number Box",
        selector: {
          number: {
            min: 0,
            max: 10,
            mode: "box",
          },
        },
      },
      number_slider: {
        name: "Number Slider",
        selector: {
          number: {
            min: 0,
            max: 10,
            mode: "slider",
          },
        },
      },
      boolean: { name: "Boolean", selector: { boolean: {} } },
      time: { name: "Time", selector: { time: {} } },
      date: { name: "Date", selector: { date: {} } },
      datetime: { name: "Date Time", selector: { datetime: {} } },
      action: { name: "Action", selector: { action: {} } },
      text: {
        name: "Text",
        selector: { text: {} },
      },
      password: {
        name: "Password",
        selector: { text: { type: "password" } },
      },
      text_multiline: {
        name: "Text multiline",
        selector: {
          text: { multiline: true },
        },
      },
      object: { name: "Object", selector: { object: {} } },
      select_radio: {
        name: "Select (Radio)",
        selector: {
          select: { options: ["Option 1", "Option 2"], mode: "list" },
        },
      },
      template: { name: "Template", selector: { template: {} } },
      select: {
        name: "Select",
        selector: {
          select: {
            options: [
              "Option 1",
              "Option 2",
              "Option 3",
              "Option 4",
              "Option 5",
              "Option 6",
            ],
          },
        },
      },
      select_disabled_list: {
        name: "Select disabled option",
        selector: {
          select: {
            options: [
              { label: "Option 1", value: "Option 1" },
              { label: "Option 2", value: "Option 2" },
              { label: "Option 3", value: "Option 3", disabled: true },
            ],
            mode: "list",
          },
        },
      },
      select_disabled_multiple: {
        name: "Select disabled option",
        selector: {
          select: {
            multiple: true,
            options: [
              { label: "Option 1", value: "Option 1" },
              { label: "Option 2", value: "Option 2" },
              { label: "Option 3", value: "Option 3", disabled: true },
            ],
            mode: "list",
          },
        },
      },
      select_disabled: {
        name: "Select disabled option",
        selector: {
          select: {
            options: [
              { label: "Option 1", value: "Option 1" },
              { label: "Option 2", value: "Option 2" },
              { label: "Option 3", value: "Option 3", disabled: true },
              { label: "Option 4", value: "Option 4", disabled: true },
              { label: "Option 5", value: "Option 5", disabled: true },
              { label: "Option 6", value: "Option 6" },
            ],
          },
        },
      },
      select_custom: {
        name: "Select (Custom)",
        selector: {
          select: {
            custom_value: true,
            options: [
              "Option 1",
              "Option 2",
              "Option 3",
              "Option 4",
              "Option 5",
              "Option 6",
            ],
          },
        },
      },
      icon: { name: "Icon", selector: { icon: {} } },
      media: { name: "Media", selector: { media: {} } },
      location: { name: "Location", selector: { location: {} } },
      location_radius: {
        name: "Location with radius",
        selector: { location: { radius: true, icon: "mdi:home" } },
      },
      color_temp: {
        name: "Color Temperature",
        selector: { color_temp: {} },
      },
      color_rgb: { name: "Color", selector: { color_rgb: {} } },
      qr_code: {
        name: "QR Code",
        selector: { qr_code: { data: "https://home-assistant.io" } },
      },
      constant: {
        name: "Constant",
        selector: { constant: { value: true, label: "Yes!" } },
      },
    },
  },
  {
    name: "Multiples",
    input: {
      entity: { name: "Entity", selector: { entity: { multiple: true } } },
      device: { name: "Device", selector: { device: { multiple: true } } },
      area: { name: "Area", selector: { area: { multiple: true } } },
      floor: { name: "Floor", selector: { floor: { multiple: true } } },
      label: { name: "Label", selector: { label: { multiple: true } } },
      select: {
        name: "Select Multiple",
        selector: {
          select: {
            multiple: true,
            custom_value: true,
            options: [
              "Option 1",
              "Option 2",
              "Option 3",
              "Option 4",
              "Option 5",
              "Option 6",
            ],
          },
        },
      },
      select_checkbox: {
        name: "Select Multiple (Checkbox)",
        required: false,
        selector: {
          select: {
            mode: "list",
            multiple: true,
            options: ["Option 1", "Option 2", "Option 3", "Option 4"],
          },
        },
      },
      items: {
        name: "Items",
        selector: {
          object: {
            label_field: "name",
            description_field: "value",
            multiple: true,
            fields: {
              name: {
                label: "Name",
                selector: { text: {} },
                required: true,
              },
              value: {
                label: "Value",
                selector: {
                  number: {
                    mode: "slider",
                    min: 0,
                    max: 100,
                    unit_of_measurement: "%",
                  },
                },
              },
            },
          },
        },
      },
    },
  },
];

@customElement("demo-components-ha-selector")
class DemoHaSelector extends LitElement implements ProvideHassElement {
  @state() public hass!: HomeAssistant;

  @state() private _disabled = false;

  @state() private _required = false;

  @state() private _helper = false;

  @state() private _label = true;

  private data = SCHEMAS.map(() => ({}));

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
    mockFloorRegistry(hass, FLOORS);
    mockLabelRegistry(hass, LABELS);
    mockHassioSupervisor(hass);
    hass.mockWS("auth/sign_path", (params) => params);
    hass.mockWS("media_player/browse_media", this._browseMedia);
  }

  public provideHass(el) {
    el.hass = this.hass;
  }

  public connectedCallback() {
    super.connectedCallback();
    this.addEventListener("show-dialog", this._dialogManager);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("show-dialog", this._dialogManager);
  }

  private _browseMedia = ({ media_content_id }) => {
    if (media_content_id === undefined) {
      return {
        title: "Media",
        media_class: "directory",
        media_content_type: "",
        media_content_id: "media-source://media_source/local/.",
        can_play: false,
        can_expand: true,
        children_media_class: "directory",
        thumbnail: null,
        children: [
          {
            title: "Misc",
            media_class: "directory",
            media_content_type: "",
            media_content_id: "media-source://media_source/local/misc",
            can_play: false,
            can_expand: true,
            children_media_class: null,
            thumbnail: null,
          },
          {
            title: "Movies",
            media_class: "directory",
            media_content_type: "",
            media_content_id: "media-source://media_source/local/movies",
            can_play: true,
            can_expand: true,
            children_media_class: "movie",
            thumbnail: null,
          },
          {
            title: "Music",
            media_class: "album",
            media_content_type: "",
            media_content_id: "media-source://media_source/local/music",
            can_play: false,
            can_expand: true,
            children_media_class: "music",
            thumbnail: "/images/album_cover_2.jpg",
          },
        ],
      };
    }
    return {
      title: "Subfolder",
      media_class: "directory",
      media_content_type: "",
      media_content_id: "media-source://media_source/local/sub",
      can_play: false,
      can_expand: true,
      children_media_class: "directory",
      thumbnail: null,
      children: [
        {
          title: "audio.mp3",
          media_class: "music",
          media_content_type: "audio/mpeg",
          media_content_id: "media-source://media_source/local/audio.mp3",
          can_play: true,
          can_expand: false,
          children_media_class: null,
          thumbnail: "/images/album_cover.jpg",
        },
        {
          title: "image.jpg",
          media_class: "image",
          media_content_type: "image/jpeg",
          media_content_id: "media-source://media_source/local/image.jpg",
          can_play: true,
          can_expand: false,
          children_media_class: null,
          thumbnail: "https://brands.home-assistant.io/_/image/logo.png",
        },
        {
          title: "movie.mp4",
          media_class: "movie",
          media_content_type: "image/jpeg",
          media_content_id: "media-source://media_source/local/movie.mp4",
          can_play: true,
          can_expand: false,
          children_media_class: null,
          thumbnail: null,
        },
      ],
    };
  };

  private _dialogManager = (e) => {
    const { dialogTag, dialogImport, dialogParams, addHistory } = e.detail;
    showDialog(
      this,
      this.shadowRoot!,
      dialogTag,
      dialogParams,
      dialogImport,
      addHistory
    );
  };

  protected render(): TemplateResult {
    return html`
      <div class="options">
        <ha-formfield label="Labels">
          <ha-switch
            .name=${"label"}
            .checked=${this._label}
            @change=${this._handleOptionChange}
          ></ha-switch>
        </ha-formfield>
        <ha-formfield label="Required">
          <ha-switch
            .name=${"required"}
            .checked=${this._required}
            @change=${this._handleOptionChange}
          ></ha-switch>
        </ha-formfield>
        <ha-formfield label="Disabled">
          <ha-switch
            .name=${"disabled"}
            .checked=${this._disabled}
            @change=${this._handleOptionChange}
          ></ha-switch>
        </ha-formfield>
        <ha-formfield label="Helper text">
          <ha-switch
            .name=${"helper"}
            .checked=${this._helper}
            @change=${this._handleOptionChange}
          ></ha-switch>
        </ha-formfield>
      </div>
      ${SCHEMAS.map((info, idx) => {
        const data = this.data[idx];
        return html`
          <demo-black-white-row .title=${info.name}>
            ${["light", "dark"].map((slot) =>
              Object.entries(info.input).map(
                ([key, value]) => html`
                  <ha-settings-row narrow slot=${slot}>
                    <span slot="heading">${value?.name || key}</span>
                    <span slot="description">${value?.description}</span>
                    <ha-selector
                      .hass=${this.hass}
                      .selector=${value!.selector}
                      .key=${key}
                      .label=${this._label ? value!.name : undefined}
                      .value=${data[key] ?? value!.default}
                      .disabled=${this._disabled}
                      .required=${this._required}
                      @value-changed=${this._handleValueChanged}
                      .sampleIdx=${idx}
                      .helper=${this._helper ? "Helper text" : undefined}
                    ></ha-selector>
                  </ha-settings-row>
                `
              )
            )}
          </demo-black-white-row>
        `;
      })}
    `;
  }

  private _handleValueChanged(ev) {
    const idx = ev.target.sampleIdx;
    this.data[idx] = {
      ...this.data[idx],
      [ev.target.key]: ev.detail.value,
    };
    this.requestUpdate();
  }

  private _handleOptionChange(ev) {
    this[`_${ev.target.name}`] = ev.target.checked;
  }

  static styles = css`
    .options {
      max-width: 800px;
      margin: 16px auto;
    }
    .options ha-formfield {
      margin-right: 16px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-selector": DemoHaSelector;
  }
}
