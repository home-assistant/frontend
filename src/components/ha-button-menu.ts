import {
  customElement,
  html,
  TemplateResult,
  LitElement,
  CSSResult,
  css,
  query,
  property,
} from "lit-element";
import "@material/mwc-button";
import "@material/mwc-menu";
import type { Menu, Corner } from "@material/mwc-menu";

import "./ha-icon-button";

@customElement("ha-button-menu")
export class HaButtonMenu extends LitElement {
  @property() public corner: Corner = "TOP_START";

  @property({ type: Boolean }) public multi = false;

  @property({ type: Boolean }) public activatable = false;

  @query("mwc-menu") private _menu?: Menu;

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
        .multi=${this.multi}
        .activatable=${this.activatable}
      >
        <slot></slot>
      </mwc-menu>
    `;
  }

  private _handleClick(): void {
    this._menu!.anchor = this;
    this._menu!.show();
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: inline-block;
        position: relative;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-button-menu": HaButtonMenu;
  }
}
