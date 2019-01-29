import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
} from "lit-element";
import "@polymer/paper-input/paper-input";

import { struct } from "../../common/structs/struct";
import { EntitiesEditorEvent, EditorTarget } from "../types";
import { HomeAssistant } from "../../../../types";
import { LovelaceCardEditor } from "../../types";
import { fireEvent } from "../../../../common/dom/fire_event";
import { MapCardConfig } from "../../cards/hui-map-card";
import { configElementStyle } from "./config-elements-style";
import { processEditorEntities } from "../process-editor-entities";
import { EntityConfig } from "../../entity-rows/types";

import "../../components/hui-entity-editor";

const entitiesConfigStruct = struct.union([
  {
    entity: "entity-id",
    name: "string?",
    icon: "icon?",
  },
  "entity-id",
]);

const SOURCES = [
  "geo_json_events",
  "nsw_rural_fire_service_feed",
  "usgs_earthquakes_feed",
];

const cardConfigStruct = struct({
  type: "string",
  title: "string?",
  aspect_ratio: "string?",
  default_zoom: "number?",
  entities: [entitiesConfigStruct],
  geo_location_sources: [""],
});

@customElement("hui-map-card-editor")
export class HuiMapCardEditor extends LitElement implements LovelaceCardEditor {
  @property() public hass?: HomeAssistant;

  @property() private _config?: MapCardConfig;

  @property() private _configEntities?: EntityConfig[];

  @property() private _geolocationSources?: string[];

  public setConfig(config: MapCardConfig): void {
    config = cardConfigStruct(config);
    this._config = config;
    this._configEntities = processEditorEntities(config.entities);
  }

  get _title(): string {
    return this._config!.title || "";
  }

  get _aspect_ratio(): string {
    return this._config!.aspect_ratio || "";
  }

  get _default_zoom(): number {
    return this._config!.default_zoom || NaN;
  }

  get _geo_location_sources(): string[] {
    return this._config!.geo_location_sources || [];
  }

  protected render(): TemplateResult | void {
    if (!this.hass) {
      return html``;
    }

    return html`
      ${configElementStyle}
      <div class="card-config">
        <paper-input
          label="Title"
          .value="${this._title}"
          .configValue="${"title"}"
          @value-changed="${this._valueChanged}"
        ></paper-input>
        <div class="side-by-side">
          <paper-input
            label="Aspect Ratio"
            .value="${this._aspect_ratio}"
            .configValue="${"aspect_ratio"}"
            @value-changed="${this._valueChanged}"
          ></paper-input>
          <paper-input
            label="Default Zoom"
            type="number"
            .value="${this._default_zoom}"
            .configValue="${"default_zoom"}"
            @value-changed="${this._valueChanged}"
          ></paper-input>
        </div>
        <hui-entity-editor
          .hass="${this.hass}"
          .entities="${this._configEntities}"
          @entities-changed="${this._valueChanged}"
        ></hui-entity-editor>
        <paper-card heading="Geolocation Sources">
          <paper-listbox
            id="geo_location_sources"
            multi
            on-selected-items-changed="_fetchData"
            selected-values="{{selectedSources}}"
            attr-for-selected="item-name"
          >
            <template is="dom-repeat" items="[[geo_location_sources]]">
              <paper-item item-name="[[item.entity_id]]">
                <span
                  class="calendar_color"
                  style$="background-color: [[item.color]]"
                ></span>
                <span class="calendar_color_spacer"></span> [[item.name]]
              </paper-item>
            </template>
          </paper-listbox>
        </paper-card>
      </div>
    `;
  }

  private _valueChanged(ev: EntitiesEditorEvent): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target! as EditorTarget;
    if (target.configValue && this[`_${target.configValue}`] === target.value) {
      return;
    }
    if (ev.detail && ev.detail.entities) {
      this._config.entities = ev.detail.entities;
      this._configEntities = processEditorEntities(this._config.entities);
    } else if (target.configValue) {
      if (
        target.value === "" ||
        (target.type === "number" && isNaN(Number(target.value)))
      ) {
        delete this._config[target.configValue!];
      } else {
        let value: any = target.value;
        if (target.type === "number") {
          value = Number(value);
        }
        this._config = {
          ...this._config,
          [target.configValue!]: value,
        };
      }
    }
    fireEvent(this, "config-changed", { config: this._config });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-map-card-editor": HuiMapCardEditor;
  }
}
