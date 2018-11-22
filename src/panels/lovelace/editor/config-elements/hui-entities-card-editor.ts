import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import "@polymer/paper-checkbox/paper-checkbox";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";

import { processEditorEntities } from "../process-editor-entities";
import { EntitiesEditorEvent, EditorTarget } from "../types";
import { hassLocalizeLitMixin } from "../../../../mixins/lit-localize-mixin";
import { HomeAssistant } from "../../../../types";
import { LovelaceCardEditor } from "../../types";
import { fireEvent } from "../../../../common/dom/fire_event";
import { Config, ConfigEntity } from "../../cards/hui-entities-card";

import "../../../../components/entity/state-badge";
import "../../components/hui-theme-select-editor";
import "../../components/hui-entity-editor";
import "../../../../components/ha-card";
import "../../../../components/ha-icon";

export class HuiEntitiesCardEditor extends hassLocalizeLitMixin(LitElement)
  implements LovelaceCardEditor {
  public hass?: HomeAssistant;
  private _config?: Config;
  private _configEntities?: ConfigEntity[];

  static get properties(): PropertyDeclarations {
    return { hass: {}, _config: {}, _configEntities: {} };
  }

  get _title(): string {
    return this._config!.title || "";
  }

  get _theme(): string {
    return this._config!.theme || "Backend-selected";
  }

  public setConfig(config: Config): void {
    this._config = { type: "entities", ...config };
    this._configEntities = processEditorEntities(config.entities);
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }

    return html`
      ${this.renderStyle()}
      <paper-input
        label="Title"
        value="${this._title}"
        .configValue="${"title"}"
        @value-changed="${this._valueChanged}"
      ></paper-input>
      <hui-theme-select-editor
        .hass="${this.hass}"
        .value="${this._theme}"
        .configValue="${"theme"}"
        @theme-changed="${this._valueChanged}"
      ></hui-theme-select-editor>
      <hui-entity-editor
        .hass="${this.hass}"
        .entities="${this._configEntities}"
        @entities-changed="${this._valueChanged}"
      ></hui-entity-editor>
      <paper-checkbox
        ?checked="${this._config!.show_header_toggle !== false}"
        .configValue="${"show_header_toggle"}"
        @change="${this._valueChanged}"
        >Show Header Toggle?</paper-checkbox
      >
    `;
  }

  private _valueChanged(ev: EntitiesEditorEvent): void {
    if (!this._config || !this.hass) {
      return;
    }

    const target = ev.target! as EditorTarget;

    if (
      (target.configValue! === "title" && target.value === this._title) ||
      (target.configValue! === "theme" && target.value === this._theme)
    ) {
      return;
    }

    if (ev.detail && ev.detail.entities) {
      this._config.entities = ev.detail.entities;
      this._configEntities = processEditorEntities(this._config.entities);
    } else if (target.configValue) {
      this._config = {
        ...this._config,
        [target.configValue]:
          target.checked !== undefined ? target.checked : target.value,
      };
    }

    fireEvent(this, "config-changed", { config: this._config });
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        paper-checkbox {
          display: block;
          padding-top: 16px;
        }
      </style>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entities-card-editor": HuiEntitiesCardEditor;
  }
}

customElements.define("hui-entities-card-editor", HuiEntitiesCardEditor);
