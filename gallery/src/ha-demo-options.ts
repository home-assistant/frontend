import "@material/mwc-drawer";
import "@material/mwc-top-app-bar-fixed";
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
        background-color: var(--light-primary-color);
        margin-left: 60px
        margin-right: 60px;
        display: var(--layout-horizontal_-_display);
        -ms-flex-direction: var(--layout-horizontal_-_-ms-flex-direction);
        -webkit-flex-direction: var(
          --layout-horizontal_-_-webkit-flex-direction
        );
        flex-direction: var(--layout-horizontal_-_flex-direction);
        -ms-flex-align: var(--layout-center_-_-ms-flex-align);
        -webkit-align-items: var(--layout-center_-_-webkit-align-items);
        align-items: var(--layout-center_-_align-items);
        position: relative;
        height: 64px;
        padding: 0 16px;
        pointer-events: none;
        font-size: 20px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-demo-options": HaDemoOptions;
  }
}
