import {
  html,
  LitElement,
  PropertyDeclarations,
  css,
  CSSResult,
} from "lit-element";

import "@material/mwc-button";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import "../../../../components/dialog/ha-paper-dialog";
// This is not a duplicate import, one is for types, one is for element.
// tslint:disable-next-line
import { HaPaperDialog } from "../../../../components/dialog/ha-paper-dialog";
// tslint:disable-next-line
import { PaperInputElement } from "@polymer/paper-input/paper-input";

import { HomeAssistant } from "../../../../types";
import { haStyle } from "../../../../resources/styles";
import { WebhookDialogParams } from "./show-dialog-manage-cloudhook";

const inputLabel = "Public URL – Click to copy to clipboard";

export class DialogManageCloudhook extends LitElement {
  protected hass?: HomeAssistant;
  private _params?: WebhookDialogParams;

  static get properties(): PropertyDeclarations {
    return {
      _params: {},
    };
  }

  public async showDialog(params: WebhookDialogParams) {
    this._params = params;
    // Wait till dialog is rendered.
    await this.updateComplete;
    this._dialog.open();
  }

  protected render() {
    if (!this._params) {
      return html``;
    }
    const { webhook, cloudhook } = this._params;
    const docsUrl =
      webhook.domain === "automation"
        ? "https://www.home-assistant.io/docs/automation/trigger/#webhook-trigger"
        : `https://www.home-assistant.io/components/${webhook.domain}/`;
    return html`
      <ha-paper-dialog with-backdrop>
        <h2>Webhook for ${webhook.name}</h2>
        <div>
          <p>The webhook is available at the following url:</p>
          <paper-input
            label="${inputLabel}"
            value="${cloudhook.cloudhook_url}"
            @click="${this._copyClipboard}"
            @blur="${this._restoreLabel}"
          ></paper-input>
          <p>
            ${cloudhook.managed
              ? html`
                  This webhook is managed by an integration and cannot be
                  disabled.
                `
              : html`
                  If you no longer want to use this webhook, you can
                  <button class="link" @click="${this._disableWebhook}">
                    disable it</button
                  >.
                `}
          </p>
        </div>

        <div class="paper-dialog-buttons">
          <a href="${docsUrl}" target="_blank">
            <mwc-button>VIEW DOCUMENTATION</mwc-button>
          </a>
          <mwc-button @click="${this._closeDialog}">CLOSE</mwc-button>
        </div>
      </ha-paper-dialog>
    `;
  }

  private get _dialog(): HaPaperDialog {
    return this.shadowRoot!.querySelector("ha-paper-dialog")!;
  }

  private get _paperInput(): PaperInputElement {
    return this.shadowRoot!.querySelector("paper-input")!;
  }

  private _closeDialog() {
    this._dialog.close();
  }

  private async _disableWebhook() {
    if (!confirm("Are you sure you want to disable this webhook?")) {
      return;
    }

    this._params!.disableHook();
    this._closeDialog();
  }

  private _copyClipboard(ev: FocusEvent) {
    // paper-input -> iron-input -> input
    const paperInput = ev.currentTarget as PaperInputElement;
    const input = (paperInput.inputElement as any)
      .inputElement as HTMLInputElement;
    input.setSelectionRange(0, input.value.length);
    try {
      document.execCommand("copy");
      paperInput.label = "COPIED TO CLIPBOARD";
    } catch (err) {
      // Copying failed. Oh no
    }
  }

  private _restoreLabel() {
    this._paperInput.label = inputLabel;
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        ha-paper-dialog {
          width: 650px;
        }
        paper-input {
          margin-top: -8px;
        }
        button.link {
          color: var(--primary-color);
        }
        .paper-dialog-buttons a {
          text-decoration: none;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-manage-cloudhook": DialogManageCloudhook;
  }
}

customElements.define("dialog-manage-cloudhook", DialogManageCloudhook);
