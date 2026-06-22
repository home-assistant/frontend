import { html, css, LitElement } from "lit";
import { customElement } from "lit/decorators";
import "../../src/components/ha-icon-button";
import "../../src/managers/notification-manager";
import { haStyle } from "../../src/resources/styles";
import "./components/page-description";

@customElement("ha-demo-options")
class HaDemoOptions extends LitElement {
  render() {
    return html`<slot></slot>`;
  }

  static styles = [
    haStyle,
    css`
      :host {
        display: block;
        background-color: var(--primary-background-color);
        position: relative;
        padding: var(--ha-space-2) var(--ha-space-16) var(--ha-space-1);
        font-size: var(--ha-font-size-xl);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-demo-options": HaDemoOptions;
  }
}
