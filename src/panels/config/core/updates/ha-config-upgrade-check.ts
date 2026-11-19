import { mdiHomeAssistant } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { replaceCurrentUrl } from "../../../../common/navigate";
import { nextRender } from "../../../../common/util/render-status";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
import "../../../../components/ha-spinner";
import "../../../../components/ha-svg-icon";
import type { UpgradeCheckDigest } from "../../../../data/upgrade_check";
import {
  UPGRADE_CHECK_UNAVAILABLE,
  fetchUpgradeCheckDigest,
  upgradeCheckBreakingRows,
  upgradeCheckImprovementRows,
  upgradeCheckQualityScaleRows,
  upgradeCheckRemovedRows,
} from "../../../../data/upgrade_check";
import type { HomeAssistant } from "../../../../types";
import "./ha-upgrade-check-whats-new";

const PREFIX = "ui.panel.config.updates.upgrade_check";

// Status card of the Home Assistant Core item page: what the pending update
// changes for your setup, over every release you would skip.
@customElement("ha-config-upgrade-check")
class HaConfigUpgradeCheck extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _digest?: UpgradeCheckDigest;

  @state() private _unavailable = false;

  @state() private _error?: string;

  // Row the update dialog linked to; it opens and stays open.
  @state() private _focus?: string;

  public connectedCallback(): void {
    super.connectedCallback();
    // The update dialog can link here while this page is already open.
    window.addEventListener("location-changed", this._scrollIfRequested);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("location-changed", this._scrollIfRequested);
  }

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);
    if (!this.hasUpdated) {
      this._fetch();
    }
  }

  // Wait for the digest: it sets the card's height and so where a row ends up.
  private _scrollIfRequested = async (): Promise<void> => {
    const hash = window.location.hash.slice(1);
    // Any hash on this page names a row of the card.
    if (!hash || !this._digest) {
      return;
    }
    this._focus = hash;
    await this.updateComplete;
    await nextRender();
    const card = this.shadowRoot!.querySelector("ha-upgrade-check-whats-new");
    // A row no longer in the digest falls back to the card.
    const target = card?.shadowRoot?.getElementById(hash) ?? card ?? this;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    replaceCurrentUrl(window.location.pathname);
  };

  private async _fetch(): Promise<void> {
    this._digest = undefined;
    this._unavailable = false;
    this._error = undefined;
    try {
      const digest = await fetchUpgradeCheckDigest(this.hass);
      // Row names come from backend title translations.
      await this.hass.loadBackendTranslation("title", [
        ...upgradeCheckBreakingRows(digest).flatMap((row) => row.domains),
        ...upgradeCheckRemovedRows(digest).flatMap((row) => row.domains),
        ...upgradeCheckImprovementRows(digest).flatMap((row) => row.domains),
        ...upgradeCheckQualityScaleRows(digest).flatMap((row) => row.domains),
      ]);
      this._digest = digest;
      this._scrollIfRequested();
    } catch (err: any) {
      if (err.code === UPGRADE_CHECK_UNAVAILABLE) {
        this._unavailable = true;
      } else {
        this._error = err.message || String(err);
      }
    }
  }

  protected render() {
    const localize = this.hass.localize;
    if (this._error) {
      return html`<ha-alert alert-type="error">${this._error}</ha-alert>`;
    }
    const digest = this._digest;
    if (!digest && !this._unavailable) {
      return html`<div class="center">
        <ha-spinner size="small"></ha-spinner>
      </div>`;
    }
    const entityId = digest?.entity_id;
    const stateObj = entityId ? this.hass.states[entityId] : undefined;
    return html`
      <ha-card outlined>
        <div class="card-content">
          <div class="status">
            <ha-svg-icon class="logo" .path=${mdiHomeAssistant}></ha-svg-icon>
            <div>
              <div class="name">${localize(`${PREFIX}.core`)}</div>
              <div class="secondary">
                ${
                  digest?.target
                    ? localize(`${PREFIX}.status_available`, {
                        installed: digest.running,
                        latest: digest.target,
                      })
                    : localize(`${PREFIX}.status_up_to_date`, {
                        installed: digest?.running ?? "",
                      })
                }
              </div>
            </div>
          </div>
          ${
            this._unavailable || digest?.target
              ? html`<ha-upgrade-check-whats-new
                  full
                  .digest=${digest}
                  .unavailable=${this._unavailable}
                  .focusAnchor=${this._focus}
                ></ha-upgrade-check-whats-new>`
              : nothing
          }
        </div>
        ${
          stateObj?.state === "on"
            ? html`<div class="card-actions">
                <ha-button @click=${this._openUpdate}>
                  ${localize(`${PREFIX}.update`)}
                </ha-button>
              </div>`
            : nothing
        }
      </ha-card>
    `;
  }

  // The update dialog is for acting: backup, skip and install.
  private _openUpdate(): void {
    fireEvent(this, "hass-more-info", { entityId: this._digest!.entity_id! });
  }

  static styles = css`
    ha-card {
      margin-bottom: max(24px, var(--safe-area-inset-bottom));
    }
    .card-content {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-4);
    }
    .status {
      display: flex;
      align-items: center;
      gap: var(--ha-space-3);
    }
    .logo {
      --mdc-icon-size: 40px;
      color: var(--primary-color);
    }
    .name {
      font-size: var(--ha-font-size-l);
    }
    .secondary {
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
    }
    .card-actions {
      display: flex;
      justify-content: flex-end;
    }
    .center {
      display: flex;
      justify-content: center;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-upgrade-check": HaConfigUpgradeCheck;
  }
}
