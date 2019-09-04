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

import { SelectViewDialogParams } from "./show-select-view-dialog";
import { PolymerChangedEvent } from "../../../../polymer-types";
import { fireEvent } from "../../../../common/dom/fire_event";

declare global {
  // for fire event
  interface HASSDomEvents {
    "view-selected": ViewSelectedEvent;
  }
}

export interface ViewSelectedEvent {
  view: number;
}

@customElement("hui-dialog-select-view")
export class HuiDialogSelectView extends LitElement {
  @property() private _params?: SelectViewDialogParams;

  public async showDialog(params: SelectViewDialogParams): Promise<void> {
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
        <h2>Choose a view</h2>
        ${this._params!.lovelace!.config.views.map((view, index) => {
          return html`
            <paper-item @click="${this._selectView}" .index="${index}"
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
    `;
  }

  private get _dialog(): HaPaperDialog {
    return this.shadowRoot!.querySelector("ha-paper-dialog")!;
  }

  private _selectView(e: Event): void {
    const view = (e.currentTarget! as any).index;
    fireEvent(this, "view-selected", { view });
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
    "hui-dialog-select-view": HuiDialogSelectView;
  }
}
