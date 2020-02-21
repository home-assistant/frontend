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
import { InputText } from "../../../../data/input_text";
import { fireEvent } from "../../../../common/dom/fire_event";
import { haStyle } from "../../../../resources/styles";

@customElement("ha-input_text-form")
class HaInputTextForm extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public new?: boolean;
  private _item?: InputText;
  @property() private _name!: string;
  @property() private _icon!: string;
  @property() private _initial?: string;
  @property() private _max?: number;
  @property() private _min?: number;
  @property() private _mode?: string;
  @property() private _pattern?: string;

  set item(item: InputText) {
    this._item = item;
    if (item) {
      this._name = item.name || "";
      this._icon = item.icon || "";
      this._max = item.max || 100;
      this._min = item.min || 0;
      this._initial = item.initial;
      this._mode = item.mode || "text";
      this._pattern = item.pattern;
    } else {
      this._name = "";
      this._icon = "";
      this._max = 100;
      this._min = 0;
      this._mode = "text";
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
        ${this.hass.userData?.showAdvanced
          ? html`
              <paper-input
                .value=${this._min}
                .configValue=${"min"}
                type="number"
                min="0"
                max="255"
                @value-changed=${this._valueChanged}
                .label=${this.hass!.localize(
                  "ui.dialogs.helper_settings.input_text.min"
                )}
              ></paper-input>
              <paper-input
                .value=${this._max}
                .configValue=${"max"}
                min="0"
                max="255"
                type="number"
                @value-changed=${this._valueChanged}
                .label=${this.hass!.localize(
                  "ui.dialogs.helper_settings.input_text.max"
                )}
              ></paper-input>
              <ha-paper-dropdown-menu
                label-float
                dynamic-align
                .label=${this.hass.localize(
                  "ui.dialogs.helper_settings.input_text.mode"
                )}
              >
                <paper-listbox
                  slot="dropdown-content"
                  attr-for-selected="item-mode"
                  .selected=${this._mode}
                  @selected-changed=${this._modeChanged}
                >
                  <paper-item item-mode="text">
                    ${this.hass.localize(
                      "ui.dialogs.helper_settings.input_text.text"
                    )}
                  </paper-item>
                  <paper-item item-mode="password">
                    ${this.hass.localize(
                      "ui.dialogs.helper_settings.input_text.password"
                    )}
                  </paper-item>
                </paper-listbox>
              </ha-paper-dropdown-menu>
              <paper-input
                .value=${this._pattern}
                .configValue=${"pattern"}
                @value-changed=${this._valueChanged}
                .label=${this.hass!.localize(
                  "ui.dialogs.helper_settings.input_text.pattern"
                )}
              ></paper-input>
              <br />
              ${this.hass!.localize(
                "ui.dialogs.helper_settings.generic.initial_value_explain"
              )}
              <paper-input
                .value=${this._initial}
                .configValue=${"initial"}
                @value-changed=${this._valueChanged}
                .label=${this.hass!.localize(
                  "ui.dialogs.helper_settings.generic.initial_value"
                )}
              ></paper-input>
            `
          : ""}
      </div>
    `;
  }

  private _modeChanged(ev: CustomEvent) {
    fireEvent(this, "value-changed", {
      value: { ...this._item, mode: ev.detail.value },
    });
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
        ha-paper-dropdown-menu {
          display: block;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-input_text-form": HaInputTextForm;
  }
}
