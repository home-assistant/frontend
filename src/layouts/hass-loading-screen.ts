import "@polymer/app-layout/app-toolbar/app-toolbar";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import "../components/ha-circular-progress";
import "../components/ha-menu-button";
import "../components/ha-icon-button-arrow-prev";
import { haStyle } from "../resources/styles";
import { HomeAssistant } from "../types";

@customElement("hass-loading-screen")
class HassLoadingScreen extends LitElement {
  @property({ type: Boolean }) public rootnav? = false;

  @property() public hass?: HomeAssistant;

  @property() public narrow?: boolean;

  protected render(): TemplateResult {
    return html`
      <app-toolbar>
        ${this.rootnav
          ? html`
              <ha-menu-button
                .hass=${this.hass}
                .narrow=${this.narrow}
              ></ha-menu-button>
            `
          : html`
              <ha-icon-button-arrow-prev
                @click=${this._handleBack}
              ></ha-icon-button-arrow-prev>
            `}
      </app-toolbar>
      <div class="content">
        <ha-circular-progress active></ha-circular-progress>
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
        :host {
          display: block;
          height: 100%;
          background-color: var(--primary-background-color);
        }
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
