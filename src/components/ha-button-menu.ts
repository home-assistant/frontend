import "@material/mwc-menu";
import type { Corner, Menu } from "@material/mwc-menu";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators";

@customElement("ha-button-menu")
export class HaButtonMenu extends LitElement {
  @property() public corner: Corner = "TOP_START";

  @property({ type: Boolean }) public multi = false;

  @property({ type: Boolean }) public activatable = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public fixed = false;

  @query("mwc-menu", true) private _menu?: Menu;

  public get items() {
    return this._menu?.items;
  }

  public get selected() {
    return this._menu?.selected;
  }

  protected render(): TemplateResult {
    return html`
      <div @click=${this._handleClick}>
        <slot name="trigger"></slot>
      </div>
      <mwc-menu
        .corner=${this.corner}
        .fixed=${this.fixed}
        .multi=${this.multi}
        .activatable=${this.activatable}
      >
        <slot></slot>
      </mwc-menu>
    `;
  }

  private _handleClick(): void {
    if (this.disabled) {
      return;
    }
    this._menu!.anchor = this;
    this._menu!.show();
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: inline-block;
        position: relative;
      }
      ::slotted([disabled]) {
        color: var(--disabled-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-button-menu": HaButtonMenu;
  }
}
