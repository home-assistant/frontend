import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { property, state } from "lit/decorators";

class HaInitPage extends LitElement {
  @property({ type: Boolean }) public error = false;

  @state() showProgressIndicator = false;

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
                    >Naba Casa account page</a
                  >.
                </p>
              `
            : ""}
        `
      : html`
          ${this.showProgressIndicator
            ? html`<ha-circular-progress active></ha-circular-progress>`
            : ""}
          <p>Loading data</p>
        `;
  }

  protected firstUpdated() {
    setTimeout(async () => {
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
        flex-direction: row;
        margin-top: 25px;
      }
      ha-circular-progress {
        margin-right: 10px;
      }
      a {
        color: var(--primary-color);
      }
      p {
        max-width: 350px;
        color: var(--primary-text-color);
      }
    `;
  }
}

customElements.define("ha-init-page", HaInitPage);
