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
      display: flex;
      flex-direction: column;
      top: 0;
      inset-inline-start: 0;
      position: fixed;
      width: calc(
        100% - 4px - var(--safe-area-inset-left) - var(--safe-area-inset-right)
      );
      max-width: 100%;
      border: none;
      box-shadow: var(--wa-shadow-l);
      padding: 0;
      margin: 0;
      top: auto;
      inset-inline-end: auto;
      bottom: 0;
      inset-inline-start: 0;
      box-shadow: 0px -8px 16px rgba(0, 0, 0, 0.2);
      border-top-left-radius: var(
        --ha-dialog-border-radius,
        var(--ha-border-radius-2xl)
      );
      border-top-right-radius: var(
        --ha-dialog-border-radius,
        var(--ha-border-radius-2xl)
      );
      transform: translateY(100%);
      transition: transform ${BOTTOM_SHEET_ANIMATION_DURATION_MS}ms ease;
      border-top-width: var(--ha-bottom-sheet-border-width);
      border-right-width: var(--ha-bottom-sheet-border-width);
      border-left-width: var(--ha-bottom-sheet-border-width);
      border-bottom-width: 0;
      border-style: var(--ha-bottom-sheet-border-style);
      border-color: var(--ha-bottom-sheet-border-color);
      margin-left: var(--safe-area-inset-left);
      margin-right: var(--safe-area-inset-right);
      margin-bottom: var(--safe-area-inset-bottom);
    }
    wa-drawer::part(dialog) {
      border-top-left-radius: var(--ha-border-radius-lg);
      border-top-right-radius: var(--ha-border-radius-lg);
      max-height: 90vh;
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
