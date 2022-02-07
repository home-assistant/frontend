import "@polymer/paper-input/paper-input";
import { CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { assert, assign, boolean, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { domainIcon } from "../../../../common/entity/domain_icon";
import "../../../../components/entity/ha-entity-attribute-picker";
import "../../../../components/ha-icon-picker";
import { HomeAssistant } from "../../../../types";
import { EntityCardConfig } from "../../cards/types";
import "../../components/hui-action-editor";
import "../../components/hui-entity-editor";
import "../../components/hui-theme-select-editor";
import { headerFooterConfigStructs } from "../../header-footer/structs";
import { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { EditorTarget, EntitiesEditorEvent } from "../types";
import { configElementStyle } from "./config-elements-style";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    entity: optional(string()),
    name: optional(string()),
    icon: optional(string()),
    attribute: optional(string()),
    unit: optional(string()),
    theme: optional(string()),
    state_color: optional(boolean()),
    footer: optional(headerFooterConfigStructs),
  })
);

@customElement("hui-entity-card-editor")
export class HuiEntityCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EntityCardConfig;

  public setConfig(config: EntityCardConfig): void {
    assert(config, cardConfigStruct);
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

  get _attribute(): string {
    return this._config!.attribute || "";
  }

  get _unit(): string {
    return this._config!.unit || "";
  }

  get _state_color(): boolean {
    return this._config!.state_color ?? false;
  }

  get _theme(): string {
    return this._config!.theme || "";
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }
    const entityState = this.hass.states[this._entity];

    return html`
      <div class="card-config">
        <ha-entity-picker
          .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.entity"
          )} (${this.hass.localize(
            "ui.panel.lovelace.editor.card.config.required"
          )})"
          .hass=${this.hass}
          .value=${this._entity}
          .configValue=${"entity"}
          @change=${this._valueChanged}
          allow-custom-entity
        ></ha-entity-picker>
        <div class="side-by-side">
          <paper-input
            .label="${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.name"
            )} (${this.hass.localize(
              "ui.panel.lovelace.editor.card.config.optional"
            )})"
            .value=${this._name}
            .configValue=${"name"}
            @value-changed=${this._valueChanged}
          ></paper-input>
          <ha-icon-picker
            .label="${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.icon"
            )} (${this.hass.localize(
              "ui.panel.lovelace.editor.card.config.optional"
            )})"
            .value=${this._icon}
            .placeholder=${this._icon || entityState?.attributes.icon}
            .fallbackPath=${!this._icon &&
            !entityState?.attributes.icon &&
            entityState
              ? domainIcon(computeDomain(entityState.entity_id), entityState)
              : undefined}
            .configValue=${"icon"}
            @value-changed=${this._valueChanged}
          ></ha-icon-picker>
        </div>
        <div class="side-by-side">
          <ha-entity-attribute-picker
            .hass=${this.hass}
            .entityId=${this._entity}
            .label="${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.attribute"
            )} (${this.hass.localize(
              "ui.panel.lovelace.editor.card.config.optional"
            )})"
            .value=${this._attribute}
            .configValue=${"attribute"}
            @value-changed=${this._valueChanged}
          ></ha-entity-attribute-picker>
          <paper-input
            .label="${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.unit"
            )} (${this.hass.localize(
              "ui.panel.lovelace.editor.card.config.optional"
            )})"
            .value=${this._unit}
            .configValue=${"unit"}
            @value-changed=${this._valueChanged}
          ></paper-input>
        </div>
        <div class="side-by-side">
          <hui-theme-select-editor
            .hass=${this.hass}
            .value=${this._theme}
            .configValue=${"theme"}
            @value-changed=${this._valueChanged}
          >
          </hui-theme-select-editor>
          <ha-formfield
            .label=${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.state_color"
            )}
          >
            <ha-switch
              .checked=${this._config!.state_color}
              .configValue=${"state_color"}
              @change=${this._valueChanged}
            >
            </ha-switch>
          </ha-formfield>
        </div>
      </div>
    `;
  }

  private _valueChanged(ev: EntitiesEditorEvent): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.currentTarget! as EditorTarget;

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

  static get styles(): CSSResultGroup {
    return configElementStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entity-card-editor": HuiEntityCardEditor;
  }
}
