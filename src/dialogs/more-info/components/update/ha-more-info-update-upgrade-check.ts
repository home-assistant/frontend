import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../../../../common/decorators/consume";
import { consumeLocalize } from "../../../../common/decorators/consume-context-entry";
import { fireEvent } from "../../../../common/dom/fire_event";
import { isNavigationClick } from "../../../../common/dom/is-navigation-click";
import { navigate } from "../../../../common/navigate";
import { nextRender } from "../../../../common/util/render-status";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-alert";
import { apiContext } from "../../../../data/context";
import type {
  UpgradeCheckCategoryKey,
  UpgradeCheckDigest,
} from "../../../../data/upgrade_check";
import {
  UPGRADE_CHECK_ANCHOR,
  fetchUpgradeCheckDigest,
} from "../../../../data/upgrade_check";
import type { HomeAssistantApi } from "../../../../types";

// Summary of the upgrade check for a core update, linking to the full list.
@customElement("ha-more-info-update-upgrade-check")
export class HaMoreInfoUpdateUpgradeCheck extends LitElement {
  @property({ attribute: false }) public entityId?: string;

  // Refetches when the update offers a newer version.
  @property({ attribute: false }) public latestVersion?: string | null;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @state() private _digest?: UpgradeCheckDigest;

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);
    if (changedProps.has("entityId") || changedProps.has("latestVersion")) {
      this._fetch();
    }
  }

  // Closing the dialog refocuses the row that opened it, which scrolls the page
  // back up; navigate() waits for a close only briefly, so close it first.
  private async _showAll(ev: MouseEvent): Promise<void> {
    if (isNavigationClick(ev) === undefined) {
      return;
    }
    const stop = new AbortController();
    const closed = new Promise<void>((resolve) => {
      window.addEventListener("dialog-closed", () => resolve(), {
        once: true,
        signal: stop.signal,
      });
      setTimeout(resolve, 1000);
    });
    fireEvent(this, "close-dialog");
    await closed;
    stop.abort();
    // Focus is restored one render after the close.
    await nextRender();
    navigate(`/config/updates#${UPGRADE_CHECK_ANCHOR}`);
  }

  private async _fetch(): Promise<void> {
    this._digest = undefined;
    try {
      this._digest = await fetchUpgradeCheckDigest(this._api);
    } catch (_err) {
      // The dialog still works without the check; it only adds a hint.
    }
  }

  protected render() {
    // Only the core update has release notes to check.
    if (
      !this._digest ||
      !this._localize ||
      this._digest.entity_id !== this.entityId
    ) {
      return nothing;
    }
    const count = (key: UpgradeCheckCategoryKey) =>
      this._digest!.categories.find((c) => c.key === key)?.count ?? 0;
    const total = this._digest.categories.reduce((sum, c) => sum + c.count, 0);
    const breaking = count("breaking");

    if (!total) {
      return html`<ha-alert alert-type="success">
        ${this._localize(
          "ui.dialogs.more_info_control.update.upgrade_check.nothing_applies"
        )}
      </ha-alert>`;
    }
    return html`<ha-alert alert-type=${breaking ? "warning" : "info"}>
      ${this._localize(
        "ui.dialogs.more_info_control.update.upgrade_check.affects",
        { count: total }
      )}
      ${
        breaking
          ? this._localize(
              "ui.dialogs.more_info_control.update.upgrade_check.breaking",
              { count: breaking }
            )
          : nothing
      }
      <a
        href=${`/config/updates#${UPGRADE_CHECK_ANCHOR}`}
        @click=${this._showAll}
        >${this._localize(
          "ui.dialogs.more_info_control.update.upgrade_check.show"
        )}</a
      >
    </ha-alert>`;
  }

  static styles = css`
    ha-alert {
      display: block;
      margin-top: var(--ha-space-4);
    }
    a {
      color: var(--primary-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-update-upgrade-check": HaMoreInfoUpdateUpgradeCheck;
  }
}
