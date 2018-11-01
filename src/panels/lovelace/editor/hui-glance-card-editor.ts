import { html, LitElement } from "@polymer/lit-element";
import processConfigEntities from "../common/process-config-entities";

import "../../../components/entity/state-badge.js";
import "../../../components/ha-card.js";
import "../../../components/ha-icon.js";

import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { HomeAssistant } from "../../../types.js";
import { LovelaceConfig, LovelaceCardEditor } from "../types.js";

interface EntityConfig {
  name: string;
  icon: string;
  entity: string;
  tap_action: "toggle" | "call-service" | "more-info";
  hold_action?: "toggle" | "call-service" | "more-info";
  service?: string;
  service_data?: object;
}

interface Config extends LovelaceConfig {
  show_name?: boolean;
  show_state?: boolean;
  title?: string;
  theme?: string;
  entities: EntityConfig[];
  columns?: number;
}

export class HuiGlanceCardEditor extends hassLocalizeLitMixin(LitElement)
  implements LovelaceCardEditor {
  public hass?: HomeAssistant;
  protected _config?: Config;
  protected _configEntities?: EntityConfig[];

  static get properties() {
    return {
      hass: {},
      _config: {},
    };
  }

  public setConfig(config: Config) {
    this._config = config;
    const entities = processConfigEntities(config.entities);

    this._configEntities = entities;
  }

  protected render() {
    if (!this._config || !this.hass) {
      return html``;
    }

    return html`
      <paper-input label="Title" value="${this._config.title}"></paper-input>
      ${this._configEntities!.map((entityConf) =>
        this.renderEntity(entityConf)
      )}
      <paper-checkbox ?checked="${this._config.show_name !==
        false}">Show Entity's Name?</paper-checkbox>
      <paper-checkbox ?checked="${this._config.show_state !==
        false}">Show Entity's state-text?</paper-checkbox>
    `;
  }

  private renderEntity(entityConf) {
    return html`
        <ha-entity-picker
            hass="${this.hass}"
            value="${entityConf.entity || entityConf}"
            allow-custom-entity
        ></ha-entity-picker>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-glance-card-editor": HuiGlanceCardEditor;
  }
}

customElements.define("hui-glance-card-editor", HuiGlanceCardEditor);
