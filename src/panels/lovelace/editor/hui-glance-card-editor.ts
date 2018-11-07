import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import "@polymer/paper-checkbox/paper-checkbox";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";

import processConfigEntities from "../common/process-config-entities";
import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { HomeAssistant } from "../../../types";
import { LovelaceCardEditor } from "../types";
import { fireEvent } from "../../../common/dom/fire_event";
import { Config, EntityConfig } from "../cards/hui-glance-card";

import "../../../components/entity/state-badge";
import "../../../components/entity/ha-entity-picker";
import "../components/hui-theme-select-editor";
import "../../../components/ha-card";
import "../../../components/ha-icon";

export class HuiGlanceCardEditor extends hassLocalizeLitMixin(LitElement)
  implements LovelaceCardEditor {
  public hass?: HomeAssistant;
  private _config?: Config;
  private _configEntities?: EntityConfig[];

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      _config: {},
      _configEntities: {},
    };
  }

  public setConfig(config: Config): void {
    this._config = { type: "glance", ...config };
    const entities = processConfigEntities(config.entities);

    this._configEntities = entities;
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }

    return html`
      ${this.renderStyle()}
      <paper-input
        label="Title"
        value="${this._config!.title}"
        .configValue="${"title"}"
        .type="${"input"}"
        @value-changed="${this._valueChanged}"
      ></paper-input>
      <hui-theme-select-editor
        .hass="${this.hass}"
        .value="${this._config!.theme}"
        .type="${"input"}"
        .configValue="${"theme"}"
        @change="${this._valueChanged}"
      ></hui-theme-select-editor
      ><br />
      <paper-input
        label="Columns"
        value="${this._config!.columns || ""}"
        .configValue="${"columns"}"
        .type="${"input"}"
        @value-changed="${this._valueChanged}"
      ></paper-input>
      <h4>Entities</h4>
      <div class="entities">
        ${
          this._configEntities!.map((entityConf, index) => {
            return this.renderEntity(entityConf, index!);
          })
        }
      </div>
      <br />
      <paper-button noink raised @click="${this.addEntity}"
        >Add Entity</paper-button
      >
      <br /><br />
      <paper-checkbox
        ?checked="${this._config!.show_name !== false}"
        .configValue="${"show_name"}"
        .type="${"checkbox"}"
        @change="${this._valueChanged}"
        >Show Entity's Name?</paper-checkbox
      ><br /><br />
      <paper-checkbox
        ?checked="${this._config!.show_state !== false}"
        .configValue="${"show_state"}"
        .type="${"checkbox"}"
        @change="${this._valueChanged}"
        >Show Entity's State Text?</paper-checkbox
      ><br />
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        .entities {
          padding-left: 20px;
        }
      </style>
    `;
  }

  private renderEntity(
    entityConf: EntityConfig,
    index: number
  ): TemplateResult {
    return html`
      <ha-entity-picker
        .hass="${this.hass}"
        .value="${entityConf.entity || entityConf}"
        .type="${"entity"}"
        .index="${index}"
        @change="${this._valueChanged}"
      ></ha-entity-picker>
    `;
  }

  private addEntity() {
    const newConfig = this._config!;
    const newConfigEntites = this._configEntities!;

    newConfigEntites.push(newConfigEntites[0].entity);
    newConfig.entities = newConfigEntites;

    fireEvent(this, "config-changed", {
      config: newConfig,
    });
  }

  private _valueChanged(ev: MouseEvent): void {
    if (!this._config || !this.hass) {
      return;
    }

    const target = ev.target! as any;
    let newConfig = this._config;
    const newConfigEntites = this._configEntities!;

    switch (target.type) {
      case "input":
        newConfig = { ...this._config, [target.configValue]: target.value };
        break;

      case "checkbox":
        newConfig = { ...this._config, [target.configValue]: target.checked };
        break;

      case "entity":
        if (target.value === "") {
          newConfigEntites.splice(target.index, 1);
        } else {
          newConfigEntites[target.index].entity = target.value;
        }
        newConfig.entities = newConfigEntites;
        break;
    }

    fireEvent(this, "config-changed", {
      config: newConfig,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-glance-card-editor": HuiGlanceCardEditor;
  }
}

customElements.define("hui-glance-card-editor", HuiGlanceCardEditor);
