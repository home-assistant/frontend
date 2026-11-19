import { mdiHomeAssistant } from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { replaceCurrentUrl } from "../../../../common/navigate";
import { nextRender } from "../../../../common/util/render-status";
import "../../../../components/ha-alert";
import "../../../../components/ha-card";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-markdown";
import "../../../../components/ha-spinner";
import "../../../../components/ha-svg-icon";
import { domainToName } from "../../../../data/integration";
import { QUALITY_SCALE_MAP } from "../../../../data/integration_quality_scale";
import type {
  UpgradeCheckCategory,
  UpgradeCheckCategoryKey,
  UpgradeCheckDigest,
  UpgradeCheckItem,
} from "../../../../data/upgrade_check";
import {
  UPGRADE_CHECK_ANCHOR,
  UPGRADE_CHECK_UNAVAILABLE,
  fetchUpgradeCheckDigest,
  upgradeCheckCategoryAnchor,
  upgradeCheckGroupAnchor,
  upgradeCheckItemLink,
} from "../../../../data/upgrade_check";
import type { HomeAssistant } from "../../../../types";
import "./ha-upgrade-check-brand";
import "./ha-upgrade-check-icon";

interface ItemGroup {
  name: string;
  global: boolean;
  domains: string[];
  anchor: string;
  items: UpgradeCheckItem[];
}

@customElement("ha-config-upgrade-check")
class HaConfigUpgradeCheck extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _digest?: UpgradeCheckDigest;

  @state() private _error?: string;

  // Group the update dialog linked to; it opens and stays open.
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

  // Wait for the digest: it sets the card's height and so where it ends up.
  private _scrollIfRequested = async (): Promise<void> => {
    const hash = window.location.hash.slice(1);
    if (!hash.startsWith(UPGRADE_CHECK_ANCHOR) || !this._digest) {
      return;
    }
    if (hash !== UPGRADE_CHECK_ANCHOR) {
      this._focus = hash;
      await this.updateComplete;
    }
    await nextRender();
    // A group no longer in the digest falls back to the card.
    const target = this.shadowRoot!.getElementById(hash) ?? this;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    replaceCurrentUrl(window.location.pathname);
  };

  private async _fetch(): Promise<void> {
    this._digest = undefined;
    this._error = undefined;
    try {
      const digest = await fetchUpgradeCheckDigest(this.hass);
      const domains = new Set(
        digest.categories.flatMap((c) =>
          [...c.items, ...c.related].flatMap((i) => i.domains)
        )
      );
      // Integration names for the group headers come from backend title translations.
      await this.hass.loadBackendTranslation("title", [...domains]);
      this._digest = digest;
      this._scrollIfRequested();
    } catch (err: any) {
      this._error =
        err.code === UPGRADE_CHECK_UNAVAILABLE
          ? this.hass.localize(
              "ui.panel.config.updates.upgrade_check.unavailable"
            )
          : err.message || String(err);
    }
  }

  protected render() {
    const localize = this.hass.localize;
    return html`
      <ha-card outlined>
        <div class="card-content">
          ${
            this._digest?.releases.length
              ? html`<p class="secondary intro">
                  ${localize("ui.panel.config.updates.upgrade_check.subtitle", {
                    from: this._digest.running,
                    to: this._digest.target,
                  })}
                </p>`
              : nothing
          }
          ${this._renderBody()}
        </div>
      </ha-card>
    `;
  }

  private _renderBody() {
    const localize = this.hass.localize;
    if (this._error) {
      return html`<ha-alert alert-type="error">${this._error}</ha-alert>`;
    }
    if (!this._digest) {
      return html`<div class="center">
        <ha-spinner size="small"></ha-spinner>
      </div>`;
    }
    if (!this._digest.releases.length) {
      return html`<p>
        ${localize("ui.panel.config.updates.upgrade_check.no_releases", {
          version: this._digest.running,
        })}
      </p>`;
    }
    const shown = this._digest.categories.filter(
      (c) => c.items.length || c.related.length
    );
    if (!shown.length) {
      return html`<p>
        ${localize("ui.panel.config.updates.upgrade_check.nothing_applies")}
      </p>`;
    }
    return shown.map((category) => this._renderCategory(category));
  }

  private _renderCategory(category: UpgradeCheckCategory) {
    let content: TemplateResult[];
    switch (category.key) {
      case "breaking":
      case "noteworthy":
        content = this._groups(category.key, category.items).map((group) =>
          this._renderGroup(category.key, group)
        );
        break;
      case "quality_scale":
        content = category.items.map((item) => this._renderTier(item));
        break;
      case "removed":
        content = category.items.map((item) => this._renderRemoved(item));
        break;
    }
    const anchor = upgradeCheckCategoryAnchor(category.key);
    return html`
      <ha-expansion-panel
        class="category"
        id=${anchor}
        .expanded=${
          category.key === "breaking" ||
          this._focus === anchor ||
          !!this._focus?.startsWith(`${anchor}-`)
        }
        .header=${this.hass.localize(
          `ui.panel.config.updates.upgrade_check.category.${category.key}`
        )}
        .secondary=${this.hass.localize(
          "ui.panel.config.updates.upgrade_check.count",
          { count: category.count }
        )}
      >
        <ha-upgrade-check-icon
          slot="leading-icon"
          .category=${category.key}
        ></ha-upgrade-check-icon>
        ${content} ${this._renderRelated(category.key, category.related)}
      </ha-expansion-panel>
    `;
  }

  // One group per integration (or set of integrations a change covers
  // together), in release notes order, which puts the most used first;
  // general changes come before them all.
  private _groups(
    category: UpgradeCheckCategoryKey,
    items: UpgradeCheckItem[]
  ): ItemGroup[] {
    const groups = new Map<string, ItemGroup>();
    for (const item of items) {
      const global = item.scope === "global";
      const domains = global ? [] : item.domains;
      const key = domains.join(",");
      if (!groups.has(key)) {
        groups.set(key, {
          name: this._scope(item),
          global,
          domains,
          anchor: upgradeCheckGroupAnchor(category, domains),
          items: [],
        });
      }
      groups.get(key)!.items.push(item);
    }
    return [...groups.values()].sort(
      (a, b) => Number(b.global) - Number(a.global)
    );
  }

  private _renderGroup(category: UpgradeCheckCategoryKey, group: ItemGroup) {
    const versions = [...new Set(group.items.map((item) => item.version))];
    return html`
      <ha-expansion-panel
        class="group"
        id=${group.anchor}
        .expanded=${group.anchor === this._focus}
        .header=${group.name}
        .secondary=${versions.join(", ")}
      >
        ${
          group.global
            ? html`<ha-svg-icon
                slot="leading-icon"
                class="general"
                .path=${mdiHomeAssistant}
              ></ha-svg-icon>`
            : html`<ha-upgrade-check-brand
                slot="leading-icon"
                .domain=${group.domains[0]}
              ></ha-upgrade-check-brand>`
        }
        ${group.items.map(
          (item) => html`
            <div class="change">
              <div class="change-header">
                ${
                  // The title often just repeats the integration's name.
                  item.title !== group.name
                    ? html`<span class="change-title">${item.title}</span>`
                    : nothing
                }
                ${this._renderVersion(category, item)}
              </div>
              ${
                item.text
                  ? html`<ha-markdown
                      .content=${item.text}
                      breaks
                    ></ha-markdown>`
                  : nothing
              }
              ${this._renderPrs(item)}
            </div>
          `
        )}
      </ha-expansion-panel>
    `;
  }

  private _renderTier(item: UpgradeCheckItem) {
    const credits = item.authors.map(
      (user, index) =>
        html`${index ? ", " : nothing}<a
            href=${`https://github.com/${user}`}
            target="_blank"
            rel="noreferrer"
            >@${user}</a
          >`
    );
    const tier = QUALITY_SCALE_MAP[item.tier!];
    return html`<div class="line">
      ${
        item.domains.length
          ? html`<ha-upgrade-check-brand
              .domain=${item.domains[0]}
            ></ha-upgrade-check-brand>`
          : nothing
      }
      <div>
        ${this.hass.localize(
          "ui.panel.config.updates.upgrade_check.tier_reached",
          {
            integration: item.title,
            tier: html`<span class="tier-name"
              ><ha-svg-icon
                class=${`tier ${item.tier}`}
                .path=${tier.icon}
              ></ha-svg-icon
              >${this.hass.localize(tier.translationKey)}</span
            >`,
          }
        )}
        ${this._renderVersion("quality_scale", item)}
        ${
          credits.length
            ? html`<div class="secondary">
                ${this.hass.localize(
                  "ui.panel.config.updates.upgrade_check.thanks",
                  { users: html`${credits}` }
                )}
              </div>`
            : nothing
        }
      </div>
    </div>`;
  }

  // A removed integration has no translated name; its title names it.
  private _renderRemoved(item: UpgradeCheckItem) {
    return html`
      <ha-expansion-panel
        class="group"
        .header=${item.title}
        .secondary=${this.hass.localize(
          "ui.panel.config.updates.upgrade_check.removed_in",
          { version: item.version }
        )}
      >
        <ha-upgrade-check-brand
          slot="leading-icon"
          .domain=${item.domains[0]}
          removed
        ></ha-upgrade-check-brand>
        ${
          item.text
            ? html`<ha-markdown .content=${item.text} breaks></ha-markdown>`
            : nothing
        }
      </ha-expansion-panel>
    `;
  }

  private _renderRelated(
    category: UpgradeCheckCategoryKey,
    related: UpgradeCheckItem[]
  ) {
    if (!related.length) {
      return nothing;
    }
    return html`
      <p class="secondary related">
        ${this.hass.localize("ui.panel.config.updates.upgrade_check.related")}
      </p>
      <ul>
        ${related.map(
          (item) =>
            html`<li>
              ${item.title} (${this._scope(item)})
              ${this._renderVersion(category, item)}
            </li>`
        )}
      </ul>
    `;
  }

  // Opens the item itself in its release notes, in a new window.
  private _renderVersion(
    category: UpgradeCheckCategoryKey,
    item: UpgradeCheckItem
  ) {
    return html`<a
      class="version"
      href=${upgradeCheckItemLink(category, item)}
      target="_blank"
      rel="noreferrer"
      >${item.version}</a
    >`;
  }

  private _renderPrs(item: UpgradeCheckItem) {
    if (!item.prs.length) {
      return nothing;
    }
    return html`<div class="prs">
      ${item.prs.map(
        (pr) =>
          html`<a href=${pr.url} target="_blank" rel="noreferrer"
            >${pr.label}</a
          >`
      )}
    </div>`;
  }

  private _scope(item: UpgradeCheckItem): string {
    if (item.scope === "global") {
      return this.hass.localize("ui.panel.config.updates.upgrade_check.global");
    }
    return item.domains
      .map((domain) => domainToName(this.hass.localize, domain))
      .join(", ");
  }

  static styles = css`
    ha-card {
      margin-bottom: max(24px, var(--safe-area-inset-bottom));
    }
    .intro {
      margin-bottom: var(--ha-space-2);
    }
    .secondary {
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
    }
    .card-content {
      display: flex;
      flex-direction: column;
      padding: var(--ha-space-2) var(--ha-space-4) var(--ha-space-4);
    }
    .category {
      --expansion-panel-summary-padding: var(--ha-space-2) 0;
      --expansion-panel-content-padding: 0 0 var(--ha-space-2)
        calc(40px + var(--ha-space-4));
    }
    /* Phones need the width more than the indent under the category icon. */
    @media (max-width: 600px) {
      .category {
        --expansion-panel-content-padding: 0 0 var(--ha-space-2);
      }
    }
    .category + .category {
      border-top: 1px solid var(--ha-color-border-neutral-quiet);
    }
    ha-upgrade-check-icon {
      margin-inline-end: var(--ha-space-4);
    }
    .center {
      display: flex;
      justify-content: center;
    }
    a {
      color: var(--primary-color);
      text-decoration: none;
    }
    .group {
      scroll-margin-top: var(--ha-space-4);
      --expansion-panel-summary-padding: 0;
      --expansion-panel-content-padding: 0 var(--ha-space-2);
    }
    .general {
      color: var(--secondary-text-color);
    }
    .change + .change {
      border-top: 1px solid var(--divider-color);
      margin-top: var(--ha-space-2);
      padding-top: var(--ha-space-2);
    }
    .change-header {
      display: flex;
      align-items: baseline;
      gap: var(--ha-space-2);
    }
    .change-title {
      font-weight: var(--ha-font-weight-medium);
    }
    .version {
      font-size: var(--ha-font-size-s);
    }
    .line {
      display: flex;
      align-items: flex-start;
      gap: var(--ha-space-2);
      padding: var(--ha-space-2) 0;
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
    .prs {
      display: flex;
      gap: var(--ha-space-2);
      font-size: var(--ha-font-size-s);
      padding-bottom: var(--ha-space-2);
    }
    .related {
      margin-top: var(--ha-space-2);
    }
    ul {
      margin: 0;
    }
    p {
      margin: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-upgrade-check": HaConfigUpgradeCheck;
  }
}
