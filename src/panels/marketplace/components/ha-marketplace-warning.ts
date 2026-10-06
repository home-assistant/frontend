import type { ContextType } from "@lit/context";
import { mdiAlert } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../../../common/decorators/consume";
import type { HASSDomTargetEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-checkbox";
import type { HaCheckbox } from "../../../components/ha-checkbox";
import "../../../components/ha-svg-icon";
import { apiContext, internationalizationContext } from "../../../data/context";
import "../../../layouts/hass-subpage";
import { haStyle } from "../../../resources/styles";
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

// Long enough to read the risks before they can be accepted, shorter in
// development so it doesn't slow down testing
const READ_SECONDS = __DEV__ ? 5 : 30;

@customElement("ha-marketplace-warning")
export class HaMarketplaceWarning extends LitElement {
  @property({ type: Boolean }) public narrow = false;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @state() private _understood = false;

  @state() private _accepting = false;

  @state() private _error?: string;

  @state() private _secondsLeft = READ_SECONDS;

  private _countdown?: number;

  public connectedCallback(): void {
    super.connectedCallback();

    const shownAt = Date.now();
    this._secondsLeft = READ_SECONDS;
    this._countdown = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - shownAt) / 1000);
      this._secondsLeft = Math.max(READ_SECONDS - elapsed, 0);
      if (this._secondsLeft === 0) {
        this._stopCountdown();
      }
    }, 1000);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stopCountdown();
  }

  private _stopCountdown(): void {
    window.clearInterval(this._countdown);
    this._countdown = undefined;
  }

  protected render() {
    return html`
      <hass-subpage
        .narrow=${this.narrow}
        .header=${this._i18n.localize("ui.panel.marketplace.title")}
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
                  ${this._i18n.localize("ui.panel.marketplace.warning.title")}
                </h1>
              </div>
              <p class="intro">
                ${this._i18n.localize("ui.panel.marketplace.warning.intro")}
              </p>
              <ha-alert
                class="risks"
                alert-type="warning"
                .title=${this._i18n.localize(
                  "ui.panel.marketplace.warning.risks_title"
                )}
              >
                <span slot="icon"></span>
                <ul>
                  ${RISKS.map(
                    (risk) =>
                      html`<li>
                        ${this._i18n.localize(
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
                ${this._i18n.localize("ui.panel.marketplace.warning.understand")}
              </ha-checkbox>
            </div>
            <div class="card-actions">
              ${
                this._secondsLeft > 0
                  ? html`<span class="countdown">
                      ${this._i18n.localize(
                        "ui.panel.marketplace.warning.continue_in",
                        { seconds: this._secondsLeft }
                      )}
                    </span>`
                  : nothing
              }
              <ha-button
                variant="warning"
                .disabled=${!this._understood || this._secondsLeft > 0}
                .loading=${this._accepting}
                @click=${this._accept}
              >
                ${this._i18n.localize("ui.panel.marketplace.warning.continue")}
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
    if (!this._understood || this._secondsLeft > 0 || this._accepting) {
      return;
    }

    this._accepting = true;
    this._error = undefined;

    try {
      await acceptMarketplaceWarning(this._api);
    } catch (err: unknown) {
      this._error = marketplaceErrorMessage(err, this._i18n.localize);
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
          --card-padding: var(--ha-space-6);
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-4);
          padding: var(--card-padding);
        }

        .heading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--ha-space-2);
        }

        .heading ha-svg-icon {
          --mdc-icon-size: 96px;
          color: var(--warning-color);
        }

        h1 {
          align-self: stretch;
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
        }

        ha-alert {
          display: block;
        }

        /* Span the full card width, aligning the text with the card content */
        ha-alert.risks {
          margin-inline: calc(-1 * var(--card-padding));
          --ha-alert-icon-size: 0;
          --ha-alert-padding: var(--ha-space-4)
            calc(var(--card-padding) - var(--ha-space-2));
          --ha-border-radius-sm: 0;
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
          align-items: center;
          justify-content: flex-end;
          gap: var(--ha-space-2);
        }

        .countdown {
          color: var(--secondary-text-color);
          font-variant-numeric: tabular-nums;
        }

        @media (max-width: 600px) {
          .content {
            padding: var(--ha-space-2);
          }

          .card-content {
            --card-padding: var(--ha-space-4);
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
