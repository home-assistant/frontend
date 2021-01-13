import "@polymer/paper-input/paper-input";
import "@polymer/paper-radio-button/paper-radio-button";
import "@polymer/paper-radio-group/paper-radio-group";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-icon-input";
import { InputDateTime } from "../../../../data/input_datetime";
import { haStyle } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";

@customElement("ha-input_datetime-form")
class HaInputDateTimeForm extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public new?: boolean;

  private _item?: InputDateTime;

  @internalProperty() private _name!: string;

  @internalProperty() private _icon!: string;

  @internalProperty() private _mode!: "date" | "time" | "datetime";

  set item(item: InputDateTime) {
    this._item = item;
    if (item) {
      this._name = item.name || "";
      this._icon = item.icon || "";
      this._mode =
        item.has_time && item.has_date
          ? "datetime"
          : item.has_time
          ? "time"
          : "date";
    } else {
      this._name = "";
      this._icon = "";
      this._mode = "date";
    }
  }

  public focus() {
    this.updateComplete.then(() =>
      (this.shadowRoot?.querySelector(
        "[dialogInitialFocus]"
      ) as HTMLElement)?.focus()
    );
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
          dialogInitialFocus
        ></paper-input>
        <ha-icon-input
          .value=${this._icon}
          .configValue=${"icon"}
          @value-changed=${this._valueChanged}
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.generic.icon"
          )}
        ></ha-icon-input>
        <br />
        ${this.hass.localize("ui.dialogs.helper_settings.input_datetime.mode")}:
        <br />
        <paper-radio-group
          .selected=${this._mode}
          @selected-changed=${this._modeChanged}
        >
          <paper-radio-button name="date">
            ${this.hass.localize(
              "ui.dialogs.helper_settings.input_datetime.date"
            )}
          </paper-radio-button>
          <paper-radio-button name="time">
            ${this.hass.localize(
              "ui.dialogs.helper_settings.input_datetime.time"
            )}
          </paper-radio-button>
          <paper-radio-button name="datetime">
            ${this.hass.localize(
              "ui.dialogs.helper_settings.input_datetime.datetime"
            )}
          </paper-radio-button>
        </paper-radio-group>
      </div>
    `;
  }

  private _modeChanged(ev: CustomEvent) {
    const mode = ev.detail.value;
    fireEvent(this, "value-changed", {
      value: {
        ...this._item,
        has_time: ["time", "datetime"].includes(mode),
        has_date: ["date", "datetime"].includes(mode),
      },
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
