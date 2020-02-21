import {
  LitElement,
  html,
  css,
  CSSResult,
  TemplateResult,
  property,
  customElement,
} from "lit-element";

import "@polymer/paper-input/paper-input";

import "../../../../components/ha-switch";
import "../../../../components/ha-icon-input";
import { HomeAssistant } from "../../../../types";
import { fireEvent } from "../../../../common/dom/fire_event";
import { haStyle } from "../../../../resources/styles";
import { InputNumber } from "../../../../data/input_number";

@customElement("ha-input_number-form")
class HaInputNumberForm extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public new?: boolean;
  private _item?: Partial<InputNumber>;
  @property() private _name!: string;
  @property() private _icon!: string;
  @property() private _initial?: number;
  @property() private _max?: number;
  @property() private _min?: number;

  set item(item: InputNumber) {
    this._item = item;
    if (item) {
      this._name = item.name ?? "";
      this._icon = item.icon ?? "";
      this._max = item.max ?? 0;
      this._min = item.min ?? 0;
      this._initial = item.initial;
    } else {
      this._name = "";
      this._icon = "";
      this._max = 0;
      this._min = 0;
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
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.generic.name"
          )}
          .errorMessage="${this.hass!.localize(
            "ui.dialogs.helper_settings.required_error_msg"
          )}"
          .invalid=${nameInvalid}
        ></paper-input>
        <ha-icon-input
          .value=${this._icon}
          .configValue=${"icon"}
          @value-changed=${this._valueChanged}
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.generic.icon"
          )}
        ></ha-icon-input>
        <paper-input
          .value=${this._min}
          .configValue=${"min"}
          type="number"
          @value-changed=${this._valueChanged}
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.input_number.min"
          )}
        ></paper-input>
        <paper-input
          .value=${this._max}
          .configValue=${"max"}
          type="number"
          @value-changed=${this._valueChanged}
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.input_number.max"
          )}
        ></paper-input>
        <paper-input
          .value=${this._initial}
          .configValue=${"initial"}
          type="number"
          @value-changed=${this._valueChanged}
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.generic.initial_value"
          )}
        ></paper-input>
      </div>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    if (!this.new && !this._item) {
      return;
    }
    ev.stopPropagation();
    const configValue = (ev.target as any).configValue;
    const value = ev.detail.value;
    if (this[`_${configValue}`] === value) {
      return;
    }
    const newValue = { ...this._item };
    if (value === undefined || value === "") {
      delete newValue[configValue];
    } else {
      newValue[configValue] = ev.detail.value;
    }
    this._item = newValue;
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
    "ha-input_number-form": HaInputNumberForm;
  }
}
