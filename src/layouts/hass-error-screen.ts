import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../components/ha-icon-button-arrow-prev";
import "../components/ha-menu-button";
import { HomeAssistant } from "../types";
import "../components/ha-alert";

@customElement("hass-error-screen")
class HassErrorScreen extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public toolbar = true;

  @property({ type: Boolean }) public rootnav = false;

  @property({ type: Boolean }) public narrow = false;

  @property() public error?: string;

  protected render(): TemplateResult {
    return html`
      ${this.toolbar
        ? html`<div class="toolbar">
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
          </div>`
        : ""}
      <div class="content">
        <ha-alert alert-type="error">${this.error}</ha-alert>
        <slot>
          <mwc-button @click=${this._handleBack}>
            ${this.hass?.localize("ui.common.back")}
          </mwc-button>
        </slot>
      </div>
    `;
  }

  private _handleBack(): void {
    history.back();
  }

  static get styles(): CSSResultGroup {
    return [
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
          padding: 8px 12px;
          pointer-events: none;
          background-color: var(--app-header-background-color);
          font-weight: 400;
          color: var(--app-header-text-color, white);
          border-bottom: var(--app-header-border-bottom, none);
          box-sizing: border-box;
        }
        @media (max-width: 599px) {
          .toolbar {
            padding: 4px;
          }
        }
        ha-icon-button-arrow-prev {
          pointer-events: auto;
        }
        .content {
          color: var(--primary-text-color);
          height: calc(100% - var(--header-height));
          display: flex;
          padding: 16px;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          box-sizing: border-box;
        }
        a {
          color: var(--primary-color);
        }
        ha-alert {
          margin-bottom: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hass-error-screen": HassErrorScreen;
  }
}
