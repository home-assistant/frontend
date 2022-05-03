import "@material/mwc-menu";
import type { Corner, Menu, MenuCorner } from "@material/mwc-menu";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators";

@customElement("ha-button-menu")
export class HaButtonMenu extends LitElement {
  @property() public corner: Corner = "TOP_START";

  @property() public menuCorner: MenuCorner = "START";

  @property({ type: Number }) public x?: number;

  @property({ type: Number }) public y?: number;

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
        id="menu"
        .corner=${this.corner}
        .menuCorner=${this.menuCorner}
        .fixed=${this.fixed}
        .multi=${this.multi}
        .activatable=${this.activatable}
        .y=${this.y}
        .x=${this.x}
      >
        <slot></slot>
      </mwc-menu>
    `;
  }

  protected firstUpdated(changedProps): void {
    super.firstUpdated(changedProps);

    this.updateComplete.then(() => {
      this.querySelectorAll("mwc-list-item").forEach((item) => {
        item._getUpdateComplete = item.getUpdateComplete;

        var style = document.createElement("style");
        style.innerHTML =
          ".rtl-fix, .rtl-fix2 { margin-left: var(--mdc-list-item-graphic-margin, 32px) !important; margin-right: 0px !important;}";
        item.shadowRoot.appendChild(style);
        var span = item.shadowRoot?.querySelector("span:first-child");
        span.className = "rtl-fix";

        item.getUpdateComplete = function () {
          var result = item._getUpdateComplete();
          var span = item.shadowRoot?.querySelector(".rtl-fix");
          span!.className = "rtl-fix2";
          new Promise(function (resolve, reject) {
            setTimeout(() => resolve("done"), 0);
          }).then(() => {
            span!.className = "rtl-fix";
          });

          return result;
          // wait for all children to render... and then inject again.
          // check if we need original injection
        };
      });
    });
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

      /*
      :host-context([style*="direction: rtl;"]) mwc-menu mwc-list-item {
        background-color: red;
        margin-right: 0px !important;
        margin-left: var(--mdc-list-item-graphic-margin, 32px);
      }
      */

      /*:host-context([style*="direction: rtl;"]) span([class*="graphic"]) {*/
      /*
            :host-context([style*="direction: rtl;"])
        mwc-menu
        ::slotted([mwc-list-item]) {
        background-color: red;
        margin-right: 0px !important;
        margin-left: var(--mdc-list-item-graphic-margin, 32px);
      }
*/

      /*
      :host-context([style*="direction: rtl;"]) ::slotted([mwc-list-item]) {
        background-color: red;
        margin-right: 0px !important;
        margin-left: var(--mdc-list-item-graphic-margin, 32px);
      }
      */
      /*::slotted([mwc-list-item]) {*/
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-button-menu": HaButtonMenu;
  }
}
