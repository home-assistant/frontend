import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-spinner/paper-spinner-lite";
import {
  LitElement,
  TemplateResult,
  html,
  property,
  CSSResultArray,
  css,
  customElement,
} from "lit-element";
import "../components/ha-menu-button";
import { haStyle } from "../resources/styles";

@customElement("hass-loading-screen")
class HassLoadingScreen extends LitElement {
  @property({ type: Boolean })
  public narrow?: boolean;

  @property({ type: Boolean })
  public showMenu?: boolean;

  protected render(): TemplateResult | void {
    return html`
      <app-toolbar>
        <ha-menu-button
          .narrow=${this.narrow}
          .showMenu=${this.showMenu}
        ></ha-menu-button>
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
