import { Menu } from "@material/web/menu/internal/menu";
import { styles } from "@material/web/menu/internal/menu-styles";
import type { CloseMenuEvent } from "@material/web/menu/menu";
import {
  CloseReason,
  KeydownCloseKey,
} from "@material/web/menu/internal/controllers/shared";
import { css } from "lit";
import { customElement } from "lit/decorators";
import type { HaMdMenuItem } from "./ha-md-menu-item";

@customElement("ha-md-menu")
export class HaMdMenu extends Menu {
  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("close-menu", this._handleCloseMenu);
  }

  private _handleCloseMenu(ev: CloseMenuEvent) {
    if (
      ev.detail.reason.kind === CloseReason.KEYDOWN &&
      ev.detail.reason.key === KeydownCloseKey.ESCAPE
    ) {
      return;
    }
    (ev.detail.initiator as HaMdMenuItem).clickAction?.(ev.detail.initiator);
  }

  static override styles = [
    styles,
    css`
      :host {
        --md-sys-color-surface-container: var(--card-background-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-md-menu": HaMdMenu;
  }

  interface HTMLElementEventMap {
    "close-menu": CloseMenuEvent;
  }
}
