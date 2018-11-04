import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import "@polymer/paper-checkbox/paper-checkbox.js";

import processConfigEntities from "../common/process-config-entities";
import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { HomeAssistant } from "../../../types.js";
import { LovelaceCardEditor } from "../types.js";
import { fireEvent } from "../../../common/dom/fire_event.js";
import { Config, EntityConfig } from "../cards/hui-glance-card";

import "../../../components/entity/state-badge.js";
import "../../../components/entity/ha-entity-picker";
import "../../../components/ha-card.js";
import "../../../components/ha-icon.js";
import { TemplateResult } from "lit-html";

export class HuiGlanceCardEditor extends hassLocalizeLitMixin(LitElement)
  implements LovelaceCardEditor {
  public hass?: HomeAssistant;
  private _config?: Config;
  private _configEntities?: EntityConfig[];

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      _config: {},
    };
  }

  public setConfig(config: Config): void {
    this._config = config;
    const entities = processConfigEntities(config.entities);

    this._configEntities = entities;
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    return html`
      <paper-input
        id="title"
        @value-changed="${this._valueChanged}"
        label="Title"
        value="${this._config.title}"
      ></paper-input>
      ${this._configEntities!.map((entityConf) =>
        this.renderEntity(entityConf)
      )}<br>
      <paper-checkbox
        id="show_name"
        @change="${this._valueChanged}"
        ?checked="${this._config.show_name !== false}"
      >Show Entity's Name?</paper-checkbox><br><br>
      <paper-checkbox
        id="show_state"
        @change="${this._valueChanged}"
        ?checked="${this._config.show_state !== false}"
      >Show Entity's State Text?</paper-checkbox><br>
    `;
  }

  private renderEntity(entityConf: EntityConfig): TemplateResult {
    return html`
      <ha-entity-picker
        hass="${this.hass}"
        value="${entityConf.entity || entityConf}"
        allow-custom-entity
      ></ha-entity-picker>
    `;
  }

  private _valueChanged(ev: MouseEvent): void {
    if (!this._config || !this.hass) {
      return;
    }

    const target = ev.target! as any;

    const newValue =
      target.checked !== undefined ? target.checked : target.value;

    // Unsure why I could not grab a propery value ".configValue='show_name'" and ev.target.configValue wasnt working
    this._config[target.id] = newValue;

    fireEvent(this, "config-changed", {
      config: this._config,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-glance-card-editor": HuiGlanceCardEditor;
  }
}

customElements.define("hui-glance-card-editor", HuiGlanceCardEditor);
