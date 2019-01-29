import {
  LitElement,
  html,
  css,
  PropertyDeclarations,
  CSSResult,
  TemplateResult,
} from "lit-element";
import "@polymer/paper-dialog/paper-dialog";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";

import { SystemLogDetailDialogParams } from "./show-dialog-system-log-detail";
import { PolymerChangedEvent } from "../../polymer-types";
import { haStyleDialog } from "../../resources/ha-style";

class DialogSystemLogDetail extends LitElement {
  private _params?: SystemLogDetailDialogParams;

  static get properties(): PropertyDeclarations {
    return {
      _params: {},
    };
  }

  public async showDialog(params: SystemLogDetailDialogParams): Promise<void> {
    this._params = params;
    await this.updateComplete;
  }

  protected render(): TemplateResult | void {
    if (!this._params) {
      return html``;
    }
    const item = this._params.item;

    return html`
      <paper-dialog
        with-backdrop
        opened
        @opened-changed="${this._openedChanged}"
      >
        <h2>Log Details (${item.level})</h2>
        <paper-dialog-scrollable>
          <p>${new Date(item.timestamp * 1000)}</p>
          ${item.message
            ? html`
                <pre>${item.message}</pre>
              `
            : html``}
          ${item.exception
            ? html`
                <pre>${item.exception}</pre>
              `
            : html``}
        </paper-dialog-scrollable>
      </paper-dialog>
    `;
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>): void {
    if (!(ev.detail as any).value) {
      this._params = undefined;
    }
  }

  static get styles(): CSSResult[] {
    return [haStyleDialog, css``];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-system-log-detail": DialogSystemLogDetail;
  }
}

customElements.define("dialog-system-log-detail", DialogSystemLogDetail);
