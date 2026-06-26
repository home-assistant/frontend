import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-bottom-sheet";
import "../../components/ha-dialog";
import "../../components/ha-icon";
import "../../components/ha-svg-icon";
import "../../components/item/ha-list-item-button";
import "../../components/list/ha-list-base";
import type { HomeAssistant } from "../../types";
import type { HassDialog } from "../make-dialog-manager";
import type { ListItemsDialogParams } from "./show-list-items-dialog";

@customElement("dialog-list-items")
export class ListItemsDialog
  extends LitElement
  implements HassDialog<ListItemsDialogParams>
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _params?: ListItemsDialogParams;

  @state() private _open = false;

  public async showDialog(params: ListItemsDialogParams): Promise<void> {
    this._params = params;
    this._open = true;
  }

  public closeDialog(_historyState?: any): boolean {
    this._open = false;
    return true;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _itemClicked(ev: CustomEvent): void {
    const item = (ev.currentTarget as any).item;
    if (!item) return;
    item.action();
    this.closeDialog();
  }

  protected render() {
    if (!this._params || !this.hass) {
      return nothing;
    }

    const content = html`
      <div class="container">
        <ha-list-base>
          ${this._params.items.map(
            (item) => html`
              <ha-list-item-button @click=${this._itemClicked} .item=${item}>
                ${item.iconPath
                  ? html`
                      <ha-svg-icon
                        .path=${item.iconPath}
                        slot="start"
                      ></ha-svg-icon>
                    `
                  : item.icon
                    ? html` <ha-icon icon=${item.icon} slot="start"></ha-icon> `
                    : nothing}
                <span slot="headline">${item.label}</span>
                ${item.description
                  ? html`
                      <span slot="supporting-text">${item.description}</span>
                    `
                  : nothing}
              </ha-list-item-button>
            `
          )}
        </ha-list-base>
      </div>
    `;

    if (this._params.mode === "bottom-sheet") {
      return html`
        <ha-bottom-sheet
          placement="bottom"
          .open=${this._open}
          @closed=${this._dialogClosed}
        >
          ${content}
        </ha-bottom-sheet>
      `;
    }

    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${this._params.title ?? " "}
        @closed=${this._dialogClosed}
      >
        ${content}
      </ha-dialog>
    `;
  }

  static styles = css`
    ha-dialog,
    ha-bottom-sheet {
      /* Place above other dialogs */
      --dialog-z-index: 104;
      --dialog-content-padding: 0;
      --ha-row-item-padding-inline: var(--ha-space-6);
    }

    ha-bottom-sheet {
      --ha-bottom-sheet-content-padding: var(--ha-space-4) 0 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-list-items": ListItemsDialog;
  }
}
