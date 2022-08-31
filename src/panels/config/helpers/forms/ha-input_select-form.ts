import "@material/mwc-button/mwc-button";
import "@material/mwc-list/mwc-list-item";
import { mdiDelete } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-icon-picker";
import "../../../../components/ha-textfield";
import type { HaTextField } from "../../../../components/ha-textfield";
import type { InputSelect } from "../../../../data/input_select";
import { showConfirmationDialog } from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";

@customElement("ha-input_select-form")
class HaInputSelectForm extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public new?: boolean;

  private _item?: InputSelect;

  @state() private _name!: string;

  @state() private _icon!: string;

  @state() private _options: string[] = [];

  @query("#option_input", true) private _optionInput?: HaTextField;

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

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }
    const nameInvalid = !this._name || this._name.trim() === "";

    return html`
      <div class="form">
        <ha-textfield
          dialogInitialFocus
          .errorMessage=${this.hass!.localize(
            "ui.dialogs.helper_settings.required_error_msg"
          )}
          .value=${this._name}
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.generic.name"
          )}
          .invalid=${nameInvalid}
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
        ${this._options.length
          ? this._options.map(
              (option, index) => html`
                <mwc-list-item class="option" hasMeta>
                  ${option}
                  <ha-icon-button
                    slot="meta"
                    .index=${index}
                    .label=${this.hass.localize(
                      "ui.dialogs.helper_settings.input_select.remove_option"
                    )}
                    @click=${this._removeOption}
                    .path=${mdiDelete}
                  ></ha-icon-button>
                </mwc-list-item>
              `
            )
          : html`
              <mwc-list-item noninteractive>
                ${this.hass!.localize(
                  "ui.dialogs.helper_settings.input_select.no_options"
                )}
              </mwc-list-item>
            `}
        <div class="layout horizontal center">
          <ha-textfield
            class="flex-auto"
            id="option_input"
            .label=${this.hass!.localize(
              "ui.dialogs.helper_settings.input_select.add_option"
            )}
            @keydown=${this._handleKeyAdd}
          ></ha-textfield>
          <mwc-button @click=${this._addOption}
            >${this.hass!.localize(
              "ui.dialogs.helper_settings.input_select.add"
            )}</mwc-button
          >
        </div>
      </div>
    `;
  }

  private _handleKeyAdd(ev: KeyboardEvent) {
    ev.stopPropagation();
    if (ev.keyCode !== 13) {
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
        title: "Delete this item?",
        text: "Are you sure you want to delete this item?",
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
          border-radius: 4px;
          margin-top: 4px;
          --mdc-icon-button-size: 24px;
        }
        mwc-button {
          margin-left: 8px;
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-input_select-form": HaInputSelectForm;
  }
}
