import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../common/translations/localize";
import "../components/ha-button";

@customElement("ha-init-page")
export class HaInitPage extends LitElement {
  @property({ type: Boolean }) public error = false;

  @property({ type: Boolean }) public migration = false;

  @state() private _retryInSeconds = 60;

  @state() @consumeLocalize() private _localize?: LocalizeFunc;

  private _retryInterval?: number;

  protected render() {
    return this.error
      ? html`
          <p>
            ${
              this._localize?.("ui.init.error.title") ||
              "Unable to connect to Home Assistant."
            }
          </p>
          <p class="retry-text">
            ${
              this._localize?.("ui.init.error.retrying", {
                seconds: this._retryInSeconds,
              }) || `Retrying in ${this._retryInSeconds} seconds...`
            }
          </p>
          <ha-button size="s" appearance="plain" @click=${this._retry}
            >${
              this._localize?.("ui.init.error.retry_now") || "Retry now"
            }</ha-button
          >
          ${
            location.host.includes("ui.nabu.casa")
              ? html`<p>
                  ${
                    this._localize?.("ui.init.error.nabu_casa", {
                      account_link: html`<a href="https://account.nabucasa.com/"
                        >${
                          this._localize?.("ui.init.error.nabu_casa_account") ||
                          "Nabu Casa account page"
                        }</a
                      >`,
                    }) ||
                    html`It is possible that you are seeing this screen because
                      your Home Assistant is not currently connected. You can
                      ask it to come online from your
                      <a href="https://account.nabucasa.com/"
                        >Nabu Casa account page</a
                      >.`
                  }
                </p>`
              : nothing
          }
        `
      : html`<p>
          ${
            this.migration
              ? this._localize?.("ui.init.migration") ||
                "Database upgrade is in progress, Home Assistant will not start until the upgrade is completed. The upgrade may need a long time to complete, please be patient."
              : this._localize?.("ui.init.loading") || "Loading data"
          }
        </p>`;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._retryInterval) {
      clearInterval(this._retryInterval);
    }
  }

  protected firstUpdated() {
    this._retryInterval = window.setInterval(() => {
      if (this._retryInSeconds <= 1) {
        this._retry();
      } else {
        this._retryInSeconds -= 1;
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
    a {
      color: var(--primary-color);
    }
    .retry-text {
      margin-top: 0;
    }
    p {
      max-width: 350px;
      margin: var(--ha-space-3, 12px) var(--ha-space-4, 16px);
      color: var(--primary-text-color);
      font-size: var(--ha-font-size-m, 14px);
      text-align: center;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-init-page": HaInitPage;
  }
}
