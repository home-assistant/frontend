import { Button } from "@material/mwc-button";
import "@material/web/menu/menu";
import type { MdMenu } from "@material/web/menu/menu";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators";
import { FOCUS_TARGET } from "../dialogs/make-dialog-manager";
import type { HaIconButton } from "./ha-icon-button";

@customElement("ha-button-menu-new")
export class HaButtonMenuNew extends LitElement {
  protected readonly [FOCUS_TARGET];

  @property({ type: Boolean }) public disabled = false;

  @property() public positioning?: "fixed" | "absolute" | "popover";

  @property({ type: Boolean, attribute: "has-overflow" }) public hasOverflow =
    false;

  @query("md-menu", true) private _menu!: MdMenu;

  public get items() {
    return this._menu.items;
  }

  public override focus() {
    if (this._menu.open) {
      this._menu.focus();
    } else {
      this._triggerButton?.focus();
    }
  }

  protected render(): TemplateResult {
    return html`
      <div @click=${this._handleClick}>
        <slot name="trigger" @slotchange=${this._setTriggerAria}></slot>
      </div>
      <md-menu
        .positioning=${this.positioning}
        .hasOverflow=${this.hasOverflow}
      >
        <slot></slot>
      </md-menu>
    `;
  }

  private _handleClick(): void {
    if (this.disabled) {
      return;
    }
    this._menu.anchorElement = this;
    if (this._menu.open) {
      this._menu.close();
    } else {
      this._menu.show();
    }
  }

  private get _triggerButton() {
    return this.querySelector(
      'ha-icon-button[slot="trigger"], mwc-button[slot="trigger"], ha-assist-chip[slot="trigger"]'
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
      /* TODO: Migrate to ha-menu and ha-menu-item */
      md-menu {
        --md-menu-container-color: var(--card-background-color);
      }
      ::slotted(*) {
        --md-menu-item-label-text-color: var(--primary-text-color);
        --md-list-item-selected-label-text-color: var(--primary-text-color);
        --md-sys-color-on-surface-variant: var(--secondary-text-color);
        --mdc-icon-size: 16px;
        --md-menu-item-selected-container-color: rgba(
          var(--rgb-primary-color),
          0.15
        );
        --md-menu-item-selected-label-text-color: var(--primary-text-color);
      }
      ::slotted(md-menu-item.selected) {
        --md-menu-item-label-text-color: var(--primary-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-button-menu-new": HaButtonMenuNew;
  }
}
