import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../components/ha-top-app-bar-fixed";
import "../components/ha-spinner";
import type { HomeAssistant } from "../types";

@customElement("hass-loading-screen")
class HassLoadingScreen extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean, attribute: "no-toolbar" })
  public noToolbar = false;

  @property({ type: Boolean }) public rootnav = false;

  @property({ type: Boolean }) public narrow = false;

  @property() public message?: string;

  protected render(): TemplateResult {
    if (this.noToolbar) {
      return this._renderContent();
    }

    return html`
      <ha-top-app-bar-fixed
        .narrow=${this.narrow}
        .backButton=${!(this.rootnav || history.state?.root)}
      >
        ${this._renderContent()}
      </ha-top-app-bar-fixed>
    `;
  }

  private _renderContent(): TemplateResult {
    return html`
      <div class="content">
        <ha-spinner></ha-spinner>
        ${
          this.message
            ? html`<div id="loading-text">${this.message}</div>`
            : nothing
        }
      </div>
    `;
  }

  static styles: CSSResultGroup = css`
    :host {
      display: block;
      height: 100%;
      background-color: var(--primary-background-color);
    }
    .content {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    #loading-text {
      max-width: 350px;
      margin-top: var(--ha-space-4);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hass-loading-screen": HassLoadingScreen;
  }
}
