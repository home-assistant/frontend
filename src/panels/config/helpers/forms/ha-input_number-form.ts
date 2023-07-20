import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-formfield";
import "../../../../components/ha-icon-picker";
import "../../../../components/ha-radio";
import type { HaRadio } from "../../../../components/ha-radio";
import "../../../../components/ha-textfield";
import { InputNumber } from "../../../../data/input_number";
import { haStyle } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";

@customElement("ha-input_number-form")
class HaInputNumberForm extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public new?: boolean;

  private _item?: Partial<InputNumber>;

  @state() private _name!: string;

  @state() private _icon!: string;

  @state() private _max?: number;

  @state() private _min?: number;

  @state() private _mode?: string;

  @state() private _step?: number;

  // eslint-disable-next-line: variable-name
  @state() private _unit_of_measurement?: string;

  /* Configuring initial value is intentionally not supported because the behavior
     compared to restoring the value after restart is hard to explain */
  set item(item: InputNumber) {
    this._item = item;
    if (item) {
      this._name = item.name || "";
      this._icon = item.icon || "";
      this._max = item.max ?? 100;
      this._min = item.min ?? 0;
      this._mode = item.mode || "slider";
      this._step = item.step ?? 1;
      this._unit_of_measurement = item.unit_of_measurement;
    } else {
      this._item = {
        min: 0,
        max: 100,
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
        <ha-textfield
          .value=${this._min}
          .configValue=${"min"}
          type="number"
          step="any"
          @input=${this._valueChanged}
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.input_number.min"
          )}
        ></ha-textfield>
        <ha-textfield
          .value=${this._max}
          .configValue=${"max"}
          type="number"
          step="any"
          @input=${this._valueChanged}
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.input_number.max"
          )}
        ></ha-textfield>
        ${this.hass.userData?.showAdvanced
          ? html`
              <div class="layout horizontal center justified">
                ${this.hass.localize(
                  "ui.dialogs.helper_settings.input_number.mode"
                )}
                <ha-formfield
                  .label=${this.hass.localize(
                    "ui.dialogs.helper_settings.input_number.slider"
                  )}
                >
                  <ha-radio
                    name="mode"
                    value="slider"
                    .checked=${this._mode === "slider"}
                    @change=${this._modeChanged}
                  ></ha-radio>
                </ha-formfield>
                <ha-formfield
                  .label=${this.hass.localize(
                    "ui.dialogs.helper_settings.input_number.box"
                  )}
                >
                  <ha-radio
                    name="mode"
                    value="box"
                    .checked=${this._mode === "box"}
                    @change=${this._modeChanged}
                  ></ha-radio>
                </ha-formfield>
              </div>
              <ha-textfield
                .value=${this._step}
                .configValue=${"step"}
                type="number"
                step="any"
                @input=${this._valueChanged}
                .label=${this.hass!.localize(
                  "ui.dialogs.helper_settings.input_number.step"
                )}
              ></ha-textfield>

              <ha-textfield
                .value=${this._unit_of_measurement || ""}
                .configValue=${"unit_of_measurement"}
                @input=${this._valueChanged}
                .label=${this.hass!.localize(
                  "ui.dialogs.helper_settings.input_number.unit_of_measurement"
                )}
              ></ha-textfield>
            `
          : ""}
      </div>
    `;
  }

  private _modeChanged(ev: CustomEvent) {
    fireEvent(this, "value-changed", {
      value: { ...this._item, mode: (ev.target as HaRadio).value },
    });
  }

  private _valueChanged(ev: CustomEvent) {
    if (!this.new && !this._item) {
      return;
    }
    ev.stopPropagation();
    const target = ev.target as any;
    const configValue = target.configValue;
    const value =
      target.type === "number"
        ? Number(target.value)
        : ev.detail?.value || target.value;

    if (this[`_${configValue}`] === value) {
      return;
    }
    const newValue = { ...this._item };
    if (value === undefined || value === "") {
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

        ha-textfield {
          display: block;
          margin-bottom: 8px;
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
