import "@polymer/paper-input/paper-input";
import "@polymer/paper-radio-button/paper-radio-button";
import "@polymer/paper-radio-group/paper-radio-group";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-icon-input";
import { InputNumber } from "../../../../data/input_number";
import { haStyle } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";

@customElement("ha-input_number-form")
class HaInputNumberForm extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public new?: boolean;

  private _item?: Partial<InputNumber>;

  @internalProperty() private _name!: string;

  @internalProperty() private _icon!: string;

  @internalProperty() private _max?: number;

  @internalProperty() private _min?: number;

  @internalProperty() private _mode?: string;

  @internalProperty() private _step?: number;

  // eslint-disable-next-line: variable-name
  @internalProperty() private _unit_of_measurement?: string;

  set item(item: InputNumber) {
    this._item = item;
    if (item) {
      this._name = item.name || "";
      this._icon = item.icon || "";
      this._max = item.max ?? 100;
      this._min = item.min ?? 0;
      this._mode = item.mode || "slider";
      this._step = item.step || 1;
      this._unit_of_measurement = item.unit_of_measurement;
    } else {
      this._item = {
        min: 0,
        max: 0,
      };
      this._name = "";
      this._icon = "";
      this._max = 100;
      this._min = 0;
      this._mode = "slider";
      this._step = 1;
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
        ${this.hass.userData?.showAdvanced
          ? html`
              <div class="layout horizontal center justified">
                ${this.hass.localize(
                  "ui.dialogs.helper_settings.input_number.mode"
                )}
                <paper-radio-group
                  .selected=${this._mode}
                  @selected-changed=${this._modeChanged}
                >
                  <paper-radio-button name="slider">
                    ${this.hass.localize(
                      "ui.dialogs.helper_settings.input_number.slider"
                    )}
                  </paper-radio-button>
                  <paper-radio-button name="box">
                    ${this.hass.localize(
                      "ui.dialogs.helper_settings.input_number.box"
                    )}
                  </paper-radio-button>
                </paper-radio-group>
              </div>
              <paper-input
                .value=${this._step}
                .configValue=${"step"}
                type="number"
                @value-changed=${this._valueChanged}
                .label=${this.hass!.localize(
                  "ui.dialogs.helper_settings.input_number.step"
                )}
              ></paper-input>

              <paper-input
                .value=${this._unit_of_measurement}
                .configValue=${"unit_of_measurement"}
                @value-changed=${this._valueChanged}
                .label=${this.hass!.localize(
                  "ui.dialogs.helper_settings.input_number.unit_of_measurement"
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
    if (value === undefined || value === "") {
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
        ha-paper-dropdown-menu {
          display: block;
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
