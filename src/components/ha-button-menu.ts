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
        span!.classList.add("rtl-fix");

        item.getUpdateComplete = function () {
          var result = item._getUpdateComplete();

          // re-apply class since something in ripple handler resets it even though no style changes
          var span = item.shadowRoot?.querySelector(".rtl-fix");
          span!.classList.remove("rtl-fix");
          span!.classList.add("rtl-fix2");

          new Promise(function (resolve, reject) {
            setTimeout(() => resolve("done"), 0);
          }).then(() => {
            span!.classList.remove("rtl-fix2");
            span!.classList.add("rtl-fix");
          });

          return result;
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-button-menu": HaButtonMenu;
  }
}
