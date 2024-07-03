import { MdMenu } from "@material/web/menu/menu";
import type { CloseMenuEvent } from "@material/web/menu/menu";
import {
  CloseReason,
  KeydownCloseKey,
} from "@material/web/menu/internal/controllers/shared";
import { css } from "lit";
import { customElement } from "lit/decorators";
import type { HaMenuItem } from "./ha-menu-item";

@customElement("ha-menu")
export class HaMenu extends MdMenu {
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
    (ev.detail.initiator as HaMenuItem).clickAction?.(ev.detail.initiator);
  }

  static override styles = [
    ...super.styles,
    css`
      :host {
        --md-sys-color-surface-container: var(--card-background-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-menu": HaMenu;
  }

  interface HTMLElementEventMap {
    "close-menu": CloseMenuEvent;
  }
}
