import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { property } from "lit/decorators";
import "../components/ha-circular-progress";
import { removeInitSkeleton } from "../util/init-skeleton";

class HaInitPage extends LitElement {
  @property({ type: Boolean }) public error = false;

  protected render() {
    return html`
      <div>
        <img src="/static/icons/favicon-192x192.png" height="192" />
        ${this.error
          ? html`
              <p>Unable to connect to Home Assistant.</p>
              <mwc-button @click=${this._retry}>Retry</mwc-button>
              ${location.host.includes("ui.nabu.casa")
                ? html`
                    <p>
                      It is possible that you are seeing this screen because
                      your Home Assistant is not currently connected. You can
                      ask it to come online from your
                      <a href="https://account.nabucasa.com/"
                        >Naba Casa account page</a
                      >.
                    </p>
                  `
                : ""}
            `
          : html`
              <ha-circular-progress active></ha-circular-progress>
              <p>Loading data</p>
            `}
      </div>
    `;
  }

  protected firstUpdated() {
    removeInitSkeleton();
  }

  private _retry() {
    location.reload();
  }

  static get styles(): CSSResultGroup {
    return css`
      div {
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      }
      ha-circular-progress {
        margin-top: 9px;
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
