import "@polymer/paper-input/paper-input";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import {
  array,
  assert,
  boolean,
  number,
  object,
  optional,
  string,
} from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeRTLDirection } from "../../../../common/util/compute_rtl";
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
import {
  EditorTarget,
  entitiesConfigStruct,
  EntitiesEditorEvent,
} from "../types";
import { configElementStyle } from "./config-elements-style";

const cardConfigStruct = object({
  type: string(),
  title: optional(string()),
  aspect_ratio: optional(string()),
  default_zoom: optional(number()),
  dark_mode: optional(boolean()),
  entities: array(entitiesConfigStruct),
  hours_to_show: optional(number()),
  geo_location_sources: optional(array()),
});

@customElement("hui-map-card-editor")
export class HuiMapCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @internalProperty() private _config?: MapCardConfig;

  @internalProperty() private _configEntities?: EntityConfig[];

  public setConfig(config: MapCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
    this._configEntities = config.entities
      ? processEditorEntities(config.entities)
      : [];
  }

  get _title(): string {
    return this._config!.title || "";
  }

  get _aspect_ratio(): string {
    return this._config!.aspect_ratio || "";
  }

  get _default_zoom(): number {
    return this._config!.default_zoom || 0;
  }

  get _geo_location_sources(): string[] {
    return this._config!.geo_location_sources || [];
  }

  get _hours_to_show(): number {
    return this._config!.hours_to_show || 0;
  }

  get _dark_mode(): boolean {
    return this._config!.dark_mode || false;
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      <div class="card-config">
        <paper-input
          .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.title"
          )}
          (${this.hass.localize(
            "ui.panel.lovelace.editor.card.config.optional"
          )})"
          .value=${this._title}
          .configValue=${"title"}
          @value-changed=${this._valueChanged}
        ></paper-input>
        <div class="side-by-side">
          <paper-input
            .label="${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.aspect_ratio"
            )}
            (${this.hass.localize(
              "ui.panel.lovelace.editor.card.config.optional"
            )})"
            .value=${this._aspect_ratio}
            .configValue=${"aspect_ratio"}
            @value-changed=${this._valueChanged}
          ></paper-input>
          <paper-input
            .label="${this.hass.localize(
              "ui.panel.lovelace.editor.card.map.default_zoom"
            )}
            (${this.hass.localize(
              "ui.panel.lovelace.editor.card.config.optional"
            )})"
            type="number"
            .value=${this._default_zoom}
            .configValue=${"default_zoom"}
            @value-changed=${this._valueChanged}
          ></paper-input>
        </div>
        <div class="side-by-side">
          <ha-formfield
            .label=${this.hass.localize(
              "ui.panel.lovelace.editor.card.map.dark_mode"
            )}
            .dir=${computeRTLDirection(this.hass)}
          >
            <ha-switch
              .checked=${this._dark_mode}
              .configValue=${"dark_mode"}
              @change=${this._valueChanged}
            ></ha-switch
          ></ha-formfield>
          <paper-input
            .label="${this.hass.localize(
              "ui.panel.lovelace.editor.card.map.hours_to_show"
            )}
            (${this.hass.localize(
              "ui.panel.lovelace.editor.card.config.optional"
            )})"
            type="number"
            .value=${this._hours_to_show}
            .configValue=${"hours_to_show"}
            @value-changed=${this._valueChanged}
          ></paper-input>
        </div>
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
            .configValue=${"geo_location_sources"}
            @value-changed=${this._valueChanged}
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
      this._config = { ...this._config, entities: ev.detail.entities };

      this._configEntities = processEditorEntities(this._config.entities);
      fireEvent(this, "config-changed", { config: this._config });
    }
  }

  private _valueChanged(ev: PolymerChangedEvent<any>): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target! as EditorTarget;
    if (!target.configValue) {
      return;
    }

    let value = target.checked ?? ev.detail.value;

    if (value && target.type === "number") {
      value = Number(value);
    }
    if (this[`_${target.configValue}`] === value) {
      return;
    }
    if (value === "") {
      this._config = { ...this._config };
      delete this._config[target.configValue!];
    } else if (target.configValue) {
      this._config = {
        ...this._config,
        [target.configValue]: value,
      };
    }
    fireEvent(this, "config-changed", { config: this._config });
  }

  static get styles(): CSSResultArray {
    return [
      configElementStyle,
      css`
        .geo_location_sources {
          padding-left: 20px;
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
