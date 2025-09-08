import { css, html, LitElement, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import "./ha-wa-drawer";

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
      <ha-wa-drawer
        placement="bottom"
        .open=${this._drawerOpen}
        @wa-after-hide=${this._handleAfterHide}
        without-header
      >
        <slot></slot>
      </ha-wa-drawer>
    `;
  }

  static styles = css`
    ha-wa-drawer {
      --size: auto;
      --show-duration: 200ms;
      --hide-duration: 200ms;
    }
    ha-wa-drawer::part(dialog) {
      border-top-left-radius: var(--ha-border-radius-lg);
      border-top-right-radius: var(--ha-border-radius-lg);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-bottom-sheet": HaBottomSheet;
  }
}
