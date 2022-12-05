import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { property, state } from "lit/decorators";

class HaInitPage extends LitElement {
  @property({ type: Boolean }) public error = false;

  @state() private _showProgressIndicator = false;

  @state() private _retryInSeconds = 60;

  private _showProgressIndicatorTimeout?: NodeJS.Timeout;

  private _retryInterval?: NodeJS.Timeout;

  protected render() {
    return this.error
      ? html`
          <p>Unable to connect to Home Assistant.</p>
          <p class="retry-text">
            Retrying in ${this._retryInSeconds} seconds...
          </p>
          <mwc-button @click=${this._retry}>Retry now</mwc-button>
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
            ${this._showProgressIndicator
              ? html`<ha-circular-progress active></ha-circular-progress>`
              : ""}
          </div>
          <div id="loading-text">Loading data</div>
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

  protected firstUpdated() {
    this._showProgressIndicatorTimeout = setTimeout(async () => {
      await import("../components/ha-circular-progress");
      this._showProgressIndicator = true;
    }, 5000);

    this._retryInterval = setInterval(() => {
      const remainingSeconds = this._retryInSeconds--;
      if (remainingSeconds <= 0) {
        this._retry();
      }
    }, 1000);
  }

  private _retry() {
    location.reload();
  }

  static get styles(): CSSResultGroup {
    return css`
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
      }
    `;
  }
}

customElements.define("ha-init-page", HaInitPage);

declare global {
  interface HTMLElementTagNameMap {
    "ha-init-page": HaInitPage;
  }
}
