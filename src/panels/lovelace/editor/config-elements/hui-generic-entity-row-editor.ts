import "@material/mwc-list/mwc-list-item";
import "@material/mwc-select/mwc-select";
import "@polymer/paper-input/paper-input";
import { CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { assert } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { domainIcon } from "../../../../common/entity/domain_icon";
import "../../../../components/ha-formfield";
import "../../../../components/ha-icon-picker";
import "../../../../components/ha-switch";
import { HomeAssistant } from "../../../../types";
import { EntitiesCardEntityConfig } from "../../cards/types";
import "../../components/hui-action-editor";
import "../../components/hui-entity-editor";
import "../../components/hui-theme-select-editor";
import { LovelaceRowEditor } from "../../types";
import { entitiesConfigStruct } from "../structs/entities-struct";
import { EditorTarget, EntitiesEditorEvent } from "../types";
import { configElementStyle } from "./config-elements-style";

const SecondaryInfoValues: { [key: string]: { domains?: string[] } } = {
  "entity-id": {},
  "last-changed": {},
  "last-updated": {},
  "last-triggered": { domains: ["automation", "script"] },
  position: { domains: ["cover"] },
  "tilt-position": { domains: ["cover"] },
  brightness: { domains: ["light"] },
};

@customElement("hui-generic-entity-row-editor")
export class HuiGenericEntityRowEditor
  extends LitElement
  implements LovelaceRowEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EntitiesCardEntityConfig;

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

    const domain = computeDomain(this._entity);
    const entityState = this.hass.states[this._entity];

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
          <ha-icon-picker
            .label=${this.hass!.localize(
              "ui.panel.lovelace.editor.card.generic.icon"
            )}
            .value=${this._config.icon}
            .configValue=${"icon"}
            .placeholder=${entityState?.attributes.icon}
            .fallbackPath=${!this._icon &&
            !entityState?.attributes.icon &&
            entityState
              ? domainIcon(computeDomain(entityState.entity_id), entityState)
              : undefined}
            @value-changed=${this._valueChanged}
          ></ha-icon-picker>
        </div>
        <mwc-select
          label="Secondary Info"
          .configValue=${"secondary_info"}
          @selected=${this._valueChanged}
          @closed=${stopPropagation}
          .value=${this._config.secondary_info || "none"}
          naturalMenuWidth
          fixedMenuPosition
        >
          <mwc-list-item value=""
            >${this.hass!.localize(
              "ui.panel.lovelace.editor.card.entities.secondary_info_values.none"
            )}</mwc-list-item
          >
          ${Object.keys(SecondaryInfoValues).map((info) => {
            if (
              !("domains" in SecondaryInfoValues[info]) ||
              ("domains" in SecondaryInfoValues[info] &&
                SecondaryInfoValues[info].domains!.includes(domain))
            ) {
              return html`
                <mwc-list-item .value=${info}>
                  ${this.hass!.localize(
                    `ui.panel.lovelace.editor.card.entities.secondary_info_values.${info}`
                  )}
                </mwc-list-item>
              `;
            }
            return "";
          })}
        </mwc-select>
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
          [target.configValue!]: value,
        };
      }
    }

    fireEvent(this, "config-changed", { config: this._config });
  }

  static get styles(): CSSResultGroup {
    return configElementStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-generic-entity-row-editor": HuiGenericEntityRowEditor;
  }
}
