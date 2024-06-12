import { MdMenu } from "@material/web/menu/menu";
import {
  CloseReason,
  KeydownCloseKey,
} from "@material/web/menu/internal/controllers/shared";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-menu")
export class HaMenu extends MdMenu {
  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("close-menu", this._handleCloseMenu);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener("close-menu", this._handleCloseMenu);
  }

  _handleCloseMenu(ev) {
    if (
      ev.detail.reason.kind === CloseReason.KEYDOWN &&
      ev.detail.reason.key === KeydownCloseKey.ESCAPE
    )
      return;
    ev.target.closeAction?.(ev);
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
}
