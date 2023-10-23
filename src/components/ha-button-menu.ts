import type { Button } from "@material/mwc-button";
import "@material/mwc-menu";
import type { Corner, Menu, MenuCorner } from "@material/mwc-menu";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators";
import { FOCUS_TARGET } from "../dialogs/make-dialog-manager";
import type { HaIconButton } from "./ha-icon-button";

@customElement("ha-button-menu")
export class HaButtonMenu extends LitElement {
  protected readonly [FOCUS_TARGET];

  @property() public corner: Corner = "BOTTOM_START";

  @property() public menuCorner: MenuCorner = "START";

  @property({ type: Number }) public x: number | null = null;

  @property({ type: Number }) public y: number | null = null;

  @property({ type: Boolean }) public multi = false;

  @property({ type: Boolean }) public activatable = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public fixed = false;

  @property({ type: Boolean, attribute: "no-anchor" }) public noAnchor = false;

  @query("mwc-menu", true) private _menu?: Menu;

  public get items() {
    return this._menu?.items;
  }

  public get selected() {
    return this._menu?.selected;
  }

  public override focus() {
    if (this._menu?.open) {
      this._menu.focusItemAtIndex(0);
    } else {
      this._triggerButton?.focus();
    }
  }

  protected render(): TemplateResult {
    return html`
      <div @click=${this._handleClick}>
        <slot name="trigger" @slotchange=${this._setTriggerAria}></slot>
      </div>
      <mwc-menu
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

    if (document.dir === "rtl") {
      this.updateComplete.then(() => {
        this.querySelectorAll("mwc-list-item").forEach((item) => {
          const style = document.createElement("style");
          style.innerHTML =
            "span.material-icons:first-of-type { margin-left: var(--mdc-list-item-graphic-margin, 32px) !important; margin-right: 0px !important;}";
          item!.shadowRoot!.appendChild(style);
        });
      });
    }
  }

  private _handleClick(): void {
    if (this.disabled) {
      return;
    }
    this._menu!.anchor = this.noAnchor ? null : this;
    this._menu!.show();
  }

  private get _triggerButton() {
    return this.querySelector(
      'ha-icon-button[slot="trigger"], mwc-button[slot="trigger"]'
    ) as HaIconButton | Button | null;
  }

  private _setTriggerAria() {
    if (this._triggerButton) {
      this._triggerButton.ariaHasPopup = "menu";
    }
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
