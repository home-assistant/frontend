import {
  LitElement,
  html,
  css,
  CSSResult,
  TemplateResult,
  customElement,
  property,
} from "lit-element";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import "@polymer/paper-input/paper-input";

import "../../components/dialog/ha-paper-dialog";
import "../../components/ha-switch";

import { HomeAssistant } from "../../types";
import { DialogParams } from "./show-dialog-box";
import { PolymerChangedEvent } from "../../polymer-types";
import { haStyleDialog } from "../../resources/styles";

@customElement("dialog-box")
class DialogBox extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() private _params?: DialogParams;
  @property() private _value?: string;

  public async showDialog(params: DialogParams): Promise<void> {
    this._params = params;
    if (params.prompt) {
      this._value = params.defaultValue;
    }
  }

  protected render(): TemplateResult | void {
    if (!this._params) {
      return html``;
    }

    const confirmPrompt = this._params.confirmation || this._params.prompt;

    return html`
      <ha-paper-dialog
        with-backdrop
        opened
        modal
        @opened-changed="${this._openedChanged}"
      >
        <h2>
          ${this._params.title
            ? this._params.title
            : this._params.confirmation &&
              this.hass.localize(
                "ui.dialogs.generic.default_confirmation_title"
              )}
        </h2>
        <paper-dialog-scrollable>
          ${this._params.text
            ? html`
                <p>${this._params.text}</p>
              `
            : ""}
          ${this._params.prompt
            ? html`
                <paper-input
                  autofocus
                  .value=${this._value}
                  @value-changed=${this._valueChanged}
                  .label=${this._params.inputLabel
                    ? this._params.inputLabel
                    : ""}
                  .type=${this._params.inputType
                    ? this._params.inputType
                    : "text"}
                ></paper-input>
              `
            : ""}
        </paper-dialog-scrollable>
        <div class="paper-dialog-buttons">
          ${confirmPrompt &&
            html`
              <mwc-button @click="${this._dismiss}">
                ${this._params.dismissText
                  ? this._params.dismissText
                  : this.hass.localize("ui.dialogs.generic.cancel")}
              </mwc-button>
            `}
          <mwc-button @click="${this._confirm}">
            ${this._params.confirmText
              ? this._params.confirmText
              : this.hass.localize("ui.dialogs.generic.ok")}
          </mwc-button>
        </div>
      </ha-paper-dialog>
    `;
  }

  private _valueChanged(ev: PolymerChangedEvent<string>) {
    this._value = ev.detail.value;
  }

  private async _dismiss(): Promise<void> {
    if (this._params!.cancel) {
      this._params!.cancel();
    }
    this._params = undefined;
  }

  private async _confirm(): Promise<void> {
    if (this._params!.confirm) {
      this._params!.confirm(this._value);
    }
    this._dismiss();
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>): void {
    if (!(ev.detail as any).value) {
      this._params = undefined;
    }
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        ha-paper-dialog {
          min-width: 400px;
          max-width: 500px;
        }
        @media (max-width: 400px) {
          ha-paper-dialog {
            min-width: initial;
          }
        }
        p {
          margin: 0;
          padding-top: 6px;
          padding-bottom: 24px;
          color: var(--primary-text-color);
        }
        .secondary {
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-box": DialogBox;
  }
}
