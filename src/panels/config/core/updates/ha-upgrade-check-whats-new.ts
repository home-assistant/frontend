import {
  mdiAlertOutline,
  mdiArchiveOutline,
  mdiCloudOffOutline,
  mdiHomeAssistant,
  mdiMedalOutline,
  mdiStarOutline,
} from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consumeLocalize } from "../../../../common/decorators/consume-context-entry";
import { fireEvent } from "../../../../common/dom/fire_event";
import { isNavigationClick } from "../../../../common/dom/is-navigation-click";
import { navigate } from "../../../../common/navigate";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import { nextRender } from "../../../../common/util/render-status";
import "../../../../components/chips/ha-assist-chip";
import "../../../../components/chips/ha-chip-set";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-markdown";
import "../../../../components/ha-svg-icon";
import { domainToName } from "../../../../data/integration";
import type {
  UpgradeCheckBreakingRow,
  UpgradeCheckCategoryKey,
  UpgradeCheckDigest,
  UpgradeCheckItem,
} from "../../../../data/upgrade_check";
import {
  UPGRADE_CHECK_PATH,
  upgradeCheckBreakingCounts,
  upgradeCheckBreakingRows,
  upgradeCheckItemLink,
  upgradeCheckImprovementRows,
  upgradeCheckQualityScaleRows,
  upgradeCheckRemovedRows,
} from "../../../../data/upgrade_check";
import { QUALITY_SCALE_MAP } from "../../../../data/integration_quality_scale";
import "./ha-upgrade-check-brand";
import "./ha-upgrade-check-icon";

const PREFIX = "ui.panel.config.updates.upgrade_check";

// Hash on the page that opens the group of general changes.
const GENERAL_ANCHOR = "breaking-general";

// What's new for a core update: breaking changes for your setup first, then
// improvements for your integrations, then the release announcements. Short
// in the update dialog, linking to the full card on its own page.

@customElement("ha-upgrade-check-whats-new")
export class HaUpgradeCheckWhatsNew extends LitElement {
  @property({ attribute: false }) public digest?: UpgradeCheckDigest;

  // The release notes could not be read.
  @property({ type: Boolean }) public unavailable = false;

  @property({ attribute: false }) public releaseUrl?: string;

  // Version of the update when there is no digest to name it.
  @property({ attribute: false }) public version?: string | null;

  // Every change, each opening to its full text, instead of the short summary.
  @property({ type: Boolean }) public full = false;

  // Anchor of the row to open.
  @property({ attribute: false }) public focusAnchor?: string;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  protected render() {
    if (!this._localize) {
      return nothing;
    }
    if (this.unavailable) {
      return html`<div class="card">
        <div class="header">
          <ha-upgrade-check-icon
            .path=${mdiCloudOffOutline}
            tone="neutral-loud"
          ></ha-upgrade-check-icon>
          ${
            this.version
              ? html`<div>
                  <div class="title">
                    ${this._localize(`${PREFIX}.whats_new`, {
                      version: this.version,
                    })}
                  </div>
                  <div class="secondary">
                    ${this._localize(`${PREFIX}.unavailable_title`)}
                  </div>
                </div>`
              : html`<div class="title">
                  ${this._localize(`${PREFIX}.unavailable_title`)}
                </div>`
          }
        </div>
        <p>${this._localize(`${PREFIX}.unavailable_text`)}</p>
        ${this._renderAnnouncements(
          this.releaseUrl && this.version
            ? [{ version: this.version, url: this.releaseUrl }]
            : []
        )}
      </div>`;
    }
    const digest = this.digest;
    if (!digest?.target) {
      return nothing;
    }
    const rows = upgradeCheckBreakingRows(digest);
    const removed = this.full ? [] : upgradeCheckRemovedRows(digest);
    return html`<div class="card">
      <div>
        <div class="title">
          ${this._localize(`${PREFIX}.whats_new`, { version: digest.target })}
        </div>
        ${
          digest.releases.length > 1
            ? html`<div class="secondary">
                ${this._localize(`${PREFIX}.releases`, {
                  count: digest.releases.length,
                  from: digest.running,
                })}
              </div>`
            : nothing
        }
      </div>
      ${
        this.full
          ? this._renderSections(digest, rows)
          : html`${
              rows.length
                ? html`<div class="section">
                    <div class="section-title">
                      ${this._localize(`${PREFIX}.breaking_title`)}
                    </div>
                    ${this._renderBreaking(rows)}
                  </div>`
                : nothing
            }
            ${
              removed.length
                ? html`<div class="section">
                    <div class="section-title">
                      ${this._localize(`${PREFIX}.removed_title`)}
                    </div>
                    ${this._renderRows(removed)}
                  </div>`
                : nothing
            }
            ${
              rows.length || removed.length
                ? nothing
                : html`<p>${this._localize(`${PREFIX}.no_breaking`)}</p>`
            }`
      }
      ${this._renderAnnouncements(digest.releases)}
      ${
        this.full
          ? nothing
          : html`<a href=${UPGRADE_CHECK_PATH} @click=${this._openPage}
              >${this._localize(`${PREFIX}.show_all`, {
                version: digest.running,
              })}</a
            >`
      }
    </div>`;
  }

  // The page: one collapsible section per kind of change. Breaking changes
  // are open; another opens when the dialog links to one of its rows.
  private _renderSections(
    digest: UpgradeCheckDigest,
    breaking: UpgradeCheckBreakingRow[]
  ) {
    const sections = [
      {
        key: "breaking",
        title: this._localize(`${PREFIX}.breaking_title`),
        icon: mdiAlertOutline,
        tone: "warning",
        rows: breaking,
      },
      {
        key: "removed",
        title: this._localize(`${PREFIX}.removed_title`),
        icon: mdiArchiveOutline,
        tone: "neutral",
        rows: upgradeCheckRemovedRows(digest),
      },
      {
        key: "improvements",
        title: this._localize(`${PREFIX}.improvements_title`),
        icon: mdiStarOutline,
        tone: "primary",
        rows: upgradeCheckImprovementRows(digest),
      },
      {
        key: "quality_scale",
        title: this._localize(`${PREFIX}.quality_scale_title`),
        icon: mdiMedalOutline,
        tone: "success",
        rows: upgradeCheckQualityScaleRows(digest),
      },
    ] as const;
    const shown = sections.filter((section) => section.rows.length);
    if (!shown.length) {
      return html`<p>${this._localize(`${PREFIX}.nothing_applies`)}</p>`;
    }
    return shown.map(
      (section) =>
        html`<ha-expansion-panel
          class="category"
          id=${section.key}
          .expanded=${
            section.key === "breaking" ||
            section.rows.some((row) => row.anchor === this.focusAnchor)
          }
          .header=${section.title}
          .secondary=${this._localize(`${PREFIX}.count_items`, {
            count: section.rows.reduce((n, row) => n + row.items.length, 0),
          })}
        >
          <ha-upgrade-check-icon
            slot="leading-icon"
            .path=${section.icon}
            .tone=${section.tone}
          ></ha-upgrade-check-icon>
          <div class="section">
            ${
              section.key === "breaking"
                ? this._renderBreaking(section.rows)
                : this._renderRows(section.rows)
            }
          </div>
        </ha-expansion-panel>`
    );
  }

  private _renderBreaking(rows: UpgradeCheckBreakingRow[]) {
    const { integrations, general } = upgradeCheckBreakingCounts(rows);
    const key =
      integrations && general
        ? "breaking_summary_both"
        : integrations
          ? "breaking_summary_integrations"
          : "breaking_summary_general";
    return html`<p>
        ${this._localize(`${PREFIX}.${key}`, { integrations, general })}
      </p>
      ${this.full ? this._renderBreakingRows(rows) : this._renderBreakingChips(rows)}`;
  }

  // On the card, general changes share one chip after the integrations.
  private _renderBreakingChips(rows: UpgradeCheckBreakingRow[]) {
    const general = rows.filter((row) => !row.domains.length);
    return html`<ha-chip-set>
      ${rows
        .filter((row) => row.domains.length)
        .map((row) => this._renderChip(row))}
      ${
        general.length
          ? html`<ha-assist-chip
              .href=${`${UPGRADE_CHECK_PATH}#${GENERAL_ANCHOR}`}
              .label=${this._localize(`${PREFIX}.count_general`, {
                count: general.length,
              })}
              @click=${this._openPage}
              ><ha-svg-icon
                slot="icon"
                class="general"
                .path=${mdiHomeAssistant}
              ></ha-svg-icon
            ></ha-assist-chip>`
          : nothing
      }
    </ha-chip-set>`;
  }

  // On the page, general changes fold into a group of their own below the
  // integrations, so those you recognise come first.
  private _renderBreakingRows(rows: UpgradeCheckBreakingRow[]) {
    const general = rows.filter((row) => !row.domains.length);
    return html`${this._renderRows(rows.filter((row) => row.domains.length))}
    ${
      general.length
        ? html`<ha-expansion-panel
            id=${GENERAL_ANCHOR}
            class="full-row general-group"
            .expanded=${
              this.focusAnchor === GENERAL_ANCHOR ||
              general.some((row) => row.anchor === this.focusAnchor)
            }
            .header=${this._localize(`${PREFIX}.general_title`)}
            .secondary=${this._localize(`${PREFIX}.count_items`, {
              count: general.length,
            })}
          >
            <ha-svg-icon
              slot="leading-icon"
              class="general"
              .path=${mdiHomeAssistant}
            ></ha-svg-icon>
            <div class="section">${this._renderRows(general)}</div>
          </ha-expansion-panel>`
        : nothing
    }`;
  }

  // Chips in the short card; rows that open to their full text on the page.
  private _renderRows(rows: UpgradeCheckBreakingRow[]) {
    if (!this.full) {
      return html`<ha-chip-set>
        ${rows.map((row) => this._renderChip(row))}
      </ha-chip-set>`;
    }
    return rows.map((row) =>
      row.category === "quality_scale"
        ? this._renderTier(row)
        : this._renderFullRow(row)
    );
  }

  private _rowName(row: UpgradeCheckBreakingRow): string {
    // Removed integrations have no translated name, and general changes no
    // domain; their titles name them.
    if (row.removed || !row.domains.length) {
      return row.items[0].title;
    }
    return row.domains
      .map((domain) => domainToName(this._localize, domain))
      .join(", ");
  }

  private _rowIcon(row: UpgradeCheckBreakingRow, slot: string) {
    const tier = row.items[0].tier;
    if (row.category === "quality_scale" && tier) {
      return html`<ha-svg-icon
        slot=${slot}
        class=${`tier ${tier}`}
        .path=${QUALITY_SCALE_MAP[tier].icon}
      ></ha-svg-icon>`;
    }
    return row.domains.length
      ? html`<ha-upgrade-check-brand
          slot=${slot}
          .domain=${row.domains[0]}
          .removed=${row.removed}
        ></ha-upgrade-check-brand>`
      : html`<ha-svg-icon
          slot=${slot}
          class="general"
          .path=${mdiHomeAssistant}
        ></ha-svg-icon>`;
  }

  // Opens the row on the page.
  private _renderChip(row: UpgradeCheckBreakingRow) {
    const name = this._rowName(row);
    return html`<ha-assist-chip
      .href=${`${UPGRADE_CHECK_PATH}#${row.anchor}`}
      .label=${name}
      @click=${this._openPage}
      >${this._rowIcon(row, "icon")}</ha-assist-chip
    >`;
  }

  private _rowSummary(row: UpgradeCheckBreakingRow): string {
    const first = row.items[0];
    const summary =
      first.summary ??
      (row.removed
        ? this._localize(`${PREFIX}.removed_in`, { version: first.version })
        : first.title);
    return row.items.length > 1
      ? this._localize(`${PREFIX}.summary_more`, {
          summary,
          count: row.items.length - 1,
        })
      : summary;
  }

  private _renderFullRow(row: UpgradeCheckBreakingRow) {
    return html`<ha-expansion-panel
      class="full-row"
      id=${row.anchor}
      .expanded=${row.anchor === this.focusAnchor}
      .header=${this._rowName(row)}
      .secondary=${this._rowSummary(row)}
    >
      ${this._rowIcon(row, "leading-icon")}
      ${row.items.map((item) => this._renderItem(row.category, item))}
    </ha-expansion-panel>`;
  }

  private _renderItem(
    category: UpgradeCheckCategoryKey,
    item: UpgradeCheckItem
  ) {
    return html`<div class="item">
      ${
        item.text
          ? html`<ha-markdown .content=${item.text} breaks></ha-markdown>`
          : nothing
      }
      <div class="links">
        <a
          href=${upgradeCheckItemLink(category, item)}
          target="_blank"
          rel="noreferrer"
          >${this._localize(`${PREFIX}.in_release`, {
            version: item.version,
          })}</a
        >
        ${item.prs.map(
          (pr) =>
            html`<a href=${pr.url} target="_blank" rel="noreferrer"
              >${pr.label}</a
            >`
        )}
      </div>
    </div>`;
  }

  // The tier an integration reached, with thanks to who got it there.
  private _renderTier(row: UpgradeCheckBreakingRow) {
    const item = row.items[0];
    const tier = QUALITY_SCALE_MAP[item.tier!];
    const credits = item.authors.map(
      (user, index) =>
        html`${index ? ", " : nothing}<a
            href=${`https://github.com/${user}`}
            target="_blank"
            rel="noreferrer"
            >@${user}</a
          >`
    );
    return html`<div class="tier-row" id=${row.anchor}>
      ${
        row.domains.length
          ? html`<ha-upgrade-check-brand
              .domain=${row.domains[0]}
            ></ha-upgrade-check-brand>`
          : nothing
      }
      <div>
        <div>
          ${this._localize(`${PREFIX}.tier_reached`, {
            integration: this._rowName(row),
            tier: html`<span class="tier-name"
              ><ha-svg-icon
                class=${`tier ${item.tier}`}
                .path=${tier.icon}
              ></ha-svg-icon
              >${this._localize(tier.translationKey)}</span
            >`,
          })}
          <a
            class="version"
            href=${upgradeCheckItemLink("quality_scale", item)}
            target="_blank"
            rel="noreferrer"
            >${this._localize(`${PREFIX}.in_release`, {
              version: item.version,
            })}</a
          >
        </div>
        ${
          credits.length
            ? html`<div class="secondary">
                ${this._localize(`${PREFIX}.thanks`, {
                  users: html`${credits}`,
                })}
              </div>`
            : nothing
        }
      </div>
    </div>`;
  }

  // One announcement per release you get, so skipping releases adds links.
  private _renderAnnouncements(releases: { version: string; url: string }[]) {
    if (!releases.length) {
      return nothing;
    }
    return html`<p class="announcements">
      ${this._localize(`${PREFIX}.release_announcements`, {
        count: releases.length,
      })}
      ${releases.map(
        (release, index) =>
          html`${index ? " · " : nothing}<a
              href=${release.url}
              target="_blank"
              rel="noreferrer"
              >${release.version}</a
            >`
      )}
    </p>`;
  }

  // In the update dialog: closing it refocuses the row that opened it, which
  // scrolls the page back up; navigate() waits for a close only briefly, so
  // close it first.
  private async _openPage(ev: MouseEvent): Promise<void> {
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

  static styles = css`
    .card {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-3);
      padding: var(--ha-space-4);
      border: 1px solid var(--ha-color-border-neutral-quiet);
      border-radius: var(--ha-border-radius-lg);
    }
    .title {
      font-size: var(--ha-font-size-l);
      font-weight: var(--ha-font-weight-medium);
    }
    .header {
      display: flex;
      align-items: center;
      gap: var(--ha-space-4);
    }
    .header ha-upgrade-check-icon {
      --upgrade-check-icon-size: 48px;
    }
    .secondary {
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
    }
    p {
      margin: 0;
    }
    .section {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-3);
    }
    .section-title {
      font-weight: var(--ha-font-weight-medium);
    }
    ha-upgrade-check-brand {
      --upgrade-check-brand-size: 18px;
    }
    .full-row ha-upgrade-check-brand,
    .full-row .general {
      --upgrade-check-brand-size: 32px;
      --mdc-icon-size: 32px;
      margin-inline-end: var(--ha-space-3);
    }
    .general {
      color: var(--secondary-text-color);
    }
    .general-group {
      --expansion-panel-content-padding: 0 0 0 calc(32px + var(--ha-space-3));
    }
    .general-group .section {
      padding-top: var(--ha-space-3);
    }
    .full-row {
      scroll-margin-top: var(--ha-space-4);
      --expansion-panel-summary-padding: 0;
      --expansion-panel-content-padding: var(--ha-space-2) 0 0
        calc(32px + var(--ha-space-3));
    }
    .item + .item {
      border-top: 1px solid var(--divider-color);
      margin-top: var(--ha-space-2);
      padding-top: var(--ha-space-2);
    }
    .links {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ha-space-1) var(--ha-space-3);
      font-size: var(--ha-font-size-s);
    }
    .tier-row {
      display: flex;
      align-items: flex-start;
      gap: var(--ha-space-3);
    }
    .tier-row ha-upgrade-check-brand {
      --upgrade-check-brand-size: 32px;
    }
    .version {
      font-size: var(--ha-font-size-s);
      margin-inline-start: var(--ha-space-2);
    }
    .tier-name {
      white-space: nowrap;
    }
    /* Same icons, colors and shimmer as the quality scale on the integration page. */
    .tier {
      --mdc-icon-size: 18px;
      vertical-align: text-bottom;
      margin-inline-end: var(--ha-space-1);
    }
    @media (prefers-reduced-motion: no-preference) {
      .tier {
        mask: linear-gradient(-60deg, #000 30%, #0005, #000 70%) right/350% 100%;
        animation: shimmer 2.5s infinite;
      }
    }
    @keyframes shimmer {
      100% {
        mask-position: left;
      }
    }
    .tier.bronze {
      color: #cd7f32;
    }
    .tier.silver {
      color: silver;
    }
    .tier.gold {
      color: gold;
    }
    .tier.platinum {
      color: #727272;
    }
    .category {
      --expansion-panel-summary-padding: var(--ha-space-2) 0;
      --expansion-panel-content-padding: 0;
    }
    /* The panel keeps its content padding while collapsed. */
    .category .section {
      padding-block: var(--ha-space-2) var(--ha-space-3);
    }
    .category + .category {
      border-top: 1px solid var(--divider-color);
    }
    .category ha-upgrade-check-icon {
      margin-inline-end: var(--ha-space-3);
    }
    hr {
      width: 100%;
      border: none;
      border-top: 1px solid var(--divider-color);
      margin: 0;
    }
    a {
      color: var(--primary-color);
      text-decoration: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-upgrade-check-whats-new": HaUpgradeCheckWhatsNew;
  }
}
