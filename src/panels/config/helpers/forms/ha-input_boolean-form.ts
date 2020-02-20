import {
  LitElement,
  html,
  css,
  CSSResult,
  TemplateResult,
  property,
  customElement,
  PropertyValues,
} from "lit-element";

import "@polymer/paper-input/paper-input";

import "../../../../components/ha-switch";
import "../../../../components/ha-icon-input";
import { HomeAssistant } from "../../../../types";
import { InputBoolean } from "../../../../data/input_boolean";
import { fireEvent } from "../../../../common/dom/fire_event";
import { haStyle } from "../../../../resources/styles";

@customElement("ha-input_boolean-form")
class HaInputBooleanForm extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public item?: InputBoolean;
  @property() private _name!: string;
  @property() private _icon!: string;
  @property() private _initial!: boolean;

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (!changedProperties.has("item")) {
      return;
    }
    if (this.item) {
      this._name = this.item.name || "";
      this._icon = this.item.icon || "";
      this._initial = this.item.initial || false;
    } else {
      this._name = "";
      this._icon = "";
      this._initial = false;
    }
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }
    const nameInvalid = !this._name || this._name.trim() === "";

    return html`
      <div class="form">
        <paper-input
          .value=${this._name}
          .configValue=${"name"}
          @value-changed=${this._valueChanged}
          .label="${this.hass!.localize("ui.panel.config.zone.detail.name")}"
          .errorMessage="${this.hass!.localize(
            "ui.panel.config.zone.detail.required_error_msg"
          )}"
          .invalid=${nameInvalid}
        ></paper-input>
        <ha-icon-input
          .value=${this._icon}
          .configValue=${"icon"}
          @value-changed=${this._valueChanged}
          .label="${this.hass!.localize("ui.panel.config.zone.detail.icon")}"
        ></ha-icon-input>
        <div class="row layout horizontal justified">
          Initial value:
          <ha-switch
            .checked=${this._initial}
            @change=${this._initialChanged}
          ></ha-switch>
        </div>
      </div>
    `;
  }

  private _initialChanged(ev) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: { ...this.item, initial: ev.target.checked },
    });
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const configValue = (ev.target as any).configValue;
    const value = ev.detail.value;
    const newValue = { ...this.item };
    if (!value) {
      delete newValue[configValue];
    } else {
      newValue[configValue] = ev.detail.value;
    }
    fireEvent(this, "value-changed", {
      value: newValue,
    });
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        .form {
          color: var(--primary-text-color);
        }
        .row {
          padding: 16px 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-input_boolean-form": HaInputBooleanForm;
  }
}
