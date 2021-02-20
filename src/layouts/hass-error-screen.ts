import "@material/mwc-button";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { HomeAssistant } from "../types";
import "./hass-subpage";

@customElement("hass-error-screen")
class HassErrorScreen extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public toolbar = true;

  @property() public error?: string;

  protected render(): TemplateResult {
    return html`
      ${this.toolbar
        ? html`<div class="toolbar">
            <ha-icon-button-arrow-prev
              .hass=${this.hass}
              @click=${this._handleBack}
            ></ha-icon-button-arrow-prev>
          </div>`
        : ""}
      <div class="content">
        <h3>${this.error}</h3>
        <slot>
          <mwc-button @click=${this._handleBack}>go back</mwc-button>
        </slot>
      </div>
    `;
  }

  private _handleBack(): void {
    history.back();
  }

  static get styles(): CSSResultArray {
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
          padding: 0 16px;
          pointer-events: none;
          background-color: var(--app-header-background-color);
          font-weight: 400;
          color: var(--app-header-text-color, white);
          border-bottom: var(--app-header-border-bottom, none);
          box-sizing: border-box;
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
        }
        a {
          color: var(--primary-color);
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
