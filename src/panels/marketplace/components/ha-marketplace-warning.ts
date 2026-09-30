import { mdiAlert } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HASSDomTargetEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-checkbox";
import type { HaCheckbox } from "../../../components/ha-checkbox";
import "../../../components/ha-svg-icon";
import "../../../layouts/hass-subpage";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import {
  acceptMarketplaceWarning,
  marketplaceErrorMessage,
} from "../../../data/marketplace/websocket";

const RISKS = [
  "not_supported",
  "own_risk",
  "privacy",
  "security",
  "stability",
] as const;

@customElement("ha-marketplace-warning")
export class HaMarketplaceWarning extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _understood = false;

  @state() private _accepting = false;

  @state() private _error?: string;

  protected render() {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.marketplace.title")}
        back-path="/config"
      >
        <div class="content">
          <ha-card outlined>
            <div class="card-content">
              ${
                this._error
                  ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
                  : nothing
              }
              <div class="heading">
                <ha-svg-icon .path=${mdiAlert}></ha-svg-icon>
                <h1>
                  ${this.hass.localize("ui.panel.marketplace.warning.title")}
                </h1>
              </div>
              <p class="intro">
                ${this.hass.localize("ui.panel.marketplace.warning.intro")}
              </p>
              <ha-alert
                alert-type="warning"
                .title=${this.hass.localize(
                  "ui.panel.marketplace.warning.risks_title"
                )}
              >
                <ul>
                  ${RISKS.map(
                    (risk) =>
                      html`<li>
                        ${this.hass.localize(
                          `ui.panel.marketplace.warning.risks.${risk}`
                        )}
                      </li>`
                  )}
                </ul>
              </ha-alert>
              <ha-checkbox
                .checked=${this._understood}
                .disabled=${this._accepting}
                @change=${this._understoodChanged}
              >
                ${this.hass.localize("ui.panel.marketplace.warning.understand")}
              </ha-checkbox>
            </div>
            <div class="card-actions">
              <ha-button
                variant="warning"
                .disabled=${!this._understood}
                .loading=${this._accepting}
                @click=${this._accept}
              >
                ${this.hass.localize("ui.panel.marketplace.warning.continue")}
              </ha-button>
            </div>
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  private _understoodChanged(ev: HASSDomTargetEvent<HaCheckbox>): void {
    this._understood = ev.target.checked;
  }

  private async _accept(): Promise<void> {
    if (!this._understood || this._accepting) {
      return;
    }

    this._accepting = true;
    this._error = undefined;

    try {
      await acceptMarketplaceWarning(this.hass);
    } catch (err: unknown) {
      this._error = marketplaceErrorMessage(err, this.hass.localize);
      return;
    } finally {
      // The panel swaps this screen once the backend reports the acceptance,
      // until then it stays usable
      this._accepting = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: block;
          height: 100%;
        }

        .content {
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-height: 100%;
          max-width: calc(65ch + 2 * var(--ha-space-6));
          margin-inline: auto;
          padding: var(--ha-space-4);
        }

        ha-card {
          border: var(--ha-border-width-lg) solid var(--warning-color);
        }

        .card-content {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-4);
          padding: var(--ha-space-6);
        }

        .heading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--ha-space-2);
          text-align: center;
        }

        .heading ha-svg-icon {
          --mdc-icon-size: 96px;
          color: var(--warning-color);
        }

        h1 {
          margin: 0;
          font-size: var(--ha-font-size-3xl);
          font-weight: var(--ha-font-weight-bold);
          line-height: var(--ha-line-height-condensed);
          color: var(--warning-color);
        }

        .intro {
          margin: 0;
          font-size: var(--ha-font-size-l);
          line-height: var(--ha-line-height-normal);
          text-align: center;
        }

        ha-alert {
          display: block;
        }

        ul {
          margin: 0;
          padding-inline-start: var(--ha-space-5);
        }

        li {
          margin-block: var(--ha-space-2);
          font-weight: var(--ha-font-weight-medium);
        }

        ha-checkbox {
          font-weight: var(--ha-font-weight-bold);
        }

        .card-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: var(--ha-space-2);
        }

        @media (max-width: 600px) {
          .content {
            padding: var(--ha-space-2);
          }

          .card-content {
            padding: var(--ha-space-4);
          }

          .heading ha-svg-icon {
            --mdc-icon-size: 72px;
          }

          h1 {
            font-size: var(--ha-font-size-2xl);
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-marketplace-warning": HaMarketplaceWarning;
  }
}
