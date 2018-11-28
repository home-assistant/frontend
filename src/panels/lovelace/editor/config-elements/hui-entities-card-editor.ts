import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-toggle-button/paper-toggle-button";

import { processEditorEntities } from "../process-editor-entities";

import { EntitiesEditorEvent, EditorTarget } from "../types";
import { hassLocalizeLitMixin } from "../../../../mixins/lit-localize-mixin";
import { HomeAssistant } from "../../../../types";
import { LovelaceCardEditor } from "../../types";
import { fireEvent } from "../../../../common/dom/fire_event";
import { Config, ConfigEntity } from "../../cards/hui-entities-card";
import { configElementStyle } from "./config-elements-style";

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
    const requiredKeys = ["type", "entities", "id"];
    const optionalKeys = ["title", "show_header_toggle"];
    const allKeys = optionalKeys.concat(requiredKeys);

    const requiredEntKeys = ["entity"];
    const optionalEntKeys = ["name", "icon"];
    const allEntKeys = optionalEntKeys.concat(requiredEntKeys);

    requiredKeys.forEach((key) => {
      if (!config.hasOwnProperty(key)) {
        throw new Error(`Missing required option: '${key}'`);
      }
    });
    Object.keys(config).forEach((key) => {
      if (allKeys.indexOf(key) === -1) {
        throw new Error(`Unsupported option: '${key}'`);
      }
    });

    if (!Array.isArray(config.entities)) {
      throw new Error("Entities need to be an array");
    }
    config.entities.forEach((entity) => {
      if (typeof entity === "string") {
        return;
      }
      requiredEntKeys.forEach((key) => {
        if (!entity.hasOwnProperty(key)) {
          throw new Error(`Missing required entity option: '${key}'`);
        }
      });
      Object.keys(entity).forEach((key) => {
        if (allEntKeys.indexOf(key) === -1) {
          throw new Error(`Unsupported entity option: '${key}'`);
        }
      });
    });

    this._config = { type: "entities", ...config };
    this._configEntities = processEditorEntities(config.entities);
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }

    return html`
      ${configElementStyle}
      <div class="card-config">
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
        <paper-toggle-button
          ?checked="${this._config!.show_header_toggle !== false}"
          .configValue="${"show_header_toggle"}"
          @change="${this._valueChanged}"
          >Show Header Toggle?</paper-toggle-button
        >
      </div>
      <hui-entity-editor
        .hass="${this.hass}"
        .entities="${this._configEntities}"
        @entities-changed="${this._valueChanged}"
      ></hui-entity-editor>
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
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entities-card-editor": HuiEntitiesCardEditor;
  }
}

customElements.define("hui-entities-card-editor", HuiEntitiesCardEditor);
