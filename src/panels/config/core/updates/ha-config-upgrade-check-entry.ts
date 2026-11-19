import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../components/ha-card";
import "../../../../components/ha-icon-next";
import type { UpgradeCheckDigest } from "../../../../data/upgrade_check";
import {
  UPGRADE_CHECK_PATH,
  fetchUpgradeCheckDigest,
} from "../../../../data/upgrade_check";
import type { HomeAssistant } from "../../../../types";
import "./ha-upgrade-check-icon";

// Row on the updates page that sums up the upgrade check and opens its page.
@customElement("ha-config-upgrade-check-entry")
class HaConfigUpgradeCheckEntry extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _digest?: UpgradeCheckDigest;

  protected firstUpdated(): void {
    this._fetch();
  }

  private async _fetch(): Promise<void> {
    try {
      this._digest = await fetchUpgradeCheckDigest(this.hass);
    } catch (_err) {
      // The page itself shows why the check failed.
    }
  }

  protected render() {
    if (!this._digest?.target) {
      return nothing;
    }
    const prefix = "ui.panel.config.updates.upgrade_check";
    const total = this._digest.categories.reduce((sum, c) => sum + c.count, 0);
    const breaking =
      this._digest.categories.find((c) => c.key === "breaking")?.count ?? 0;
    return html`<ha-card outlined>
      <a href=${UPGRADE_CHECK_PATH}>
        <ha-upgrade-check-icon
          .category=${breaking ? "breaking" : "noteworthy"}
        ></ha-upgrade-check-icon>
        <div class="text">
          <div>${this.hass.localize(`${prefix}.title`)}</div>
          <div class="secondary">
            ${
              breaking
                ? this.hass.localize(`${prefix}.entry_breaking`, {
                    count: total,
                    breaking,
                  })
                : this.hass.localize(`${prefix}.entry`, { count: total })
            }
          </div>
        </div>
        <ha-icon-next></ha-icon-next>
      </a>
    </ha-card>`;
  }

  static styles = css`
    ha-card {
      margin-bottom: max(24px, var(--safe-area-inset-bottom));
    }
    a {
      display: flex;
      align-items: center;
      gap: var(--ha-space-4);
      padding: var(--ha-space-4);
      color: var(--primary-text-color);
      text-decoration: none;
    }
    .text {
      flex: 1;
      min-width: 0;
    }
    .secondary {
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
    }
    ha-icon-next {
      color: var(--secondary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-upgrade-check-entry": HaConfigUpgradeCheckEntry;
  }
}
