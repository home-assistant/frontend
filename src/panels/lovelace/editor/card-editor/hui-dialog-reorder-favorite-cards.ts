import { mdiDragHorizontalVariant } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-sortable";
import "../../../../components/ha-svg-icon";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type {
  FavoriteCardItem,
  ReorderFavoriteCardsDialogParams,
} from "./show-reorder-favorite-cards-dialog";

@customElement("hui-dialog-reorder-favorite-cards")
export class HuiDialogReorderFavoriteCards extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: ReorderFavoriteCardsDialogParams;

  @state() private _open = false;

  @state() private _favorites: FavoriteCardItem[] = [];

  public async showDialog(
    params: ReorderFavoriteCardsDialogParams
  ): Promise<void> {
    this._params = params;
    this._favorites = params.favorites;
    this._open = true;
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    this._open = false;
    this._params = undefined;
    this._favorites = [];
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${this.hass.localize(
          "ui.panel.lovelace.editor.card.generic.reorder_favorites"
        )}
        @closed=${this._dialogClosed}
      >
        <ha-sortable handle-selector=".handle" @item-moved=${this._moved}>
          <div class="favorites">
            ${repeat(
              this._favorites,
              (favorite) => favorite.key,
              (favorite) => html`
                <div class="favorite">
                  <div class="handle">
                    <ha-svg-icon
                      .path=${mdiDragHorizontalVariant}
                    ></ha-svg-icon>
                  </div>
                  <span class="name">${favorite.name}</span>
                </div>
              `
            )}
          </div>
        </ha-sortable>
        <ha-dialog-footer slot="footer">
          <ha-button slot="primaryAction" @click=${this.closeDialog}>
            ${this.hass.localize("ui.common.close")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _moved(ev: HASSDomEvent<HASSDomEvents["item-moved"]>): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const favorites = [...this._favorites];
    const [moved] = favorites.splice(oldIndex, 1);
    favorites.splice(newIndex, 0, moved);

    this._favorites = favorites;
    this._params!.saveFavorites(favorites.map((favorite) => favorite.key));
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        .favorites {
          display: flex;
          flex-direction: column;
        }
        .favorite {
          display: flex;
          align-items: center;
          gap: var(--ha-space-2);
          min-height: var(--ha-space-12);
        }
        .handle {
          display: flex;
          align-items: center;
          cursor: grab;
          padding: var(--ha-space-2);
          color: var(--secondary-text-color);
        }
        .name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-reorder-favorite-cards": HuiDialogReorderFavoriteCards;
  }
}
