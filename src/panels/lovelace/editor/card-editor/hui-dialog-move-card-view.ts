import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import "@polymer/paper-dialog/paper-dialog";
import "@polymer/paper-radio-button/paper-radio-button";
import "@polymer/paper-radio-group/paper-radio-group";
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
        paper-radio-button {
          display: block;
        }
      </style>
      <paper-dialog with-backdrop opened>
        <h2>Move card to view</h2>
        <paper-radio-group
          @selected-changed="${this._moveCard}"
          .selected="${this._params!.path![0]}"
        >
          ${
            this._params!.lovelace!.config.views.map((view, index) => {
              return html`
                <paper-radio-button .name="${index}"
                  >${view.title}</paper-radio-button
                >
              `;
            })
          }
        </paper-radio-group>
      </paper-dialog>
    `;
  }

  private get _dialog(): PaperDialogElement {
    return this.shadowRoot!.querySelector("paper-dialog")!;
  }

  private _moveCard(e: Event): void {
    const newView = (e.currentTarget! as any).selected;
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
