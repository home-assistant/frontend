import type { Button } from "@material/mwc-button";
import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { FOCUS_TARGET } from "../dialogs/make-dialog-manager";
import type { HaIconButton } from "./ha-icon-button";
import "./ha-md-menu";
import type { HaMdMenu } from "./ha-md-menu";

@customElement("ha-md-button-menu")
export class HaMdButtonMenu extends LitElement {
  protected readonly [FOCUS_TARGET];

  @property({ type: Boolean }) public disabled = false;

  @property() public positioning?: "fixed" | "absolute" | "popover";

  @property({ type: Boolean, attribute: "has-overflow" }) public hasOverflow =
    false;

  @query("ha-md-menu", true) private _menu!: HaMdMenu;

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
      <ha-md-menu
        .positioning=${this.positioning}
        .hasOverflow=${this.hasOverflow}
        @opening=${this._handleOpening}
        @closing=${this._handleClosing}
      >
        <slot></slot>
      </ha-md-menu>
    `;
  }

  private _handleOpening(): void {
    fireEvent(this, "opening", undefined, { composed: false });
  }

  private _handleClosing(): void {
    fireEvent(this, "closing", undefined, { composed: false });
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

  static styles = css`
    :host {
      display: inline-block;
      position: relative;
    }
    ::slotted([disabled]) {
      color: var(--disabled-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-md-button-menu": HaMdButtonMenu;
  }
}

declare global {
  interface HASSDomEvents {
    opening: undefined;
    closing: undefined;
  }
}
