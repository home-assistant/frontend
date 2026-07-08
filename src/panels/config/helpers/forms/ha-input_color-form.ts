import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-icon-picker";
import "../../../../components/input/ha-input";
import "../../../../components/radio/ha-radio-group";
import type { HaRadioGroup } from "../../../../components/radio/ha-radio-group";
import "../../../../components/radio/ha-radio-option";
import type { InputColor } from "../../../../data/input_color";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";

const DEFAULT_HEX = "#ffffff";
const DEFAULT_KELVIN = 4000;

@customElement("ha-input_color-form")
class HaInputColorForm extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public new = false;

  @property({ type: Boolean }) public disabled = false;

  private _item?: Partial<InputColor>;

  @state() private _name!: string;

  @state() private _icon!: string;

  // eslint-disable-next-line: variable-name
  @state() private _initial_color?: string;

  // eslint-disable-next-line: variable-name
  @state() private _initial_kelvin?: number;

  // eslint-disable-next-line: variable-name
  @state() private _initial_brightness?: number;

  @state() private _mode: "color" | "white" = "color";

  @query("[dialogInitialFocus]") private _focusElement?: HTMLElement;

  set item(item: InputColor) {
    this._item = item ?? {};
    this._name = item?.name || "";
    this._icon = item?.icon || "";
    this._initial_color = item?.initial_color || DEFAULT_HEX;
    this._initial_kelvin = item?.initial_kelvin || DEFAULT_KELVIN;
    this._initial_brightness = item?.initial_brightness;
    this._mode = item?.initial_kelvin !== undefined ? "white" : "color";
  }

  public focus() {
    this.updateComplete.then(() => this._focusElement?.focus());
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    return html`
      <div class="form">
        <ha-input
          .value=${this._name}
          .configValue=${"name"}
          @input=${this._valueChanged}
          .label=${this.hass.localize(
            "ui.dialogs.helper_settings.generic.name"
          )}
          auto-validate
          required
          .validationMessage=${this.hass.localize(
            "ui.dialogs.helper_settings.required_error_msg"
          )}
          dialogInitialFocus
          .disabled=${this.disabled}
        ></ha-input>
        <ha-icon-picker
          .hass=${this.hass}
          .value=${this._icon}
          .configValue=${"icon"}
          @value-changed=${this._valueChanged}
          .label=${this.hass.localize(
            "ui.dialogs.helper_settings.generic.icon"
          )}
          .disabled=${this.disabled}
        ></ha-icon-picker>
        <ha-radio-group
          orientation="horizontal"
          class="mode"
          .label=${this.hass.localize(
            "ui.dialogs.helper_settings.input_color.mode"
          )}
          .value=${this._mode}
          .disabled=${this.disabled}
          name="mode"
          @change=${this._modeChanged}
        >
          <ha-radio-option value="color">
            ${this.hass.localize("ui.dialogs.helper_settings.input_color.color")}
          </ha-radio-option>
          <ha-radio-option value="white">
            ${this.hass.localize("ui.dialogs.helper_settings.input_color.white")}
          </ha-radio-option>
        </ha-radio-group>
        ${
          this._mode === "white"
            ? html`<ha-input
                .value=${
                  this._initial_kelvin !== undefined
                    ? String(this._initial_kelvin)
                    : ""
                }
                .configValue=${"initial_kelvin"}
                type="number"
                min="1000"
                max="20000"
                step="50"
                @input=${this._valueChanged}
                .label=${this.hass.localize(
                  "ui.dialogs.helper_settings.input_color.initial_kelvin"
                )}
                .disabled=${this.disabled}
              ></ha-input>`
            : html`<ha-input
                .value=${this._initial_color || DEFAULT_HEX}
                .configValue=${"initial_color"}
                type="color"
                @input=${this._valueChanged}
                .label=${this.hass.localize(
                  "ui.dialogs.helper_settings.input_color.initial_color"
                )}
                .disabled=${this.disabled}
              ></ha-input>`
        }
        <ha-input
          .value=${
            this._initial_brightness !== undefined
              ? String(this._initial_brightness)
              : ""
          }
          .configValue=${"initial_brightness"}
          type="number"
          min="0"
          max="255"
          step="1"
          @input=${this._valueChanged}
          .label=${this.hass.localize(
            "ui.dialogs.helper_settings.input_color.initial_brightness"
          )}
          .disabled=${this.disabled}
        ></ha-input>
      </div>
    `;
  }

  private _modeChanged(ev: Event) {
    const mode = (ev.currentTarget as HaRadioGroup).value as "color" | "white";
    this._mode = mode;
    const newValue = { ...this._item };
    if (mode === "white") {
      delete newValue.initial_color;
      newValue.initial_kelvin = this._initial_kelvin || DEFAULT_KELVIN;
    } else {
      delete newValue.initial_kelvin;
      newValue.initial_color = this._initial_color || DEFAULT_HEX;
    }
    fireEvent(this, "value-changed", { value: newValue });
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
        ? target.value === ""
          ? undefined
          : Number(target.value)
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

    if (configValue === "initial_color") {
      delete newValue.initial_kelvin;
    } else if (configValue === "initial_kelvin") {
      delete newValue.initial_color;
    }

    fireEvent(this, "value-changed", { value: newValue });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .form {
          color: var(--primary-text-color);
        }
        ha-input {
          --ha-input-padding-bottom: 0;
        }
        ha-icon-picker,
        ha-input:not([required]) {
          display: block;
          margin-bottom: var(--ha-space-5);
        }
        .mode {
          margin-bottom: var(--ha-space-4);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-input_color-form": HaInputColorForm;
  }
}
