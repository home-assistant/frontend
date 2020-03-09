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
import { InputDateTime } from "../../../../data/input_datetime";

@customElement("ha-input_datetime-form")
class HaInputDateTimeForm extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public new?: boolean;
  private _item?: InputDateTime;
  @property() private _name!: string;
  @property() private _icon!: string;
  @property() private _initial?: string;
  @property() private _hasTime?: boolean;
  @property() private _hasDate?: boolean;

  set item(item: InputDateTime) {
    this._item = item;
    if (item) {
      this._name = item.name || "";
      this._icon = item.icon || "";
      this._initial = item.initial;
      this._hasTime = item.has_time;
      this._hasDate = item.has_date;
    } else {
      this._name = "";
      this._icon = "";
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
        <div class="row layout horizontal justified">
          ${this.hass!.localize(
            "ui.dialogs.helper_settings.input_datetime.has_time"
          )}:
          <ha-switch
            .checked=${this._hasTime}
            @change=${this._hasTimeChanged}
          ></ha-switch>
        </div>
        <div class="row layout horizontal justified">
          ${this.hass!.localize(
            "ui.dialogs.helper_settings.input_datetime.has_date"
          )}:
          <ha-switch
            .checked=${this._hasDate}
            @change=${this._hasDateChanged}
          ></ha-switch>
        </div>
        ${this.hass.userData?.showAdvanced
          ? html`
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

  private _hasTimeChanged(ev) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: { ...this._item, has_time: ev.target.checked },
    });
  }

  private _hasDateChanged(ev) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: { ...this._item, has_date: ev.target.checked },
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-input_datetime-form": HaInputDateTimeForm;
  }
}
