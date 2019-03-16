import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-spinner/paper-spinner-lite";
import {
  LitElement,
  TemplateResult,
  html,
  CSSResultArray,
  css,
  customElement,
  property,
} from "lit-element";
import "../components/ha-menu-button";
import "../components/ha-paper-icon-button-arrow-prev";
import { haStyle } from "../resources/styles";

@customElement("hass-loading-screen")
class HassLoadingScreen extends LitElement {
  @property({ type: Boolean }) public rootnav? = false;

  protected render(): TemplateResult | void {
    return html`
      <app-toolbar>
        ${this.rootnav
          ? html`
              <ha-menu-button></ha-menu-button>
            `
          : html`
              <ha-paper-icon-button-arrow-prev
                @click=${this._handleBack}
              ></ha-paper-icon-button-arrow-prev>
            `}
      </app-toolbar>
      <div class="content">
        <paper-spinner-lite active></paper-spinner-lite>
      </div>
    `;
  }

  private _handleBack() {
    history.back();
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
