import { mdiInformationOutline } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-icon-picker";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-tooltip";
import "../../../../components/input/ha-input";
import "../../../../components/radio/ha-radio-group";
import type { HaRadioGroup } from "../../../../components/radio/ha-radio-group";
import "../../../../components/radio/ha-radio-option";
import type { InputBoolean } from "../../../../data/input_boolean";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";

@customElement("ha-input_boolean-form")
class HaInputBooleanForm extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public new = false;

  @property({ type: Boolean }) public disabled = false;

  private _item?: InputBoolean;

  @state() private _name!: string;

  @state() private _icon!: string;

  @state() private _initial?: boolean;

  @query("[dialogInitialFocus]") private _focusElement?: HTMLElement;

  set item(item: InputBoolean) {
    this._item = item;
    if (item) {
      this._name = item.name || "";
      this._icon = item.icon || "";
      this._initial = item.initial;
    } else {
      this._name = "";
      this._icon = "";
      this._initial = undefined;
    }
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
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.generic.name"
          )}
          auto-validate
          required
          .validationMessage=${this.hass!.localize(
            "ui.dialogs.helper_settings.required_error_msg"
          )}
          dialogInitialFocus
          .disabled=${this.disabled}
        ></ha-input>
        <ha-icon-picker
          .value=${this._icon}
          .configValue=${"icon"}
          @value-changed=${this._valueChanged}
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.generic.icon"
          )}
          .disabled=${this.disabled}
        ></ha-icon-picker>
        <ha-expansion-panel
          header=${this.hass.localize(
            "ui.dialogs.helper_settings.generic.more_options"
          )}
          outlined
        >
          <ha-radio-group
            .value=${
              this._initial === undefined
                ? "restore"
                : this._initial
                  ? "on"
                  : "off"
            }
            .disabled=${this.disabled}
            name="initial"
            @change=${this._initialChanged}
          >
            <span slot="label">
              ${this.hass.localize(
                "ui.dialogs.helper_settings.input_boolean.initial"
              )}
              <ha-svg-icon
                id="initial-note"
                tabindex="0"
                class="note-icon"
                .path=${mdiInformationOutline}
                @click=${stopPropagation}
              ></ha-svg-icon>
            </span>
            <ha-radio-option value="restore">
              ${this.hass.localize(
                "ui.dialogs.helper_settings.input_boolean.restore"
              )}
            </ha-radio-option>
            <ha-radio-option value="on">
              ${this.hass.localize(
                "ui.dialogs.helper_settings.input_boolean.turn_on"
              )}
            </ha-radio-option>
            <ha-radio-option value="off">
              ${this.hass.localize(
                "ui.dialogs.helper_settings.input_boolean.turn_off"
              )}
            </ha-radio-option>
          </ha-radio-group>
          <ha-tooltip for="initial-note" placement="top">
            ${this.hass.localize(
              "ui.dialogs.helper_settings.input_boolean.initial_helper"
            )}
          </ha-tooltip>
        </ha-expansion-panel>
      </div>
    `;
  }

  private _initialChanged(ev: Event) {
    const option = String((ev.currentTarget as HaRadioGroup).value);
    const initial = option === "restore" ? undefined : option === "on";
    if (initial === this._initial) {
      return;
    }
    const newValue = { ...this._item } as InputBoolean;
    if (initial === undefined) {
      delete newValue.initial;
    } else {
      newValue.initial = initial;
    }
    fireEvent(this, "value-changed", {
      value: newValue,
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
          padding: var(--ha-space-4) 0;
        }
        ha-input {
          margin: var(--ha-space-2) 0;
        }
        ha-expansion-panel {
          margin-top: var(--ha-space-4);
        }
        ha-expansion-panel ha-radio-group {
          margin: var(--ha-space-4) 0;
        }
        .note-icon {
          margin-inline-start: var(--ha-space-1);
          color: var(--secondary-text-color);
          --mdc-icon-size: 18px;
          vertical-align: middle;
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
