import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import "@polymer/paper-dialog/paper-dialog";
import "@polymer/paper-item/paper-item";
// tslint:disable-next-line:no-duplicate-imports
import { PaperDialogElement } from "@polymer/paper-dialog/paper-dialog";

import { hassLocalizeLitMixin } from "../../../../mixins/lit-localize-mixin";
import { moveCard } from "../config-util";
import { MoveCardViewDialogParams } from "./show-move-card-view-dialog";

export class HuiDialogMoveCardView extends hassLocalizeLitMixin(LitElement) {
  private _params?: MoveCardViewDialogParams;

  static get properties(): PropertyDeclarations {
    return {
      _params: {},
    };
  }

  public async showDialog(params: MoveCardViewDialogParams): Promise<void> {
    this._params = params;
    await this.updateComplete;
  }

  protected render(): TemplateResult {
    return html`
      <style>
        paper-item {
          margin: 8px;
        }
        paper-item[active] {
          color: var(--primary-color);
        }
        paper-item[active]:before {
          border-radius: 4px;
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          pointer-events: none;
          content: "";
          background-color: var(--primary-color);
          opacity: 0.12;
          transition: opacity 15ms linear;
          will-change: opacity;
        }
      </style>
      <paper-dialog with-backdrop opened>
        <h2>Choose view to move card</h2>
        ${
          this._params!.lovelace!.config.views.map((view, index) => {
            return html`
              <paper-item
                ?active="${this._params!.path![0] === index}"
                @click="${this._moveCard}"
                .index="${index}"
                >${view.title}</paper-item
              >
            `;
          })
        }
      </paper-dialog>
    `;
  }

  private get _dialog(): PaperDialogElement {
    return this.shadowRoot!.querySelector("paper-dialog")!;
  }

  private _moveCard(e: Event): void {
    const newView = (e.currentTarget! as any).index;
    const lovelace = this._params!.lovelace!;
    const path = this._params!.path!;

    if (newView === path[0]) {
      return;
    }

    lovelace.saveConfig(moveCard(lovelace.config, path, [newView!]));
    this._dialog.close();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-move-card-view": HuiDialogMoveCardView;
  }
}

customElements.define("hui-dialog-move-card-view", HuiDialogMoveCardView);
