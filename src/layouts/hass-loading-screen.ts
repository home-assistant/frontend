import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-spinner/paper-spinner-lite";
import {
  LitElement,
  TemplateResult,
  html,
  CSSResultArray,
  css,
  customElement,
} from "lit-element";
import "../components/ha-menu-button";
import { haStyle } from "../resources/styles";

@customElement("hass-loading-screen")
class HassLoadingScreen extends LitElement {
  protected render(): TemplateResult | void {
    return html`
      <app-toolbar>
        <ha-menu-button></ha-menu-button>
      </app-toolbar>
      <div class="content">
        <paper-spinner-lite active></paper-spinner-lite>
      </div>
    `;
  }

  static get styles(): CSSResultArray {
    return [
      haStyle,
      css`
        .content {
          height: calc(100% - 64px);
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hass-loading-screen": HassLoadingScreen;
  }
}
