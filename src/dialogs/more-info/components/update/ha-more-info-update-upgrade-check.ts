import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../../../../common/decorators/consume";
import {
  apiContext,
  internationalizationContext,
} from "../../../../data/context";
import type { UpgradeCheckDigest } from "../../../../data/upgrade_check";
import {
  UPGRADE_CHECK_UNAVAILABLE,
  fetchUpgradeCheckDigest,
  upgradeCheckBreakingRows,
} from "../../../../data/upgrade_check";
import "../../../../panels/config/core/updates/ha-upgrade-check-whats-new";
import type {
  HomeAssistantApi,
  HomeAssistantInternationalization,
} from "../../../../types";

// What's new card of a core update, with the breaking changes for your setup.
@customElement("ha-more-info-update-upgrade-check")
export class HaMoreInfoUpdateUpgradeCheck extends LitElement {
  @property({ attribute: false }) public entityId?: string;

  // Refetches when the update offers a newer version.
  @property({ attribute: false }) public latestVersion?: string | null;

  @property({ attribute: false }) public releaseUrl?: string;

  // The update is Core's, so a failed check is worth a warning.
  @property({ type: Boolean }) public core = false;

  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: HomeAssistantInternationalization;

  @state() private _digest?: UpgradeCheckDigest;

  @state() private _unavailable = false;

  // Only the latest request may set the result.
  private _request = 0;

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);
    if (changedProps.has("entityId") || changedProps.has("latestVersion")) {
      this._fetch();
    }
  }

  private async _fetch(): Promise<void> {
    const request = ++this._request;
    this._digest = undefined;
    this._unavailable = false;
    try {
      const digest = await fetchUpgradeCheckDigest(this._api);
      // The rows name the integrations, so load their titles first.
      await this._i18n.loadBackendTranslation(
        "title",
        upgradeCheckBreakingRows(digest).flatMap((row) => row.domains)
      );
      if (request === this._request) {
        this._digest = digest;
      }
    } catch (err: any) {
      // Other errors leave the dialog as it was without the check.
      if (request === this._request) {
        this._unavailable = err?.code === UPGRADE_CHECK_UNAVAILABLE;
      }
    }
  }

  protected render() {
    if (this._unavailable && this.core) {
      return html`<ha-upgrade-check-whats-new
        unavailable
        .version=${this.latestVersion}
        .releaseUrl=${this.releaseUrl}
      ></ha-upgrade-check-whats-new>`;
    }
    // Only the core update has release notes to check, for the version it offers.
    if (
      !this._digest ||
      this._digest.entity_id !== this.entityId ||
      this._digest.target !== this.latestVersion
    ) {
      return nothing;
    }
    return html`<ha-upgrade-check-whats-new
      .digest=${this._digest}
      .releaseUrl=${this.releaseUrl}
    ></ha-upgrade-check-whats-new>`;
  }

  static styles = css`
    :host {
      display: block;
      margin-top: var(--ha-space-4);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-update-upgrade-check": HaMoreInfoUpdateUpgradeCheck;
  }
}
