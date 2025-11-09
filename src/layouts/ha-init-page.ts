import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { property, state } from "lit/decorators";
import "../components/ha-spinner";
import "../components/ha-button";

class HaInitPage extends LitElement {
  @property({ type: Boolean }) public error = false;

  @property({ type: Boolean }) public migration = false;

  @state() private _retryInSeconds = 60;

  private _showProgressIndicatorTimeout?: number;

  private _retryInterval?: number;

  protected render() {
    return this.error
      ? html`
          <p>Unable to connect to Home Assistant.</p>
          <p class="retry-text">
            Retrying in ${this._retryInSeconds} seconds...
          </p>
          <ha-button size="small" appearance="plain" @click=${this._retry}
            >Retry now</ha-button
          >
          ${location.host.includes("ui.nabu.casa")
            ? html`
                <p>
                  It is possible that you are seeing this screen because your
                  Home Assistant is not currently connected. You can ask it to
                  come online from your
                  <a href="https://account.nabucasa.com/"
                    >Nabu Casa account page</a
                  >.
                </p>
              `
            : ""}
        `
      : html`
          <div id="progress-indicator-wrapper">
            <ha-spinner></ha-spinner>
          </div>
          <div id="loading-text">
            ${this.migration
              ? html`
                  Database upgrade is in progress, Home Assistant will not start
                  until the upgrade is completed.
                  <br /><br />
                  The upgrade may need a long time to complete, please be
                  patient.
                `
              : "Loading data"}
          </div>
        `;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._showProgressIndicatorTimeout) {
      clearTimeout(this._showProgressIndicatorTimeout);
    }
    if (this._retryInterval) {
      clearInterval(this._retryInterval);
    }
  }

  protected willUpdate(changedProperties: PropertyValues<this>) {
    if (changedProperties.has("error") && this.error) {
      import("../components/ha-button");
    }
  }

  protected firstUpdated() {
    this._showProgressIndicatorTimeout = window.setTimeout(() => {
      import("../components/ha-spinner");
    }, 5000);

    this._retryInterval = window.setInterval(() => {
      const remainingSeconds = this._retryInSeconds--;
      if (remainingSeconds <= 0) {
        this._retry();
      }
    }, 1000);
  }

  private _retry() {
    if (this._retryInterval) {
      clearInterval(this._retryInterval);
    }
    location.reload();
  }

  static styles = css`
    :host {
      flex: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    #progress-indicator-wrapper {
      display: flex;
      align-items: center;
      margin: 25px 0;
      height: 50px;
    }
    a {
      color: var(--primary-color);
    }
    .retry-text {
      margin-top: 0;
    }
    p,
    #loading-text {
      max-width: 350px;
      color: var(--primary-text-color);
      text-align: center;
    }
  `;
}

customElements.define("ha-init-page", HaInitPage);

declare global {
  interface HTMLElementTagNameMap {
    "ha-init-page": HaInitPage;
  }
}
