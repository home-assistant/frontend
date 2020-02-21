import {
  LitElement,
  html,
  css,
  CSSResult,
  TemplateResult,
  property,
  customElement,
  query,
} from "lit-element";

import "@polymer/paper-input/paper-input";

import "../../../../components/ha-switch";
import "../../../../components/ha-icon-input";
import { HomeAssistant } from "../../../../types";
import { fireEvent } from "../../../../common/dom/fire_event";
import { haStyle } from "../../../../resources/styles";
import { InputSelect } from "../../../../data/input_select";
// tslint:disable-next-line: no-duplicate-imports
import { PaperInputElement } from "@polymer/paper-input/paper-input";

@customElement("ha-input_select-form")
class HaInputSelectForm extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public new?: boolean;
  private _item?: InputSelect;
  @property() private _name!: string;
  @property() private _icon!: string;
  @property() private _options: string[] = [];
  @property() private _initial?: string;
  @query("#option_input") private _optionInput?: PaperInputElement;

  set item(item: InputSelect) {
    this._item = item;
    if (item) {
      this._name = item.name || "";
      this._icon = item.icon || "";
      this._initial = item.initial;
      this._options = item.options || [];
    } else {
      this._name = "";
      this._icon = "";
      this._options = [];
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
        ${this.hass!.localize(
          "ui.dialogs.helper_settings.input_select.options"
        )}:
        ${this._options.length
          ? this._options.map((option, index) => {
              return html`
                <paper-item>
                  <paper-item-body> ${option} </paper-item-body>
                  <paper-icon-button
                    .index=${index}
                    .title=${this.hass.localize(
                      "ui.dialogs.helper_settings.input_select.remove_option"
                    )}
                    @click=${this._removeOption}
                    icon="hass:delete"
                  ></paper-icon-button>
                </paper-item>
              `;
            })
          : html`
              <paper-item>
                ${this.hass!.localize(
                  "ui.dialogs.helper_settings.input_select.no_options"
                )}
              </paper-item>
            `}
        <div class="layout horizontal bottom">
          <paper-input
            class="flex-auto"
            id="option_input"
            .label=${this.hass!.localize(
              "ui.dialogs.helper_settings.input_select.add_option"
            )}
          ></paper-input>
          <mwc-button @click=${this._addOption}
            >${this.hass!.localize(
              "ui.dialogs.helper_settings.input_select.add"
            )}</mwc-button
          >
        </div>
        ${this.hass.userData?.showAdvanced
          ? html`
              <br />
              ${this.hass!.localize(
                "ui.dialogs.helper_settings.generic.initial_value_explain"
              )}
              <ha-paper-dropdown-menu
                label-float
                dynamic-align
                .label=${this.hass.localize(
                  "ui.dialogs.helper_settings.generic.initial_value"
                )}
              >
                <paper-listbox
                  slot="dropdown-content"
                  attr-for-selected="item-initial"
                  .selected=${this._initial}
                  @selected-changed=${this._initialChanged}
                >
                  ${this._options.map(
                    (option) => html`
                      <paper-item item-initial=${option}>${option}</paper-item>
                    `
                  )}
                </paper-listbox>
              </ha-paper-dropdown-menu>
            `
          : ""}
      </div>
    `;
  }

  private _initialChanged(ev: CustomEvent) {
    fireEvent(this, "value-changed", {
      value: { ...this._item, initial: ev.detail.value },
    });
  }

  private _addOption() {
    const input = this._optionInput;
    if (!input || !input.value) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: { ...this._item, options: [...this._options, input.value] },
    });
    input.value = "";
  }

  private _removeOption(ev: Event) {
    const index = (ev.target as any).index;
    const options = [...this._options];
    options.splice(index, 1);
    fireEvent(this, "value-changed", {
      value: { ...this._item, options },
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
        paper-item {
          border: 1px solid var(--divider-color);
          border-radius: 4px;
          margin-top: 4px;
        }
        mwc-button {
          margin-left: 8px;
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
    "ha-input_select-form": HaInputSelectForm;
  }
}
