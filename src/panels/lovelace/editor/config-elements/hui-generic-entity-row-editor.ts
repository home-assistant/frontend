import "@polymer/paper-input/paper-input";
import {
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { assert } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeDomain } from "../../../../common/entity/compute_domain";
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

const SecondaryInfoValues: { [key: string]: { domains?: Set<string> } } = {
  none: {},
  "entity-id": {},
  "last-changed": {},
  "last-triggered": { domains: new Set(["automation", "script"]) },
  position: { domains: new Set(["cover"]) },
  "tilt-position": { domains: new Set(["cover"]) },
  brightness: { domains: new Set(["light"]) },
};

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

  get _icon(): string {
    return this._config!.icon || "";
  }

  get _secondary_info(): string {
    return this._config!.secondary_info || "";
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    const domain = computeDomain(this._config.entity);

    return html`
      <div class="card-config">
        <ha-entity-picker
          allow-custom-entity
          .hass=${this.hass}
          .value=${this._config.entity}
          .configValue=${"entity"}
          @change=${this._valueChanged}
        ></ha-entity-picker>
        <div class="side-by-side">
          <paper-input
            .label=${this.hass!.localize(
              "ui.panel.lovelace.editor.card.generic.name"
            )}
            .value=${this._config.name}
            .configValue=${"name"}
            @value-changed=${this._valueChanged}
          ></paper-input>
          <ha-icon-input
            .label=${this.hass!.localize(
              "ui.panel.lovelace.editor.card.generic.icon"
            )}
            .value=${this._config.icon}
            .placeholder=${stateIcon(this.hass!.states[this._config.entity])}
            .configValue=${"icon"}
            @value-changed=${this._valueChanged}
          ></ha-icon-input>
        </div>
        <paper-dropdown-menu .label=${"Secondary Info"}>
          <paper-listbox
            slot="dropdown-content"
            attr-for-selected="value"
            .selected=${this._config.secondary_info || "none"}
            .configValue=${"secondary_info"}
            @iron-select=${this._valueChanged}
          >
            ${Object.keys(SecondaryInfoValues).map((info) => {
              if (
                !("domains" in SecondaryInfoValues[info]) ||
                ("domains" in SecondaryInfoValues[info] &&
                  SecondaryInfoValues[info].domains!.has(domain))
              ) {
                return html`
                  <paper-item .value=${info === "none" ? "" : info}
                    >${this.hass!.localize(
                      `ui.panel.lovelace.editor.card.entities.secondary_info_values.${info}`
                    )}</paper-item
                  >
                `;
              }
              return "";
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
    const value = target.value || ev.detail?.item?.value;

    if (this[`_${target.configValue}`] === value) {
      return;
    }

    if (target.configValue) {
      if (value === "" || !value) {
        this._config = { ...this._config };
        delete this._config[target.configValue!];
      } else {
        this._config = {
          ...this._config,
          [target.configValue!]:
            target.checked !== undefined ? target.checked : value,
        };
      }
    }

    fireEvent(this, "config-changed", { config: this._config });
  }

  static get styles(): CSSResult {
    return configElementStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-generic-entity-row-editor": HuiGenericEntityRowEditor;
  }
}
