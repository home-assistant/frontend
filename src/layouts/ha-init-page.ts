import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { property, state } from "lit/decorators";

class HaInitPage extends LitElement {
  @property({ type: Boolean }) public error = false;

  @state() showProgressIndicator = false;

  private _showProgressIndicatorTimeout;

  protected render() {
    return this.error
      ? html`
          <p>Unable to connect to Home Assistant.</p>
          <mwc-button @click=${this._retry}>Retry</mwc-button>
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
            ${this.showProgressIndicator
              ? html`<ha-circular-progress active></ha-circular-progress>`
              : ""}
          </div>
          <div id="loading-text">Loading data</div>
        `;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this._showProgressIndicatorTimeout);
  }

  protected firstUpdated() {
    this._showProgressIndicatorTimeout = setTimeout(async () => {
      await import("../components/ha-circular-progress");
      this.showProgressIndicator = true;
    }, 5000);
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
