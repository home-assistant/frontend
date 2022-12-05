import "../../../../components/ha-form/ha-form";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  array,
  assert,
  boolean,
  number,
  object,
  optional,
  string,
  assign,
} from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-formfield";
import "../../../../components/ha-switch";
import { PolymerChangedEvent } from "../../../../polymer-types";
import { HomeAssistant } from "../../../../types";
import { MapCardConfig } from "../../cards/types";
import "../../components/hui-entity-editor";
import "../../components/hui-input-list-editor";
import { EntityConfig } from "../../entity-rows/types";
import { LovelaceCardEditor } from "../../types";
import { processEditorEntities } from "../process-editor-entities";
import { entitiesConfigStruct } from "../structs/entities-struct";
import { EntitiesEditorEvent } from "../types";
import { configElementStyle } from "./config-elements-style";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { SchemaUnion } from "../../../../components/ha-form/types";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    title: optional(string()),
    aspect_ratio: optional(string()),
    default_zoom: optional(number()),
    dark_mode: optional(boolean()),
    entities: array(entitiesConfigStruct),
    hours_to_show: optional(number()),
    geo_location_sources: optional(array(string())),
  })
);

const SCHEMA = [
  { name: "title", selector: { text: {} } },
  {
    name: "",
    type: "grid",
    schema: [
      { name: "aspect_ratio", selector: { text: {} } },
      { name: "default_zoom", selector: { number: { mode: "box", min: 0 } } },
      { name: "dark_mode", selector: { boolean: {} } },
      { name: "hours_to_show", selector: { number: { mode: "box", min: 1 } } },
    ],
  },
] as const;

@customElement("hui-map-card-editor")
export class HuiMapCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: MapCardConfig;

  @state() private _configEntities?: EntityConfig[];

  public setConfig(config: MapCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
    this._configEntities = config.entities
      ? processEditorEntities(config.entities)
      : [];
  }

  get _geo_location_sources(): string[] {
    return this._config!.geo_location_sources || [];
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
      <div class="card-config">
        <hui-entity-editor
          .hass=${this.hass}
          .entities=${this._configEntities}
          @entities-changed=${this._entitiesValueChanged}
        ></hui-entity-editor>
        <h3>
          ${this.hass.localize(
            "ui.panel.lovelace.editor.card.map.geo_location_sources"
          )}
        </h3>
        <div class="geo_location_sources">
          <hui-input-list-editor
            .inputLabel=${this.hass.localize(
              "ui.panel.lovelace.editor.card.map.source"
            )}
            .hass=${this.hass}
            .value=${this._geo_location_sources}
            @value-changed=${this._geoSourcesChanged}
          ></hui-input-list-editor>
        </div>
      </div>
    `;
  }

  private _entitiesValueChanged(ev: EntitiesEditorEvent): void {
    if (ev.detail && ev.detail.entities) {
      this._config = { ...this._config!, entities: ev.detail.entities };

      this._configEntities = processEditorEntities(this._config.entities);
      fireEvent(this, "config-changed", { config: this._config! });
    }
  }

  private _geoSourcesChanged(ev: PolymerChangedEvent<any>): void {
    if (!this._config || !this.hass) {
      return;
    }

    const value = ev.detail.value;

    if (this._geo_location_sources === value) {
      return;
    }

    if (value === "") {
      this._config = { ...this._config };
      delete this._config.geo_location_sources;
    } else {
      this._config = {
        ...this._config,
        geo_location_sources: value,
      };
    }
    fireEvent(this, "config-changed", { config: this._config });
  }

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _computeLabelCallback = (schema: SchemaUnion<typeof SCHEMA>) => {
    switch (schema.name) {
      case "dark_mode":
      case "default_zoom":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.map.${schema.name}`
        );
      default:
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
    }
  };

  static get styles(): CSSResultGroup {
    return [
      configElementStyle,
      css`
        .geo_location_sources {
          padding-left: 20px;
          padding-inline-start: 20px;
          direction: var(--direction);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-map-card-editor": HuiMapCardEditor;
  }
}
