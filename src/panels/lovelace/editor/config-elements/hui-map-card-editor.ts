import {
  html,
  css,
  LitElement,
  TemplateResult,
  customElement,
  property,
  CSSResult,
} from "lit-element";
import "@polymer/paper-input/paper-input";

import "../../components/hui-entity-editor";
import "../../components/hui-input-list-editor";

import { struct } from "../../common/structs/struct";
import { EntitiesEditorEvent, EditorTarget } from "../types";
import { HomeAssistant } from "../../../../types";
import { LovelaceCardEditor } from "../../types";
import { fireEvent } from "../../../../common/dom/fire_event";
import { configElementStyle } from "./config-elements-style";
import { processEditorEntities } from "../process-editor-entities";
import { EntityConfig } from "../../entity-rows/types";
import { PolymerChangedEvent } from "../../../../polymer-types";
import { MapCardConfig } from "../../cards/types";

const entitiesConfigStruct = struct.union([
  {
    entity: "entity-id",
    name: "string?",
    icon: "icon?",
  },
  "entity-id",
]);

const cardConfigStruct = struct({
  type: "string",
  title: "string?",
  aspect_ratio: "string?",
  default_zoom: "number?",
  dark_mode: "boolean?",
  entities: [entitiesConfigStruct],
  geo_location_sources: "array?",
});

@customElement("hui-map-card-editor")
export class HuiMapCardEditor extends LitElement implements LovelaceCardEditor {
  @property() public hass?: HomeAssistant;

  @property() private _config?: MapCardConfig;

  @property() private _configEntities?: EntityConfig[];

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

  get _dark_mode(): boolean {
    return this._config!.dark_mode || false;
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
        <paper-toggle-button
          ?checked="${this._dark_mode !== false}"
          .configValue="${"dark_mode"}"
          @change="${this._valueChanged}"
          >Dark Mode?</paper-toggle-button
        >
        <hui-entity-editor
          .hass="${this.hass}"
          .entities="${this._configEntities}"
          @entities-changed="${this._entitiesValueChanged}"
        ></hui-entity-editor>
        <h3>Geolocation Sources</h3>
        <div class="geo_location_sources">
          <hui-input-list-editor
            inputLabel="Source"
            .hass="${this.hass}"
            .value="${this._geo_location_sources}"
            .configValue="${"geo_location_sources"}"
            @value-changed="${this._valueChanged}"
          ></hui-input-list-editor>
        </div>
      </div>
    `;
  }

  private _entitiesValueChanged(ev: EntitiesEditorEvent): void {
    if (!this._config || !this.hass) {
      return;
    }
    if (ev.detail && ev.detail.entities) {
      this._config.entities = ev.detail.entities;
      this._configEntities = processEditorEntities(this._config.entities);
      fireEvent(this, "config-changed", { config: this._config });
    }
  }

  private _valueChanged(ev: PolymerChangedEvent<any>): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target! as EditorTarget;
    if (
      target.configValue &&
      ev.detail &&
      this[`_${target.configValue}`] === ev.detail.value
    ) {
      return;
    }
    if (target.configValue && ev.detail) {
      if (
        ev.detail.value === "" ||
        (target.type === "number" && isNaN(Number(ev.detail.value)))
      ) {
        delete this._config[target.configValue!];
      } else {
        let value: any = ev.detail.value;
        if (target.type === "number") {
          value = Number(value);
        }
        this._config = {
          ...this._config,
          [target.configValue]:
            target.checked !== undefined ? target.checked : value,
        };
      }
    }
    fireEvent(this, "config-changed", { config: this._config });
  }

  static get styles(): CSSResult {
    return css`
      .geo_location_sources {
        padding-left: 20px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-map-card-editor": HuiMapCardEditor;
  }
}
