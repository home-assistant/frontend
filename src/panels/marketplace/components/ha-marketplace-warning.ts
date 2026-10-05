import {
  mdiAccountGroupOutline,
  mdiAlertOutline,
  mdiBookOpenPageVariantOutline,
  mdiStorefrontOutline,
  mdiSwapHorizontal,
} from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HASSDomTargetEvent } from "../../../common/dom/fire_event";
import { goBack } from "../../../common/navigate";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-checkbox";
import type { HaCheckbox } from "../../../components/ha-checkbox";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-svg-icon";
import type { HomeAssistant } from "../../../types";
import {
  acceptMarketplaceWarning,
  marketplaceErrorMessage,
} from "../../../data/marketplace/websocket";

type Point = "community" | "behavior" | "read_first" | "data";

const POINTS: { point: Point; icon: string; warning?: boolean }[] = [
  { point: "community", icon: mdiAccountGroupOutline },
  { point: "behavior", icon: mdiSwapHorizontal },
  { point: "read_first", icon: mdiBookOpenPageVariantOutline },
  { point: "data", icon: mdiAlertOutline, warning: true },
];

// Shown over the Marketplace until the user accepts it, the Marketplace stays
// visible behind it but can't be used before then
@customElement("ha-marketplace-warning")
export class HaMarketplaceWarning extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _understood = false;

  @state() private _accepting = false;

  @state() private _error?: string;

  // Set once there is no need to leave the Marketplace anymore when the
  // dialog closes, after going back or accepting
  private _done = false;

  protected render() {
    return html`
      <ha-dialog
        open
        prevent-scrim-close
        without-header
        aria-labelledby="title"
        aria-describedby="subtitle"
        @closed=${this._goBack}
      >
        <div class="heading">
          <span class="badge">
            <ha-svg-icon .path=${mdiStorefrontOutline}></ha-svg-icon>
          </span>
          <h2 id="title">
            ${this.hass.localize("ui.panel.marketplace.warning.title")}
          </h2>
          <p id="subtitle">
            ${this.hass.localize("ui.panel.marketplace.warning.subtitle")}
          </p>
        </div>
        ${
          this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : nothing
        }
        <ul class="points">
          ${POINTS.map(
            ({ point, icon, warning }) => html`
              <li class=${warning ? "warning" : ""}>
                <ha-svg-icon .path=${icon}></ha-svg-icon>
                <div>
                  <span class="point-title">
                    ${this.hass.localize(
                      `ui.panel.marketplace.warning.points.${point}.title`
                    )}
                  </span>
                  <span class="point-description">
                    ${this.hass.localize(
                      `ui.panel.marketplace.warning.points.${point}.description`
                    )}
                  </span>
                </div>
              </li>
            `
          )}
        </ul>
        <div class="agree">
          <ha-checkbox
            .checked=${this._understood}
            .disabled=${this._accepting}
            @change=${this._understoodChanged}
          >
            ${this.hass.localize("ui.panel.marketplace.warning.understand")}
          </ha-checkbox>
        </div>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this._goBack}
          >
            ${this.hass.localize("ui.panel.marketplace.warning.go_back")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            .disabled=${!this._understood}
            .loading=${this._accepting}
            @click=${this._accept}
          >
            ${this.hass.localize("ui.panel.marketplace.warning.continue")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _understoodChanged(ev: HASSDomTargetEvent<HaCheckbox>): void {
    this._understood = ev.target.checked;
  }

  // Escape closes the dialog too, without accepting there is nothing to use
  // in the Marketplace, so that leaves it the same way
  private _goBack(): void {
    if (this._done) {
      return;
    }
    this._done = true;
    goBack("/config");
  }

  private async _accept(): Promise<void> {
    if (!this._understood || this._accepting) {
      return;
    }

    this._accepting = true;
    this._error = undefined;

    try {
      await acceptMarketplaceWarning(this.hass);
      // The panel removes this notice once the backend reports the
      // acceptance, until then it stays usable
      this._done = true;
    } catch (err: unknown) {
      this._error = marketplaceErrorMessage(err, this.hass.localize);
    } finally {
      this._accepting = false;
    }
  }

  static styles = css`
    ha-dialog {
      --ha-dialog-width-md: 520px;
      --ha-dialog-border-radius: var(--ha-border-radius-3xl);
    }

    .heading {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-2);
      padding-bottom: var(--ha-space-2);
    }

    .badge {
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      margin-bottom: var(--ha-space-2);
      border-radius: var(--ha-border-radius-circle);
      background-color: rgba(var(--rgb-primary-color), 0.12);
      color: var(--primary-color);
    }

    h2 {
      margin: 0;
      font-size: var(--ha-font-size-2xl);
      font-weight: var(--ha-font-weight-normal);
      line-height: 1.3;
    }

    #subtitle {
      margin: 0;
      font-size: var(--ha-font-size-l);
      line-height: var(--ha-line-height-normal);
      color: var(--secondary-text-color);
    }

    ha-alert {
      display: block;
      margin-block: var(--ha-space-2);
    }

    .points {
      display: flex;
      flex-direction: column;
      margin: 0;
      padding: var(--ha-space-2) 0;
      list-style: none;
    }

    li {
      display: flex;
      gap: var(--ha-space-4);
      padding-block: var(--ha-space-3);
    }

    li ha-svg-icon {
      flex: none;
      margin-top: 2px;
      color: var(--secondary-text-color);
    }

    li div {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .point-title {
      font-size: var(--ha-font-size-l);
      font-weight: var(--ha-font-weight-medium);
    }

    .point-description {
      font-size: var(--ha-font-size-m);
      line-height: 1.45;
      color: var(--secondary-text-color);
      white-space: pre-line;
    }

    /* Stands out from the other points, without alarming */
    li.warning {
      margin: var(--ha-space-1) calc(-1 * var(--ha-space-3)) 0;
      padding: var(--ha-space-3);
      border-radius: var(--ha-border-radius-lg);
      background-color: rgba(var(--rgb-warning-color), 0.12);
    }

    li.warning ha-svg-icon {
      color: var(--warning-color);
    }

    li.warning .point-description {
      color: var(--primary-text-color);
    }

    .agree {
      margin: var(--ha-space-2) calc(-1 * var(--ha-space-2)) 0;
      padding: var(--ha-space-1) var(--ha-space-2);
      border-radius: var(--ha-border-radius-lg);
      background-color: rgba(var(--rgb-primary-color), 0.06);
      transition: background-color 150ms ease-in-out;
    }

    .agree:hover {
      background-color: rgba(var(--rgb-primary-color), 0.1);
    }

    ha-checkbox {
      display: flex;
      align-items: center;
      min-height: 40px;
      font-size: var(--ha-font-size-l);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-marketplace-warning": HaMarketplaceWarning;
  }
}
