import "@home-assistant/webawesome/dist/components/drawer/drawer";
import { css, html, LitElement, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";

export const BOTTOM_SHEET_ANIMATION_DURATION_MS = 300;

@customElement("ha-bottom-sheet")
export class HaBottomSheet extends LitElement {
  @property({ type: Boolean }) public open = false;

  @property({ type: Boolean, reflect: true, attribute: "flexcontent" })
  public flexContent = false;

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
      --wa-color-surface-raised: transparent;
      --spacing: 0;
      --size: var(--ha-bottom-sheet-height, auto);
      --show-duration: ${BOTTOM_SHEET_ANIMATION_DURATION_MS}ms;
      --hide-duration: ${BOTTOM_SHEET_ANIMATION_DURATION_MS}ms;
    }
    wa-drawer::part(dialog) {
      max-height: var(--ha-bottom-sheet-max-height, 90vh);
      align-items: center;
    }
    wa-drawer::part(body) {
      max-width: var(--ha-bottom-sheet-max-width);
      width: 100%;
      border-top-left-radius: var(
        --ha-bottom-sheet-border-radius,
        var(--ha-dialog-border-radius, var(--ha-border-radius-2xl))
      );
      border-top-right-radius: var(
        --ha-bottom-sheet-border-radius,
        var(--ha-dialog-border-radius, var(--ha-border-radius-2xl))
      );
      background-color: var(
        --ha-bottom-sheet-surface-background,
        var(--ha-dialog-surface-background, var(--mdc-theme-surface, #fff)),
      );
      padding: var(
        --ha-bottom-sheet-padding,
        0 var(--safe-area-inset-right) var(--safe-area-inset-bottom)
          var(--safe-area-inset-left)
      );
    }

    :host([flexcontent]) wa-drawer::part(body) {
      display: flex;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-bottom-sheet": HaBottomSheet;
  }
}
