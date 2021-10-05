import "@material/mwc-button/mwc-button";
import "@polymer/paper-input/paper-input";
import type { PaperInputElement } from "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state, query } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-icon-input";
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

  @query("#option_input", true) private _optionInput?: PaperInputElement;

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
        <paper-input
          .value=${this._name}
          .configValue=${"name"}
          @value-changed=${this._valueChanged}
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.generic.name"
          )}
          .errorMessage=${this.hass!.localize(
            "ui.dialogs.helper_settings.required_error_msg"
          )}
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
        ${this.hass!.localize(
          "ui.dialogs.helper_settings.input_select.options"
        )}:
        ${this._options.length
          ? this._options.map(
              (option, index) => html`
                <paper-item class="option">
                  <paper-item-body> ${option} </paper-item-body>
                  <ha-icon-button
                    .index=${index}
                    .title=${this.hass.localize(
                      "ui.dialogs.helper_settings.input_select.remove_option"
                    )}
                    @click=${this._removeOption}
                    icon="hass:delete"
                  ></ha-icon-button>
                </paper-item>
              `
            )
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
            @keydown=${this._handleKeyAdd}
          ></paper-input>
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
    if (!input || !input.value) {
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
        }
        mwc-button {
          margin-left: 8px;
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
