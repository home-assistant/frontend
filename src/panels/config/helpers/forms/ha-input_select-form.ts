import { mdiDelete, mdiDrag } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-icon-picker";
import "../../../../components/ha-list";
import "../../../../components/ha-list-item";
import "../../../../components/ha-sortable";
import "../../../../components/ha-textfield";
import type { HaTextField } from "../../../../components/ha-textfield";
import type { InputSelect } from "../../../../data/input_select";
import { showConfirmationDialog } from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";

@customElement("ha-input_select-form")
class HaInputSelectForm extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public new = false;

  private _item?: InputSelect;

  @state() private _name!: string;

  @state() private _icon!: string;

  @state() private _options: string[] = [];

  @query("#option_input", true) private _optionInput?: HaTextField;

  private _optionMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const options = this._options.concat();
    const option = options.splice(oldIndex, 1)[0];
    options.splice(newIndex, 0, option);

    fireEvent(this, "value-changed", {
      value: { ...this._item, options },
    });
  }

  set item(item: InputSelect) {
    this._item = item;
    if (item) {
      this._name = item.name || "";
      this._icon = item.icon || "";
      this._options = item.options || [];
    } else {
      this._name = "";
      this._icon = "";
      this._options = [];
    }
  }

  public focus() {
    this.updateComplete.then(() =>
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
          dialogInitialFocus
          autoValidate
          required
          .validationMessage=${this.hass!.localize(
            "ui.dialogs.helper_settings.required_error_msg"
          )}
          .value=${this._name}
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.generic.name"
          )}
          .configValue=${"name"}
          @input=${this._valueChanged}
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
        <div class="header">
          ${this.hass!.localize(
            "ui.dialogs.helper_settings.input_select.options"
          )}:
        </div>
        <ha-sortable @item-moved=${this._optionMoved} handle-selector=".handle">
          <ha-list class="options">
            ${this._options.length
              ? repeat(
                  this._options,
                  (option) => option,
                  (option, index) => html`
                    <ha-list-item class="option" hasMeta>
                      <div class="optioncontent">
                        <div class="handle">
                          <ha-svg-icon .path=${mdiDrag}></ha-svg-icon>
                        </div>
                        ${option}
                      </div>
                      <ha-icon-button
                        slot="meta"
                        .index=${index}
                        .label=${this.hass.localize(
                          "ui.dialogs.helper_settings.input_select.remove_option"
                        )}
                        @click=${this._removeOption}
                        .path=${mdiDelete}
                      ></ha-icon-button>
                    </ha-list-item>
                  `
                )
              : html`
                  <ha-list-item noninteractive>
                    ${this.hass!.localize(
                      "ui.dialogs.helper_settings.input_select.no_options"
                    )}
                  </ha-list-item>
                `}
          </ha-list>
        </ha-sortable>
        <div class="layout horizontal center">
          <ha-textfield
            class="flex-auto"
            id="option_input"
            .label=${this.hass!.localize(
              "ui.dialogs.helper_settings.input_select.add_option"
            )}
            @keydown=${this._handleKeyAdd}
          ></ha-textfield>
          <ha-button size="small" appearance="plain" @click=${this._addOption}
            >${this.hass!.localize(
              "ui.dialogs.helper_settings.input_select.add"
            )}</ha-button
          >
        </div>
      </div>
    `;
  }

  private _handleKeyAdd(ev: KeyboardEvent) {
    ev.stopPropagation();
    if (ev.key !== "Enter") {
      return;
    }
    this._addOption();
  }

  private _addOption() {
    const input = this._optionInput;
    if (!input?.value) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: { ...this._item, options: [...this._options, input.value] },
    });
    input.value = "";
  }

  private async _removeOption(ev: Event) {
    const index = (ev.target as any).index;
    if (
      !(await showConfirmationDialog(this, {
        title: this.hass.localize(
          "ui.dialogs.helper_settings.input_select.confirm_delete.delete"
        ),
        text: this.hass.localize(
          "ui.dialogs.helper_settings.input_select.confirm_delete.prompt"
        ),
        destructive: true,
      }))
    ) {
      return;
    }
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
        .option {
          border: 1px solid var(--divider-color);
          border-radius: var(--ha-border-radius-sm);
          margin-top: 4px;
          --mdc-icon-button-size: 24px;
          --mdc-ripple-color: transparent;
          --mdc-list-side-padding: 16px;
          cursor: default;
          background-color: var(--card-background-color);
        }
        ha-textfield {
          display: block;
          margin-bottom: 8px;
        }
        #option_input {
          margin-top: 8px;
        }
        .header {
          margin-top: 8px;
          margin-bottom: 8px;
        }
        .handle {
          cursor: move; /* fallback if grab cursor is unsupported */
          cursor: grab;
          padding-right: 12px;
          padding-inline-end: 12px;
          padding-inline-start: initial;
        }
        .handle ha-svg-icon {
          pointer-events: none;
          height: 24px;
        }
        .optioncontent {
          display: flex;
          align-items: center;
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
