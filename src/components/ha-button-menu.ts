import {
  customElement,
  html,
  TemplateResult,
  LitElement,
  CSSResult,
  css,
  query,
} from "lit-element";
import "@material/mwc-button";
import "@material/mwc-menu";
import "@material/mwc-list/mwc-list-item";
import type { Menu } from "@material/mwc-menu";

import "./ha-icon-button";

@customElement("ha-button-menu")
export class HaButtonMenu extends LitElement {
  public icon?: string;

  public text?: string;

  @query("mwc-menu") private _menu?: Menu;

  protected render(): TemplateResult {
    return html`
      ${this.icon
        ? html`
            <ha-icon-button
              .icon=${this.icon}
              @click=${this._handleClick}
            ></ha-icon-button>
          `
        : this.text
        ? html`
            <mwc-button
              .label=${this.text}
              @click=${this._handleClick}
            ></mwc-button>
          `
        : ""}
      <mwc-menu>
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
        position: relative;
        --mdc-theme-surface: var(--card-background-color);
        --mdc-theme-text-primary-on-background: var(--primary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-button-menu": HaButtonMenu;
  }
}
