/* eslint-disable lit/no-template-arrow */
import "@material/mwc-button";
import { LitElement, TemplateResult, css, html } from "lit";
import { customElement, state } from "lit/decorators";
import "../../../../src/components/ha-selector/ha-selector";
import "../../../../src/components/ha-settings-row";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import type { HomeAssistant } from "../../../../src/types";
import "../../components/demo-black-white-row";
import { BlueprintInput } from "../../../../src/data/blueprint";
import { mockEntityRegistry } from "../../../../demo/src/stubs/entity_registry";
import { mockDeviceRegistry } from "../../../../demo/src/stubs/device_registry";
import { mockAreaRegistry } from "../../../../demo/src/stubs/area_registry";
import { mockHassioSupervisor } from "../../../../demo/src/stubs/hassio_supervisor";
import { getEntity } from "../../../../src/fake_data/entity";
import { ProvideHassElement } from "../../../../src/mixins/provide-hass-lit-mixin";
import { showDialog } from "../../../../src/dialogs/make-dialog-manager";

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

const DEVICES = [
  {
    area_id: "bedroom",
    configuration_url: null,
    config_entries: ["config_entry_1"],
    connections: [],
    disabled_by: null,
    entry_type: null,
    id: "device_1",
    identifiers: [["demo", "volume1"] as [string, string]],
    manufacturer: null,
    model: null,
    name_by_user: null,
    name: "Dishwasher",
    sw_version: null,
    hw_version: null,
    via_device_id: null,
  },
  {
    area_id: "backyard",
    configuration_url: null,
    config_entries: ["config_entry_2"],
    connections: [],
    disabled_by: null,
    entry_type: null,
    id: "device_2",
    identifiers: [["demo", "pwm1"] as [string, string]],
    manufacturer: null,
    model: null,
    name_by_user: null,
    name: "Lamp",
    sw_version: null,
    hw_version: null,
    via_device_id: null,
  },
  {
    area_id: null,
    configuration_url: null,
    config_entries: ["config_entry_3"],
    connections: [],
    disabled_by: null,
    entry_type: null,
    id: "device_3",
    identifiers: [["demo", "pwm1"] as [string, string]],
    manufacturer: null,
    model: null,
    name_by_user: "User name",
    name: "Technical name",
    sw_version: null,
    hw_version: null,
    via_device_id: null,
  },
];

const AREAS = [
  {
    area_id: "backyard",
    name: "Backyard",
    picture: null,
  },
  {
    area_id: "bedroom",
    name: "Bedroom",
    picture: null,
  },
  {
    area_id: "livingroom",
    name: "Livingroom",
    picture: null,
  },
];

const SCHEMAS: {
  name: string;
  input: Record<string, BlueprintInput | null>;
}[] = [
  {
    name: "One of each",
    input: {
      entity: { name: "Entity", selector: { entity: {} } },
      attribute: {
        name: "Attribute",
        selector: { attribute: { entity_id: "" } },
      },
      device: { name: "Device", selector: { device: {} } },
      duration: { name: "Duration", selector: { duration: {} } },
      addon: { name: "Addon", selector: { addon: {} } },
      area: { name: "Area", selector: { area: {} } },
      target: { name: "Target", selector: { target: {} } },
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
      select: {
        name: "Select",
        selector: { select: { options: ["Option 1", "Option 2"] } },
      },
      icon: { name: "Icon", selector: { icon: {} } },
      media: { name: "Media", selector: { media: {} } },
    },
  },
];

@customElement("demo-components-ha-selector")
class DemoHaSelector extends LitElement implements ProvideHassElement {
  @state() public hass!: HomeAssistant;

  private data = SCHEMAS.map(() => ({}));

  constructor() {
    super();
    const hass = provideHass(this);
    hass.updateTranslations(null, "en");
    hass.updateTranslations("config", "en");
    hass.addEntities(ENTITIES);
    mockEntityRegistry(hass);
    mockDeviceRegistry(hass, DEVICES);
    mockAreaRegistry(hass, AREAS);
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
          thumbnail: null,
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
      ${SCHEMAS.map((info, idx) => {
        const data = this.data[idx];
        const valueChanged = (ev) => {
          this.data[idx] = {
            ...data,
            [ev.target.key]: ev.detail.value,
          };
          this.requestUpdate();
        };
        return html`
          <demo-black-white-row .title=${info.name} .value=${this.data[idx]}>
            ${["light", "dark"].map((slot) =>
              Object.entries(info.input).map(
                ([key, value]) =>
                  html`
                    <ha-settings-row narrow slot=${slot}>
                      <span slot="heading">${value?.name || key}</span>
                      <span slot="description">${value?.description}</span>
                      <ha-selector
                        .hass=${this.hass}
                        .selector=${value!.selector}
                        .key=${key}
                        .value=${data[key] ?? value!.default}
                        @value-changed=${valueChanged}
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

  static styles = css`
    ha-selector {
      width: 60;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-selector": DemoHaSelector;
  }
}
