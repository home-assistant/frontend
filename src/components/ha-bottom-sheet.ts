import { css, html, LitElement, type PropertyValues } from "lit";
import "@home-assistant/webawesome/dist/components/drawer/drawer";
import { customElement, property, state } from "lit/decorators";

export const BOTTOM_SHEET_ANIMATION_DURATION_MS = 300;

@customElement("ha-bottom-sheet")
export class HaBottomSheet extends LitElement {
  @property({ type: Boolean }) public open = false;

  @state() private _drawerOpen = false;

  private _handleAfterHide() {
    this.open = false;
    const ev = new Event("closed", {
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(ev);
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (changedProperties.has("open")) {
      this._drawerOpen = this.open;
    }
  }

  render() {
    return html`
      <wa-drawer
        placement="bottom"
        .open=${this._drawerOpen}
        @wa-after-hide=${this._handleAfterHide}
        without-header
      >
        <slot></slot>
      </wa-drawer>
    `;
  }

  static styles = css`
    wa-drawer {
      --wa-color-surface-raised: var(
        --ha-dialog-surface-background,
        var(--mdc-theme-surface, #fff)
      );
      --spacing: 0;
      --size: auto;
      --show-duration: ${BOTTOM_SHEET_ANIMATION_DURATION_MS}ms;
      --hide-duration: ${BOTTOM_SHEET_ANIMATION_DURATION_MS}ms;
    }
    wa-drawer::part(dialog) {
      border-top-left-radius: var(--ha-border-radius-lg);
      border-top-right-radius: var(--ha-border-radius-lg);
    }
    wa-drawer::part(body) {
      padding-bottom: var(--safe-area-inset-bottom);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-bottom-sheet": HaBottomSheet;
  }
}
