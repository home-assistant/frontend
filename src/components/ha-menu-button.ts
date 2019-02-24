import "@polymer/paper-icon-button/paper-icon-button";
import {
  property,
  TemplateResult,
  LitElement,
  html,
  customElement,
} from "lit-element";

import { fireEvent } from "../common/dom/fire_event";

@customElement("ha-menu-button")
class HaMenuButton extends LitElement {
  @property({ type: Boolean })
  public showMenu = false;

  @property({ type: Boolean })
  public hassio = false;

  protected render(): TemplateResult | void {
    return html`
      <paper-icon-button
        .icon=${`${this.hassio ? "hassio" : "hass"}:menu`}
        @click=${this._toggleMenu}
      ></paper-icon-button>
    `;
  }

  // We are not going to use ShadowDOM as we're rendering a single element
  // without any CSS used.
  protected createRenderRoot(): Element | ShadowRoot {
    return this;
  }

  private _toggleMenu(): void {
    fireEvent(this, this.showMenu ? "hass-close-menu" : "hass-open-menu");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-menu-button": HaMenuButton;
  }
}
