import "@polymer/app-layout/app-toolbar/app-toolbar";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../components/ha-circular-progress";
import "../components/ha-icon-button-arrow-prev";
import "../components/ha-menu-button";
import { haStyle } from "../resources/styles";
import { HomeAssistant } from "../types";

@customElement("hass-loading-screen")
class HassLoadingScreen extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean, attribute: "no-toolbar" })
  public noToolbar = false;

  @property({ type: Boolean }) public rootnav = false;

  @property({ type: Boolean }) public narrow = false;

  protected render(): TemplateResult {
    return html`
      ${this.noToolbar
        ? ""
        : html`<div class="toolbar">
            ${this.rootnav || history.state?.root
              ? html`
                  <ha-menu-button
                    .hass=${this.hass}
                    .narrow=${this.narrow}
                  ></ha-menu-button>
                `
              : html`
                  <ha-icon-button-arrow-prev
                    .hass=${this.hass}
                    @click=${this._handleBack}
                  ></ha-icon-button-arrow-prev>
                `}
          </div>`}
      <div class="content">
        <ha-circular-progress active></ha-circular-progress>
      </div>
    `;
  }

  private _handleBack() {
    history.back();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: block;
          height: 100%;
          background-color: var(--primary-background-color);
        }
        .toolbar {
          display: flex;
          align-items: center;
          font-size: 20px;
          height: var(--header-height);
          padding: 0 16px;
          pointer-events: none;
          background-color: var(--app-header-background-color);
          font-weight: 400;
          color: var(--app-header-text-color, white);
          border-bottom: var(--app-header-border-bottom, none);
          box-sizing: border-box;
        }
        ha-menu-button,
        ha-icon-button-arrow-prev {
          pointer-events: auto;
        }
        .content {
          height: calc(100% - var(--header-height));
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
