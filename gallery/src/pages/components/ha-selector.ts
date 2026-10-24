import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import {
  mockAreaRegistry,
  type DemoArea,
} from "../../../../demo/src/stubs/area_registry";
import { mockConfigEntries } from "../../../../demo/src/stubs/config_entries";
import { mockDeviceRegistry } from "../../../../demo/src/stubs/device_registry";
import { mockEntityRegistry } from "../../../../demo/src/stubs/entity_registry";
import {
  mockFloorRegistry,
  type DemoFloor,
} from "../../../../demo/src/stubs/floor_registry";
import { mockHassioSupervisor } from "../../../../demo/src/stubs/hassio_supervisor";
import { mockLabelRegistry } from "../../../../demo/src/stubs/label_registry";
import type { HASSDomEvent } from "../../../../src/common/dom/fire_event";
import "../../../../src/components/ha-formfield";
import "../../../../src/components/ha-selector/ha-selector";
import "../../../../src/components/ha-settings-row";
import type { BlueprintInput } from "../../../../src/data/blueprint";
import type { DeviceRegistryEntry } from "../../../../src/data/device/device_registry";
import type { LabelRegistryEntry } from "../../../../src/data/label/label_registry";
import { StatisticMeanType } from "../../../../src/data/recorder";
import type { SerialPort } from "../../../../src/data/usb";
import {
  showDialog,
  type ShowDialogParams,
} from "../../../../src/dialogs/make-dialog-manager";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import type { ProvideHassElement } from "../../../../src/mixins/provide-hass-lit-mixin";
import type { HomeAssistant } from "../../../../src/types";
import "../../components/demo-black-white-row";

const ENTITIES = [
  {
    entity_id: "alarm_control_panel.alarm",
    state: "disarmed",
    attributes: {
      friendly_name: "Alarm",
    },
  },
  {
    entity_id: "media_player.livingroom",
    state: "playing",
    attributes: {
      friendly_name: "Livingroom",
    },
  },
  {
    entity_id: "media_player.lounge",
    state: "idle",
    attributes: {
      friendly_name: "Lounge",
      supported_features: 444983,
    },
  },
  {
    entity_id: "light.bedroom",
    state: "on",
    attributes: {
      friendly_name: "Bedroom",
    },
  },
  {
    entity_id: "switch.coffee",
    state: "off",
    attributes: {
      friendly_name: "Coffee",
    },
  },
  {
    entity_id: "number.number",
    state: "5",
    attributes: {
      friendly_name: "Number",
    },
  },
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
    parent_device_id: null,
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
    parent_device_id: null,
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
    parent_device_id: null,
  },
  {
    area_id: "livingroom",
    configuration_url: null,
    config_entries: ["config_entry_1"],
    config_entries_subentries: {},
    connections: [],
    disabled_by: null,
    entry_type: null,
    id: "device_power_strip",
    identifiers: [["demo", "strip1"] as [string, string]],
    manufacturer: "Acme",
    model: "Smart Power Strip",
    model_id: null,
    name_by_user: null,
    name: "Power strip",
    sw_version: null,
    hw_version: null,
    via_device_id: null,
    serial_number: null,
    labels: [],
    created_at: 0,
    modified_at: 0,
    primary_config_entry: null,
    parent_device_id: null,
  },
  // Child devices of the power strip. They have no area of their own and
  // inherit the parent's area ("Livingroom"); the picker renders them indented
  // under the parent with a tree connector.
  {
    area_id: null,
    configuration_url: null,
    config_entries: ["config_entry_1"],
    config_entries_subentries: {},
    connections: [],
    disabled_by: null,
    entry_type: null,
    id: "device_outlet_1",
    identifiers: [["demo", "outlet1"] as [string, string]],
    manufacturer: "Acme",
    model: "Smart Power Strip",
    model_id: null,
    name_by_user: null,
    name: "Outlet 1",
    sw_version: null,
    hw_version: null,
    via_device_id: null,
    serial_number: null,
    labels: [],
    created_at: 0,
    modified_at: 0,
    primary_config_entry: null,
    parent_device_id: "device_power_strip",
  },
  {
    area_id: null,
    configuration_url: null,
    config_entries: ["config_entry_1"],
    config_entries_subentries: {},
    connections: [],
    disabled_by: null,
    entry_type: null,
    id: "device_outlet_2",
    identifiers: [["demo", "outlet2"] as [string, string]],
    manufacturer: "Acme",
    model: "Smart Power Strip",
    model_id: null,
    name_by_user: null,
    name: "Outlet 2",
    sw_version: null,
    hw_version: null,
    via_device_id: null,
    serial_number: null,
    labels: [],
    created_at: 0,
    modified_at: 0,
    primary_config_entry: null,
    parent_device_id: "device_power_strip",
  },
];

const AREAS: DemoArea[] = [
  {
    area_id: "backyard",
    floor_id: "ground",
    name: "Backyard",
  },
  {
    area_id: "bedroom",
    floor_id: "first",
    name: "Bedroom",
    icon: "mdi:bed",
  },
  {
    area_id: "livingroom",
    floor_id: "ground",
    name: "Livingroom",
    icon: "mdi:sofa",
  },
];

const FLOORS: DemoFloor[] = [
  {
    floor_id: "ground",
    name: "Ground floor",
    level: 0,
  },
  {
    floor_id: "first",
    name: "First floor",
    level: 1,
    icon: "mdi:numeric-1",
  },
  {
    floor_id: "second",
    name: "Second floor",
    level: 2,
    icon: "mdi:numeric-2",
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

const serialPort = (port: Partial<SerialPort>): SerialPort => ({
  device: "/dev/ttyUSB0",
  resolved_device: null,
  serial_number: null,
  manufacturer: null,
  description: null,
  matching_integrations: [],
  present: true,
  ...port,
});

// One port per section the picker groups by, relative to the "zha" domain the
// serial port selector below is given as its flow context
const SERIAL_PORTS: SerialPort[] = [
  serialPort({
    device:
      "/dev/serial/by-id/usb-Nabu_Casa_SkyConnect_v1.0_9e2adbd75b8beb119fe564a0f320645d-if00-port0",
    description: "SkyConnect v1.0",
    manufacturer: "Nabu Casa",
    serial_number: "9e2adbd75b8beb119fe564a0f320645d",
    vid: "10C4",
    pid: "EA60",
    matching_integrations: ["zha"],
  }),
  serialPort({
    device: "esphome-hass://01JQ8Z5X9WQ0/?port_name=UART0",
  }),
  serialPort({
    device: "socket://192.168.1.10:6638",
  }),
  serialPort({
    device: "/dev/serial/by-id/usb-FTDI_FT232R_USB_UART_AB0KVD1L-if00-port0",
    description: "FT232R USB UART",
    manufacturer: "FTDI",
    serial_number: "AB0KVD1L",
    vid: "0403",
    pid: "6001",
  }),
  serialPort({
    device: "/dev/ttyS0",
    description: "ttyS0",
    manufacturer: "Intel",
  }),
  serialPort({ device: "/dev/ttyAMA0" }),
  serialPort({
    device:
      "/dev/serial/by-id/usb-Silicon_Labs_CP2102_USB_to_UART_Bridge_Controller_0001-if00-port0",
    description: "CP2102 USB to UART Bridge Controller",
    manufacturer: "Silicon Labs",
    serial_number: "0001",
    vid: "10C4",
    pid: "EA60",
    matching_integrations: ["matter"],
  }),
];

const SCHEMAS: {
  name: string;
  input: Record<
    string,
    | (BlueprintInput & {
        required?: boolean;
        context?: Record<string, unknown>;
      })
    | null
  >;
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
      app: { name: "App", selector: { app: {} } },
      serial_port: {
        name: "Serial port",
        selector: { serial_port: {} },
        // A config flow passes its own domain as context, which is what the
        // picker groups recommended and not recommended ports by
        context: { domain: "zha" },
      },
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
      device_class: {
        name: "Device Class",
        selector: {
          device_class: {
            domain: "sensor",
          },
        },
      },
      device_class_multiple: {
        name: "Device Class (Multiple)",
        selector: {
          device_class: {
            domain: "binary_sensor",
            multiple: true,
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
      choose: {
        name: "Choose",
        selector: {
          choose: {
            choices: {
              number: {
                selector: {
                  number: {
                    min: 0,
                    max: 100,
                    step: 0.1,
                  },
                },
              },
              entity: {
                selector: {
                  entity: {
                    filter: {
                      domain: "number",
                    },
                  },
                },
              },
            },
          },
        },
      },
      addon: { name: "Add-on", selector: { addon: {} } },
      areas_display: {
        name: "Areas display",
        selector: { areas_display: {} },
      },
      assist_pipeline: {
        name: "Assist pipeline",
        selector: { assist_pipeline: {} },
      },
      automation_behavior: {
        name: "Automation behavior",
        selector: { automation_behavior: { mode: "trigger" } },
      },
      backup_location: {
        name: "Backup location",
        selector: { backup_location: {} },
      },
      button_toggle: {
        name: "Button toggle",
        selector: {
          button_toggle: {
            options: [
              { label: "Left", value: "left" },
              { label: "Center", value: "center" },
              { label: "Right", value: "right" },
            ],
          },
        },
      },
      condition: { name: "Condition", selector: { condition: {} } },
      conversation_agent: {
        name: "Conversation agent",
        selector: { conversation_agent: {} },
      },
      country: {
        name: "Country",
        selector: { country: { countries: ["DE", "GB", "NL", "US"] } },
      },
      entity_name: {
        name: "Entity name",
        selector: { entity_name: { entity_id: "light.bedroom" } },
      },
      file: {
        name: "File",
        selector: { file: { accept: "image/png,image/jpeg" } },
      },
      language: { name: "Language", selector: { language: {} } },
      navigation: { name: "Navigation", selector: { navigation: {} } },
      numeric_threshold: {
        name: "Numeric threshold",
        selector: { numeric_threshold: {} },
      },
      period: {
        name: "Period",
        selector: {
          period: {
            options: ["today", "yesterday", "this_week", "this_month"],
          },
        },
        // Without a value that matches one of the options the selector offers
        // its custom-period editor instead of the list
        default: { calendar: { period: "day" } },
      },
      selector: {
        name: "Selector",
        selector: { selector: {} },
        default: { text: {} },
      },
      state_class: { name: "State class", selector: { state_class: {} } },
      statistic: { name: "Statistic", selector: { statistic: {} } },
      stt: { name: "Speech-to-text", selector: { stt: {} } },
      theme: { name: "Theme", selector: { theme: {} } },
      timezone: { name: "Time zone", selector: { timezone: {} } },
      trigger: { name: "Trigger", selector: { trigger: {} } },
      tts: { name: "Text-to-speech", selector: { tts: {} } },
      tts_voice: {
        name: "Text-to-speech voice",
        selector: { tts_voice: { engineId: "tts.cloud", language: "en-US" } },
      },
      ui_action: { name: "UI action", selector: { ui_action: {} } },
      ui_clock_date_format: {
        name: "Clock date format",
        selector: { ui_clock_date_format: {} },
      },
      ui_color: { name: "UI color", selector: { ui_color: {} } },
      ui_state_content: {
        name: "State content",
        selector: { ui_state_content: { entity_id: "light.bedroom" } },
      },
      ui_time_format: {
        name: "Time format",
        selector: { ui_time_format: {} },
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
              password: {
                label: "Password",
                selector: { text: { type: "password" } },
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
    hass.addTranslations({
      "component.matter.title": "Matter",
      "component.zha.title": "Zigbee Home Automation",
    });
    hass.updateHass({
      config: {
        ...hass.config,
        components: [...hass.config.components, "usb"],
      },
    });
    hass.mockWS("auth/sign_path", (params) => params);
    hass.mockWS("media_player/browse_media", this._browseMedia);
    hass.mockWS("usb/list_serial_ports", () => SERIAL_PORTS);
    hass.mockWS("recorder/list_statistic_ids", () => [
      {
        statistic_id: "sensor.energy_consumption",
        statistics_unit_of_measurement: "kWh",
        source: "recorder",
        name: null,
        has_sum: true,
        mean_type: StatisticMeanType.NONE,
        unit_class: "energy",
      },
      {
        statistic_id: "sensor.outside_temperature",
        statistics_unit_of_measurement: "\u00b0C",
        source: "recorder",
        name: null,
        has_sum: false,
        mean_type: StatisticMeanType.ARITHMETIC,
        unit_class: "temperature",
      },
    ]);
    hass.mockWS("assist_pipeline/pipeline/list", () => ({
      pipelines: [
        {
          id: "pipeline_home",
          name: "Home Assistant",
          language: "en",
          conversation_engine: "conversation.home_assistant",
          conversation_language: "en",
          stt_engine: "stt.cloud",
          stt_language: "en-US",
          tts_engine: "tts.cloud",
          tts_language: "en-US",
          tts_voice: "JennyNeural",
          wake_word_entity: null,
          wake_word_id: null,
        },
      ],
      preferred_pipeline: "pipeline_home",
    }));
    hass.mockWS("conversation/agent/list", () => ({
      agents: [
        {
          id: "conversation.home_assistant",
          name: "Home Assistant",
          supported_languages: "*",
        },
        {
          id: "conversation.openai",
          name: "OpenAI Conversation",
          supported_languages: ["en"],
        },
      ],
    }));
    hass.mockWS("stt/engine/list", () => ({
      providers: [
        {
          engine_id: "stt.cloud",
          name: "Home Assistant Cloud",
          supported_languages: ["en-US"],
          deprecated: false,
        },
      ],
    }));
    hass.mockWS("tts/engine/list", () => ({
      providers: [
        {
          engine_id: "tts.cloud",
          name: "Home Assistant Cloud",
          supported_languages: ["en-US"],
          deprecated: false,
        },
      ],
    }));
    hass.mockWS("tts/engine/voices", () => ({
      voices: [
        { voice_id: "JennyNeural", name: "Jenny" },
        { voice_id: "GuyNeural", name: "Guy" },
      ],
    }));
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

  private _dialogManager = (e: HASSDomEvent<ShowDialogParams<unknown>>) => {
    const { dialogTag, dialogImport, dialogParams, addHistory, parentElement } =
      e.detail;
    showDialog(
      this,
      dialogTag,
      dialogParams,
      dialogImport,
      parentElement,
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
                    ${
                      value?.description
                        ? html`<span slot="description"
                            >${value?.description}</span
                          >`
                        : nothing
                    }
                    <ha-selector
                      .hass=${this.hass}
                      .selector=${value!.selector}
                      .context=${value!.context}
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
