import "@home-assistant/webawesome/dist/components/drawer/drawer";
import { css, html, LitElement, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { haStyleScrollbar } from "../resources/styles";

export const BOTTOM_SHEET_ANIMATION_DURATION_MS = 300;

@customElement("ha-bottom-sheet")
export class HaBottomSheet extends LitElement {
  @property({ type: Boolean }) public open = false;

  @property({ type: Boolean, reflect: true, attribute: "flexcontent" })
  public flexContent = false;

  @state() private _drawerOpen = false;

  @query(".body") public bodyContainer!: HTMLDivElement;

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
        <slot name="header"></slot>
        <div class="body ha-scrollbar">
          <slot></slot>
        </div>
      </wa-drawer>
    `;
  }

  static styles = [
    haStyleScrollbar,
    css`
      wa-drawer {
        --wa-color-surface-raised: var(
          --ha-bottom-sheet-surface-background,
          var(--ha-dialog-surface-background, var(--mdc-theme-surface, #fff)),
        );
        --spacing: 0;
        --size: auto;
        --show-duration: ${BOTTOM_SHEET_ANIMATION_DURATION_MS}ms;
        --hide-duration: ${BOTTOM_SHEET_ANIMATION_DURATION_MS}ms;
      }
      wa-drawer::part(dialog) {
        border-top-left-radius: var(
          --ha-bottom-sheet-border-radius,
          var(--ha-dialog-border-radius, var(--ha-border-radius-2xl))
        );
        border-top-right-radius: var(
          --ha-bottom-sheet-border-radius,
          var(--ha-dialog-border-radius, var(--ha-border-radius-2xl))
        );
        max-height: 90vh;
        padding-bottom: var(--safe-area-inset-bottom);
        padding-left: var(--safe-area-inset-left);
        padding-right: var(--safe-area-inset-right);
      }

      .body {
        position: var(--dialog-content-position, relative);
        padding: 0 var(--dialog-content-padding, var(--ha-space-6))
          var(--dialog-content-padding, var(--ha-space-6))
          var(--dialog-content-padding, var(--ha-space-6));
        overflow: auto;
        flex-grow: 1;
      }

      :host([flexcontent]) wa-drawer::part(body) {
        display: flex;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-bottom-sheet": HaBottomSheet;
  }
}
