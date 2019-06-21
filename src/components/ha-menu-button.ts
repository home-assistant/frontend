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
  public hassio = false;

  protected render(): TemplateResult | void {
    return html`
      <paper-icon-button
        aria-label="Sidebar Toggle"
        .icon=${this.hassio ? "hassio:menu" : "hass:menu"}
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
    fireEvent(this, "hass-toggle-menu");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-menu-button": HaMenuButton;
  }
}
