import "@awesome.me/webawesome/dist/components/drawer/drawer";
import { css, html, LitElement, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";

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
      --show-duration: 180ms;
      --hide-duration: 180ms;
    }
    wa-drawer::part(dialog) {
      border-top-left-radius: 12px;
      border-top-right-radius: 12px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-bottom-sheet": HaBottomSheet;
  }
}
