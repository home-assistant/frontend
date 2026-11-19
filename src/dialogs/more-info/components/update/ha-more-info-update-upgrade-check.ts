import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../../../../common/decorators/consume";
import { consumeLocalize } from "../../../../common/decorators/consume-context-entry";
import { fireEvent } from "../../../../common/dom/fire_event";
import { isNavigationClick } from "../../../../common/dom/is-navigation-click";
import { navigate } from "../../../../common/navigate";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import { nextRender } from "../../../../common/util/render-status";
import {
  apiContext,
  internationalizationContext,
} from "../../../../data/context";
import { domainToName } from "../../../../data/integration";
import type {
  UpgradeCheckCategory,
  UpgradeCheckCategoryKey,
  UpgradeCheckDigest,
  UpgradeCheckItem,
} from "../../../../data/upgrade_check";
import {
  UPGRADE_CHECK_PATH,
  fetchUpgradeCheckDigest,
  upgradeCheckCategoryAnchor,
  upgradeCheckGroupAnchor,
} from "../../../../data/upgrade_check";
import "../../../../panels/config/core/updates/ha-upgrade-check-icon";
import type {
  HomeAssistantApi,
  HomeAssistantInternationalization,
} from "../../../../types";

const PREFIX = "ui.dialogs.more_info_control.update.upgrade_check";

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

  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: HomeAssistantInternationalization;

  @state() private _digest?: UpgradeCheckDigest;

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);
    if (changedProps.has("entityId") || changedProps.has("latestVersion")) {
      this._fetch();
    }
  }

  // Closing the dialog refocuses the row that opened it, which scrolls the page
  // back up; navigate() waits for a close only briefly, so close it first.
  private async _openUpdates(ev: MouseEvent): Promise<void> {
    const path = isNavigationClick(ev);
    if (path === undefined) {
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
    navigate(path);
  }

  private async _fetch(): Promise<void> {
    this._digest = undefined;
    try {
      const digest = await fetchUpgradeCheckDigest(this._api);
      // The band names the integrations, so load their titles first.
      await this._i18n.loadBackendTranslation(
        "title",
        this._breaking(digest).flatMap((item) => item.domains)
      );
      this._digest = digest;
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
    const breaking = this._breaking(this._digest);
    const others = this._digest.categories.filter(
      (
        category
      ): category is UpgradeCheckCategory & {
        key: Exclude<UpgradeCheckCategoryKey, "breaking">;
      } => category.key !== "breaking" && category.count > 0
    );
    if (!breaking.length && !others.length) {
      return html`<div class="box">
        <p>${this._localize(`${PREFIX}.nothing_applies`)}</p>
      </div>`;
    }
    // Same outlined box as the release notes, so it reads as part of them.
    return html`<div class="box">
      <div class="title">
        ${this._localize(
          `${PREFIX}.${breaking.length ? "breaking_title" : "summary_title"}`
        )}
      </div>
      ${breaking.length ? this._renderBreaking(breaking) : nothing}
      ${
        others.length
          ? html`${
                breaking.length
                  ? html`<p class="secondary">
                      ${this._localize(`${PREFIX}.also`)}
                    </p>`
                  : nothing
              }
              <div class="categories">
                ${others.map((category) =>
                  this._renderCategory(category.key, category.count)
                )}
              </div>`
          : nothing
      }
      ${this._renderLink(UPGRADE_CHECK_PATH, this._localize(`${PREFIX}.show`))}
    </div>`;
  }

  private _breaking(digest: UpgradeCheckDigest): UpgradeCheckItem[] {
    return (
      digest.categories.find((category) => category.key === "breaking")
        ?.items ?? []
    );
  }

  // Name what breaks, so the band says enough without opening the full list.
  // One line per integration, or per set a change covers together, in release
  // notes order, which puts the most used integrations first; general changes
  // close the list. Each line opens its group on the updates page.
  private _renderBreaking(breaking: UpgradeCheckItem[]) {
    const groups = new Map<string, string[]>();
    for (const item of breaking) {
      if (item.scope === "domains") {
        groups.set(item.domains.join(","), item.domains);
      }
    }
    const general = breaking.filter((item) => item.scope === "global").length;
    return html`<p>${this._localize(`${PREFIX}.breaking_intro`)}</p>
      <ul>
        ${[...groups.values()].map(
          (domains) =>
            html`<li>
              ${this._renderLink(
                `${UPGRADE_CHECK_PATH}#${upgradeCheckGroupAnchor("breaking", domains)}`,
                domains
                  .map((domain) => domainToName(this._localize, domain))
                  .join(", ")
              )}
            </li>`
        )}
        ${
          general
            ? html`<li>
                ${this._renderLink(
                  `${UPGRADE_CHECK_PATH}#${upgradeCheckGroupAnchor("breaking", [])}`,
                  this._localize(`${PREFIX}.general`, { count: general })
                )}
              </li>`
            : nothing
        }
      </ul>`;
  }

  private _renderCategory(
    key: Exclude<UpgradeCheckCategoryKey, "breaking">,
    count: number
  ) {
    return html`<div class="category">
      <ha-upgrade-check-icon .category=${key}></ha-upgrade-check-icon>
      ${this._renderLink(
        `${UPGRADE_CHECK_PATH}#${upgradeCheckCategoryAnchor(key)}`,
        this._localize(`${PREFIX}.category.${key}`, { count })
      )}
    </div>`;
  }

  private _renderLink(href: string, label: string) {
    return html`<a href=${href} @click=${this._openUpdates}>${label}</a>`;
  }

  static styles = css`
    .box {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-2);
      margin-top: var(--ha-space-4);
      padding: var(--ha-space-4);
      border: 1px solid var(--ha-color-border-neutral-quiet);
      border-radius: var(--ha-border-radius-lg);
    }
    .title {
      font-size: var(--ha-font-size-l);
      font-weight: var(--ha-font-weight-medium);
    }
    p,
    ul {
      margin: 0;
    }
    .secondary {
      color: var(--secondary-text-color);
    }
    .categories {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-2);
    }
    .category {
      display: flex;
      align-items: center;
      gap: var(--ha-space-3);
    }
    ha-upgrade-check-icon {
      --upgrade-check-icon-size: 32px;
    }
    ul {
      padding-inline-start: var(--ha-space-5);
    }
    a {
      color: var(--primary-color);
      text-decoration: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-update-upgrade-check": HaMoreInfoUpdateUpgradeCheck;
  }
}
