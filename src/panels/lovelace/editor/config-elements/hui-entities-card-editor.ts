import {
  html,
  LitElement,
  PropertyDeclarations,
  TemplateResult,
} from "lit-element";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-toggle-button/paper-toggle-button";

import { processEditorEntities } from "../process-editor-entities";
import { struct } from "../../common/structs/struct";
import { EntitiesEditorEvent, EditorTarget } from "../types";
import { hassLocalizeLitMixin } from "../../../../mixins/lit-localize-mixin";
import { HomeAssistant } from "../../../../types";
import { LovelaceCardEditor } from "../../types";
import { fireEvent } from "../../../../common/dom/fire_event";
import {
  EntitiesCardConfig,
  EntitiesCardEntityConfig,
} from "../../cards/hui-entities-card";
import { configElementStyle } from "./config-elements-style";

import "../../../../components/entity/state-badge";
import "../../components/hui-theme-select-editor";
import "../../components/hui-entity-editor";
import "../../../../components/ha-card";
import "../../../../components/ha-icon";

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
  title: "string|number?",
  theme: "string?",
  show_header_toggle: "boolean?",
  entities: [entitiesConfigStruct],
});

export class HuiEntitiesCardEditor extends hassLocalizeLitMixin(LitElement)
  implements LovelaceCardEditor {
  static get properties(): PropertyDeclarations {
    return { hass: {}, _config: {}, _configEntities: {} };
  }

  get _title(): string {
    return this._config!.title || "";
  }

  get _theme(): string {
    return this._config!.theme || "Backend-selected";
  }

  public hass?: HomeAssistant;
  private _config?: EntitiesCardConfig;
  private _configEntities?: EntitiesCardEntityConfig[];

  public setConfig(config: EntitiesCardConfig): void {
    config = cardConfigStruct(config);
    this._config = config;
    this._configEntities = processEditorEntities(config.entities);
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
      if (target.value === "") {
        delete this._config[target.configValue!];
      } else {
        this._config = {
          ...this._config,
          [target.configValue]:
            target.checked !== undefined ? target.checked : target.value,
        };
      }
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
