import "@polymer/paper-spinner/paper-spinner-lite";

import {
  LitElement,
  PropertyDeclarations,
  html,
  CSSResult,
  css,
} from "lit-element";

/*
 * @appliesMixin LocalizeMixin
 */
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

  static get styles(): CSSResult {
    return css`
      div {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;

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

  protected updated(changedProps) {
    super.updated(changedProps);
    if (changedProps.has("error") && this.error) {
      import(/* webpackChunkName: "paper-button" */ "@polymer/paper-button/paper-button");
    }
  }

  private _retry() {
    location.reload();
  }
}

customElements.define("ha-init-page", HaInitPage);
