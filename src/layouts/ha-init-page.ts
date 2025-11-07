import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { property, state } from "lit/decorators";
import "../components/ha-spinner";
import "../components/ha-button";

class HaInitPage extends LitElement {
  @property({ type: Boolean }) public error = false;

  @property({ type: Boolean }) public migration = false;

  @state() private _retryInSeconds = 60;

  @state() private _loadingTimeout = false;

  private _showProgressIndicatorTimeout?: number;

  private _retryInterval?: number;

  private _loadingTimeoutHandle?: number;

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
              : this._loadingTimeout
              ? html`
                  <p>Loading is taking longer than expected.</p>
                  <p class="hint">
                    This could be caused by a slow connection or cached data.
                  </p>
                `
              : "Loading data"}
          </div>
          ${this._loadingTimeout && !this.migration
            ? html`
                <div class="button-row">
                  <ha-button
                    size="small"
                    appearance="plain"
                    @click=${this._retry}
                  >
                    Retry now
                  </ha-button>
                  <ha-button
                    size="small"
                    appearance="plain"
                    @click=${this._clearCacheAndRetry}
                  >
                    Clear cache and retry
                  </ha-button>
                </div>
              `
            : ""}
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
    if (this._loadingTimeoutHandle) {
      clearTimeout(this._loadingTimeoutHandle);
    }
  }

  protected willUpdate(changedProperties: PropertyValues<this>) {
    if (
      (changedProperties.has("error") && this.error) ||
      (changedProperties.has("_loadingTimeout") && this._loadingTimeout)
    ) {
      import("../components/ha-button");
    }
  }

  protected firstUpdated() {
    this._showProgressIndicatorTimeout = window.setTimeout(() => {
      import("../components/ha-spinner");
    }, 5000);

    // Only start retry interval for error state
    if (this.error) {
      this._retryInterval = window.setInterval(() => {
        const remainingSeconds = this._retryInSeconds--;
        if (remainingSeconds <= 0) {
          this._retry();
        }
      }, 1000);
    }

    // Start loading timeout for normal loading (not error, not migration)
    if (!this.error && !this.migration) {
      this._loadingTimeoutHandle = window.setTimeout(() => {
        this._loadingTimeout = true;
      }, 30000); // 30 seconds
    }
  }

  private _retry() {
    if (this._retryInterval) {
      clearInterval(this._retryInterval);
    }
    location.reload();
  }

  private async _clearCacheAndRetry() {
    // Deregister service worker and clear caches
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.unregister();
        }
        if ("caches" in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map((name) => caches.delete(name)));
        }
      } catch (err: any) {
        // Ignore errors, we'll reload anyway
      }
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
    .hint {
      margin-top: 8px;
      font-size: 0.9em;
      opacity: 0.7;
    }
    p,
    #loading-text {
      max-width: 350px;
      color: var(--primary-text-color);
      text-align: center;
    }
    .button-row {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 16px;
    }
  `;
}

customElements.define("ha-init-page", HaInitPage);

declare global {
  interface HTMLElementTagNameMap {
    "ha-init-page": HaInitPage;
  }
}
