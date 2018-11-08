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
import "../components/hui-theme-select-editor";
import "../components/hui-entity-editor";
import "../../../components/ha-card";
import "../../../components/ha-icon";
import { processEditorEntities } from "./process-editor-entities";

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
    this._configEntities = processEditorEntities(config.entities);
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }

    return html`
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
      <hui-entity-editor
        .hass="${this.hass}"
        .entities="${this._configEntities}"
        @change="${this._valueChanged}"
      ></hui-entity-editor>
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

  private _valueChanged(ev: MouseEvent): void {
    if (!this._config || !this.hass) {
      return;
    }

    const target = ev.target! as any;
    let newConfig = this._config;

    if (!target.entities) {
      newConfig = {
        ...this._config,
        [target.configValue]:
          target.checked !== undefined ? target.checked : target.value,
      };
    } else {
      newConfig.entities = target.entities;
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
