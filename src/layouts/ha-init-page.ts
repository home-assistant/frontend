import "@polymer/paper-spinner/paper-spinner-lite";
import "@polymer/paper-button/paper-button";

import {
  LitElement,
  PropertyDeclarations,
  html,
  CSSResult,
  css,
} from "lit-element";

class HaInitPage extends LitElement {
  public error?: boolean;

  static get properties(): PropertyDeclarations {
    return {
      error: {
        type: Boolean,
      },
    };
  }

  protected render() {
    return html`
      <div>
        <img src="/static/icons/favicon-192x192.png" height="192" />
        <paper-spinner-lite .active=${!this.error}></paper-spinner-lite>
        ${this.error
          ? html`
              Unable to connect to Home Assistant.
              <paper-button @click=${this._retry}>Retry</paper-button>
            `
          : "Loading data"}
      </div>
    `;
  }

  private _retry() {
    location.reload();
  }

  static get styles(): CSSResult {
    return css`
      div {
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      }
      paper-spinner-lite {
        margin-bottom: 10px;
      }
      paper-button {
        font-weight: 500;
        color: var(--primary-color);
      }
    `;
  }
}

customElements.define("ha-init-page", HaInitPage);
