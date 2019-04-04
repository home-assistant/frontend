import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
  css,
  CSSResult,
} from "lit-element";
import "@polymer/paper-item/paper-item";
import "../../../../components/dialog/ha-paper-dialog";
// tslint:disable-next-line:no-duplicate-imports
import { HaPaperDialog } from "../../../../components/dialog/ha-paper-dialog";

import { moveCard } from "../config-util";
import { MoveCardViewDialogParams } from "./show-move-card-view-dialog";
import { PolymerChangedEvent } from "../../../../polymer-types";

@customElement("hui-dialog-move-card-view")
export class HuiDialogMoveCardView extends LitElement {
  @property() private _params?: MoveCardViewDialogParams;

  public async showDialog(params: MoveCardViewDialogParams): Promise<void> {
    this._params = params;
    await this.updateComplete;
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
        <h2>Choose view to move card</h2>
        ${this._params!.lovelace!.config.views.map((view, index) => {
          return html`
            <paper-item
              ?active="${this._params!.path![0] === index}"
              @click="${this._moveCard}"
              .index="${index}"
              >${view.title}</paper-item
            >
          `;
        })}
      </ha-paper-dialog>
    `;
  }

  static get styles(): CSSResult {
    return css`
      paper-item {
        margin: 8px;
        cursor: pointer;
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
    `;
  }

  private get _dialog(): HaPaperDialog {
    return this.shadowRoot!.querySelector("ha-paper-dialog")!;
  }

  private _moveCard(e: Event): void {
    const newView = (e.currentTarget! as any).index;
    const path = this._params!.path!;
    if (newView === path[0]) {
      return;
    }

    const lovelace = this._params!.lovelace!;

    lovelace.saveConfig(moveCard(lovelace.config, path, [newView!]));
    this._dialog.close();
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>): void {
    if (!(ev.detail as any).value) {
      this._params = undefined;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-move-card-view": HuiDialogMoveCardView;
  }
}
