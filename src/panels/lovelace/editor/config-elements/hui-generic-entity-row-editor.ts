import "@polymer/paper-input/paper-input";
import {
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { assert } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stateIcon } from "../../../../common/entity/state_icon";
import "../../../../components/ha-formfield";
import "../../../../components/ha-icon-input";
import "../../../../components/ha-switch";
import { HomeAssistant } from "../../../../types";
import { EntitiesCardEntityConfig } from "../../cards/types";
import "../../components/hui-action-editor";
import "../../components/hui-entity-editor";
import "../../components/hui-theme-select-editor";
import { LovelaceRowEditor } from "../../types";
import {
  EditorTarget,
  entitiesConfigStruct,
  EntitiesEditorEvent,
} from "../types";
import { configElementStyle } from "./config-elements-style";

const SecondaryInfoValues = [
  "entity-id",
  "last-changed",
  "last-triggered",
  "position",
  "tilt-position",
  "brightness",
];

@customElement("hui-generic-entity-row-editor")
export class HuiGenericEntityRowEditor extends LitElement
  implements LovelaceRowEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @internalProperty() private _config?: EntitiesCardEntityConfig;

  public setConfig(config: EntitiesCardEntityConfig): void {
    assert(config, entitiesConfigStruct);
    this._config = config;
  }

  get _entity(): string {
    return this._config!.entity || "";
  }

  get _name(): string {
    return this._config!.name || "";
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      ${configElementStyle}
      <div class="card-config">
        <ha-entity-picker
          .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.entity"
          )} (${this.hass.localize(
            "ui.panel.lovelace.editor.card.config.optional"
          )})"
          .hass=${this.hass}
          .value="${this._entity}"
          .configValue=${"entity"}
          @change="${this._valueChanged}"
          allow-custom-entity
        ></ha-entity-picker>
        <ha-entity-picker
          .hass=${this.hass}
          .value=${this._config.entity}
          @change=${this._valueChanged}
          allow-custom-entity
        ></ha-entity-picker>
        <paper-input
          .label=${this.hass!.localize(
            "ui.panel.lovelace.editor.card.generic.name"
          )}
          .value=${this._config.name}
          .configValue=${"name"}
        ></paper-input>
        <ha-icon-input
          .label=${this.hass!.localize(
            "ui.panel.lovelace.editor.card.generic.icon"
          )}
          .value=${this._config.icon}
          .placeholder=${stateIcon(this.hass!.states[this._config.entity])}
          .configValue=${"icon"}
        ></ha-icon-input>

        <paper-dropdown-menu
          .label=${"Secondary Info"}
          .configValue="${"secondary_info"}"
        >
          <paper-listbox
            slot="dropdown-content"
            .selected=${this._config.secondary_info}
          >
            ${SecondaryInfoValues.map((info) => {
              return html`<paper-item>${info}</paper-item> `;
            })}
          </paper-listbox>
        </paper-dropdown-menu>
      </div>
    `;
  }

  private _valueChanged(ev: EntitiesEditorEvent): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target! as EditorTarget;

    if (
      this[`_${target.configValue}`] === target.value ||
      this[`_${target.configValue}`] === target.config
    ) {
      return;
    }
    if (target.configValue) {
      if (target.value === "") {
        this._config = { ...this._config };
        delete this._config[target.configValue!];
      } else {
        let newValue: string | undefined;
        if (
          target.configValue === "icon_height" &&
          !isNaN(Number(target.value))
        ) {
          newValue = `${String(target.value)}px`;
        }
        this._config = {
          ...this._config,
          [target.configValue!]:
            target.checked !== undefined
              ? target.checked
              : newValue !== undefined
              ? newValue
              : target.value
              ? target.value
              : target.config,
        };
      }
    }
    fireEvent(this, "config-changed", { config: this._config });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-generic-entity-row-editor": HuiGenericEntityRowEditor;
  }
}
