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
import { ConfirmationDialogParams } from "./show-dialog-confirmation";
import { PolymerChangedEvent } from "../../polymer-types";
import { haStyleDialog } from "../../resources/styles";

@customElement("dialog-confirmation")
class DialogConfirmation extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() private _params?: ConfirmationDialogParams;

  public async showDialog(params: ConfirmationDialogParams): Promise<void> {
    this._params = params;
  }

  protected render(): TemplateResult | void {
    if (!this._params) {
      return html``;
    }

    return html`
      <ha-paper-dialog
        with-backdrop
        opened
        @opened-changed="${this._openedChanged}"
      >
        <h2>
          ${this._params.title
            ? this._params.title
            : this.hass.localize("ui.dialogs.confirmation.title")}
        </h2>
        <paper-dialog-scrollable>
          <p>${this._params.text}</p>
        </paper-dialog-scrollable>
        <div class="paper-dialog-buttons">
          <mwc-button @click="${this._dismiss}">
            ${this.hass.localize("ui.dialogs.confirmation.cancel")}
          </mwc-button>
          <mwc-button @click="${this._confirm}">
            ${this.hass.localize("ui.dialogs.confirmation.ok")}
          </mwc-button>
        </div>
      </ha-paper-dialog>
    `;
  }

  private async _dismiss(): Promise<void> {
    this._params = undefined;
  }

  private async _confirm(): Promise<void> {
    this._params!.confirm();
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
    "dialog-confirmation": DialogConfirmation;
  }
}
