import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
  css,
  CSSResult,
} from "lit-element";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-item/paper-icon-item";
import "../../../../components/dialog/ha-paper-dialog";
import { toggleAttribute } from "../../../../common/dom/toggle_attribute";

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
      this._params!.lovelace!.config
        ? !this._params!.lovelace!.config.views.some((view) => view.icon)
        : true
    );
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
        <paper-listbox>
          ${this._params!.lovelace!.config.views.map(
            (view, index) => html`
              <paper-icon-item @click=${this._selectView} .index="${index}">
                ${view.icon
                  ? html`
                      <ha-icon .icon=${view.icon} slot="item-icon"></ha-icon>
                    `
                  : ""}
                ${view.title || view.path}
              </paper-icon-item>
            `
          )}
        </paper-listbox>
      </ha-paper-dialog>
    `;
  }

  static get styles(): CSSResult {
    return css`
      paper-listbox {
        padding-top: 0;
      }

      paper-listbox ha-icon {
        padding: 12px;
        color: var(--secondary-text-color);
      }

      paper-icon-item {
        cursor: pointer;
      }

      :host([hide-icons]) paper-icon-item {
        --paper-item-icon-width: 0px;
      }
    `;
  }

  private get _dialog(): HaPaperDialog {
    return this.shadowRoot!.querySelector("ha-paper-dialog")!;
  }

  private _selectView(e: Event): void {
    const view = (e.currentTarget! as any).index;
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
