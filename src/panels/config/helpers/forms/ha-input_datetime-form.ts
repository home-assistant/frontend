import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-formfield";
import "../../../../components/ha-icon-picker";
import "../../../../components/ha-radio";
import type { HaRadio } from "../../../../components/ha-radio";
import "../../../../components/ha-textfield";
import { InputDateTime } from "../../../../data/input_datetime";
import { haStyle } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";

@customElement("ha-input_datetime-form")
class HaInputDateTimeForm extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public new?: boolean;

  private _item?: InputDateTime;

  @state() private _name!: string;

  @state() private _icon!: string;

  @state() private _mode!: "date" | "time" | "datetime";

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
      this._item.has_date =
        !item.has_date && !item.has_time ? true : item.has_date;
    } else {
      this._name = "";
      this._icon = "";
      this._mode = "date";
    }
  }

  public focus() {
    this.updateComplete.then(
      () =>
        (
          this.shadowRoot?.querySelector("[dialogInitialFocus]") as HTMLElement
        )?.focus()
    );
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    return html`
      <div class="form">
        <ha-textfield
          .value=${this._name}
          .configValue=${"name"}
          @input=${this._valueChanged}
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.generic.name"
          )}
          autoValidate
          required
          .validationMessage=${this.hass!.localize(
            "ui.dialogs.helper_settings.required_error_msg"
          )}
          dialogInitialFocus
        ></ha-textfield>
        <ha-icon-picker
          .hass=${this.hass}
          .value=${this._icon}
          .configValue=${"icon"}
          @value-changed=${this._valueChanged}
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.generic.icon"
          )}
        ></ha-icon-picker>
        <br />
        ${this.hass.localize("ui.dialogs.helper_settings.input_datetime.mode")}:
        <br />

        <ha-formfield
          .label=${this.hass.localize(
            "ui.dialogs.helper_settings.input_datetime.date"
          )}
        >
          <ha-radio
            name="mode"
            value="date"
            .checked=${this._mode === "date"}
            @change=${this._modeChanged}
          ></ha-radio>
        </ha-formfield>
        <ha-formfield
          .label=${this.hass.localize(
            "ui.dialogs.helper_settings.input_datetime.time"
          )}
        >
          <ha-radio
            name="mode"
            value="time"
            .checked=${this._mode === "time"}
            @change=${this._modeChanged}
          ></ha-radio>
        </ha-formfield>
        <ha-formfield
          .label=${this.hass.localize(
            "ui.dialogs.helper_settings.input_datetime.datetime"
          )}
        >
          <ha-radio
            name="mode"
            value="datetime"
            .checked=${this._mode === "datetime"}
            @change=${this._modeChanged}
          ></ha-radio>
        </ha-formfield>
      </div>
    `;
  }

  private _modeChanged(ev: CustomEvent) {
    const mode = (ev.target as HaRadio).value;
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
    const value = ev.detail?.value || (ev.target as any).value;
    if (this[`_${configValue}`] === value) {
      return;
    }
    const newValue = { ...this._item };
    if (!value) {
      delete newValue[configValue];
    } else {
      newValue[configValue] = value;
    }
    fireEvent(this, "value-changed", {
      value: newValue,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .form {
          color: var(--primary-text-color);
        }
        .row {
          padding: 16px 0;
        }
        ha-textfield {
          display: block;
          margin: 8px 0;
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
