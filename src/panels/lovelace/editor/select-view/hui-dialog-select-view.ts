import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
} from "lit-element";

import "../../../../components/dialog/ha-paper-dialog";
import { toggleAttribute } from "../../../../common/dom/toggle_attribute";
import "../../components/hui-views-list";

// tslint:disable-next-line:no-duplicate-imports
import { HaPaperDialog } from "../../../../components/dialog/ha-paper-dialog";

import { SelectViewDialogParams } from "./show-select-view-dialog";
import { PolymerChangedEvent } from "../../../../polymer-types";

@customElement("hui-dialog-select-view")
export class HuiDialogSelectView extends LitElement {
  @property() private _params?: SelectViewDialogParams;

  public async showDialog(params: SelectViewDialogParams): Promise<void> {
    this._params = params;
    await this.updateComplete;
  }

  protected updated(changedProps) {
    super.updated(changedProps);
    toggleAttribute(
      this,
      "hide-icons",
      this._params?.lovelaceConfig
        ? !this._params.lovelaceConfig.views.some((view) => view.icon)
        : true
    );
  }

  protected render(): TemplateResult {
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
        <hui-views-list 
        .lovelaceConfig=${this._params!.lovelaceConfig}
        @view-selected=${this._selectView}>
        </hui-view-list>
      </ha-paper-dialog>
    `;
  }

  private get _dialog(): HaPaperDialog {
    return this.shadowRoot!.querySelector("ha-paper-dialog")!;
  }

  private _selectView(e: CustomEvent): void {
    const view: number = e.detail.view;
    this._params!.viewSelectedCallback(view);
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
