import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import "../../../../components/ha-formfield";
import "../../../../components/ha-icon-picker";
import "../../../../components/ha-radio";
import type { HaRadio } from "../../../../components/ha-radio";
import "../../../../components/ha-textfield";
import { InputText } from "../../../../data/input_text";
import { haStyle } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";

@customElement("ha-input_text-form")
class HaInputTextForm extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public new?: boolean;

  private _item?: InputText;

  @state() private _name!: string;

  @state() private _icon!: string;

  @state() private _max?: number;

  @state() private _min?: number;

  @state() private _mode?: string;

  @state() private _pattern?: string;

  set item(item: InputText) {
    this._item = item;
    if (item) {
      this._name = item.name || "";
      this._icon = item.icon || "";
      this._max = item.max || 100;
      this._min = item.min || 0;
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
        ${this.hass.userData?.showAdvanced
          ? html`
              <ha-textfield
                .value=${this._min}
                .configValue=${"min"}
                type="number"
                min="0"
                max="255"
                @input=${this._valueChanged}
                .label=${this.hass!.localize(
                  "ui.dialogs.helper_settings.input_text.min"
                )}
              ></ha-textfield>
              <ha-textfield
                .value=${this._max}
                .configValue=${"max"}
                min="0"
                max="255"
                type="number"
                @input=${this._valueChanged}
                .label=${this.hass!.localize(
                  "ui.dialogs.helper_settings.input_text.max"
                )}
              ></ha-textfield>
              <div class="layout horizontal center justified">
                ${this.hass.localize(
                  "ui.dialogs.helper_settings.input_text.mode"
                )}
                <ha-formfield
                  .label=${this.hass.localize(
                    "ui.dialogs.helper_settings.input_text.text"
                  )}
                >
                  <ha-radio
                    name="mode"
                    value="text"
                    .checked=${this._mode === "text"}
                    @change=${this._modeChanged}
                  ></ha-radio>
                </ha-formfield>
                <ha-formfield
                  .label=${this.hass.localize(
                    "ui.dialogs.helper_settings.input_text.password"
                  )}
                >
                  <ha-radio
                    name="mode"
                    value="password"
                    .checked=${this._mode === "password"}
                    @change=${this._modeChanged}
                  ></ha-radio>
                </ha-formfield>
              </div>
              <ha-textfield
                .value=${this._pattern || ""}
                .configValue=${"pattern"}
                @input=${this._valueChanged}
                .label=${this.hass!.localize(
                  "ui.dialogs.helper_settings.input_text.pattern_label"
                )}
                .helper=${this.hass!.localize(
                  "ui.dialogs.helper_settings.input_text.pattern_helper"
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
    "ha-input_text-form": HaInputTextForm;
  }
}
