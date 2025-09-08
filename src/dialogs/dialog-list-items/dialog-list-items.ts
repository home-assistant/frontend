import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-bottom-sheet";
import { createCloseHeading } from "../../components/ha-dialog";
import "../../components/ha-icon";
import "../../components/ha-md-list";
import "../../components/ha-md-list-item";
import "../../components/ha-svg-icon";
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
    await this.updateComplete;
    this._open = true;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    this._open = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _closeDialog(): void {
    this._open = false;
  }

  private _itemClicked(ev: CustomEvent): void {
    const item = (ev.currentTarget as any).item;
    if (!item) return;
    item.action();
    this._closeDialog();
  }

  protected render() {
    if (!this._params || !this.hass) {
      return nothing;
    }

    const content = html`
      <div class="container">
        <ha-md-list>
          ${this._params.items.map(
            (item) => html`
              <ha-md-list-item
                type="button"
                @click=${this._itemClicked}
                .item=${item}
              >
                ${item.iconPath
                  ? html`
                      <ha-svg-icon
                        .path=${item.iconPath}
                        slot="start"
                        class="item-icon"
                      ></ha-svg-icon>
                    `
                  : item.icon
                    ? html`
                        <ha-icon
                          icon=${item.icon}
                          slot="start"
                          class="item-icon"
                        ></ha-icon>
                      `
                    : nothing}
                <span class="headline">${item.label}</span>
                ${item.description
                  ? html`
                      <span class="supporting-text">${item.description}</span>
                    `
                  : nothing}
              </ha-md-list-item>
            `
          )}
        </ha-md-list>
      </div>
    `;

    if (this._params.mode === "bottom-sheet") {
      return html`
        <ha-bottom-sheet
          .open=${this._open}
          @wa-after-hide=${this._dialogClosed}
        >
          ${content}
        </ha-bottom-sheet>
      `;
    }

    return html`
      <ha-dialog
        open
        .heading=${createCloseHeading(this.hass, this._params.title ?? " ")}
        @closed=${this._dialogClosed}
        hideActions
      >
        ${content}
      </ha-dialog>
    `;
  }

  static styles = css`
    ha-dialog {
      /* Place above other dialogs */
      --dialog-z-index: 104;
      --dialog-content-padding: 0;
      --md-list-item-leading-space: 24px;
      --md-list-item-trailing-space: 24px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-list-items": ListItemsDialog;
  }
}
