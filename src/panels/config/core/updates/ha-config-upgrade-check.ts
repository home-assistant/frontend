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
import { domainToName } from "../../../../data/integration";
import { QUALITY_SCALE_MAP } from "../../../../data/integration_quality_scale";
import type {
  UpgradeCheckCategory,
  UpgradeCheckDigest,
  UpgradeCheckItem,
} from "../../../../data/upgrade_check";
import {
  UPGRADE_CHECK_ANCHOR,
  UPGRADE_CHECK_UNAVAILABLE,
  fetchUpgradeCheckDigest,
} from "../../../../data/upgrade_check";
import type { HomeAssistant } from "../../../../types";

interface ItemGroup {
  name: string;
  global: boolean;
  items: UpgradeCheckItem[];
}

@customElement("ha-config-upgrade-check")
class HaConfigUpgradeCheck extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _digest?: UpgradeCheckDigest;

  @state() private _error?: string;

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
    if (window.location.hash !== `#${UPGRADE_CHECK_ANCHOR}` || !this._digest) {
      return;
    }
    await nextRender();
    this.scrollIntoView({ behavior: "smooth", block: "start" });
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
    // Nothing to check without a pending core update.
    if (this._digest && !this._digest.target) {
      return nothing;
    }
    const localize = this.hass.localize;
    return html`
      <ha-card outlined>
        <div class="card-header">
          <div class="title" role="heading" aria-level="2">
            ${localize("ui.panel.config.updates.upgrade_check.title")}
          </div>
          ${
            this._digest?.releases.length
              ? html`<div class="secondary">
                  ${localize("ui.panel.config.updates.upgrade_check.subtitle", {
                    from: this._digest.running,
                    to: this._digest.target,
                  })}
                </div>`
              : nothing
          }
        </div>
        <div class="card-content">${this._renderBody()}</div>
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
        content = this._groups(category.items).map((group) =>
          this._renderGroup(group)
        );
        break;
      case "quality_scale":
        content = category.items.map((item) => this._renderTier(item));
        break;
      case "removed":
        content = category.items.map((item) => this._renderRemoved(item));
        break;
    }
    return html`
      <ha-expansion-panel
        outlined
        .expanded=${category.key === "breaking"}
        .header=${this.hass.localize(
          `ui.panel.config.updates.upgrade_check.category.${category.key}`
        )}
        .secondary=${this.hass.localize(
          "ui.panel.config.updates.upgrade_check.count",
          { count: category.count }
        )}
      >
        ${content} ${this._renderRelated(category.related)}
      </ha-expansion-panel>
    `;
  }

  // One group per integration (or set of integrations), plus a first one for
  // general changes that no single integration covers.
  private _groups(items: UpgradeCheckItem[]): ItemGroup[] {
    const groups = new Map<string, ItemGroup>();
    for (const item of items) {
      const global = item.scope === "global";
      const key = global ? "" : item.domains.join(",");
      if (!groups.has(key)) {
        groups.set(key, {
          name: this._scope(item),
          global,
          items: [],
        });
      }
      groups.get(key)!.items.push(item);
    }
    return [...groups.values()].sort((a, b) =>
      a.global !== b.global
        ? Number(b.global) - Number(a.global)
        : a.name.localeCompare(b.name, this.hass.locale.language)
    );
  }

  private _renderGroup(group: ItemGroup) {
    const versions = [...new Set(group.items.map((item) => item.version))];
    return html`
      <ha-expansion-panel
        class="group"
        .header=${group.name}
        .secondary=${versions.join(", ")}
      >
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
                ${this._renderVersion(item)}
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
    const credits = item.credits.map(
      (user, index) =>
        html`${index ? ", " : nothing}<a
            href=${`https://github.com/${user}`}
            target="_blank"
            rel="noreferrer"
            >@${user}</a
          >`
    );
    return html`<div class="line">
      ${this.hass.localize(
        "ui.panel.config.updates.upgrade_check.tier_reached",
        {
          integration: item.title,
          tier: this.hass.localize(
            QUALITY_SCALE_MAP[item.tier!].translationKey
          ),
        }
      )}
      ${this._renderVersion(item)}
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
        ${
          item.text
            ? html`<ha-markdown .content=${item.text} breaks></ha-markdown>`
            : nothing
        }
      </ha-expansion-panel>
    `;
  }

  private _renderRelated(related: UpgradeCheckItem[]) {
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
              ${item.title} (${this._scope(item)}) ${this._renderVersion(item)}
            </li>`
        )}
      </ul>
    `;
  }

  private _renderVersion(item: UpgradeCheckItem) {
    return html`<a
      class="version"
      href=${item.url}
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
    .card-header {
      padding: var(--ha-space-4) var(--ha-space-4) 0;
    }
    .title {
      font-size: var(--ha-font-size-l);
    }
    .secondary {
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
    }
    .card-content {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-2);
      padding: var(--ha-space-4);
    }
    .center {
      display: flex;
      justify-content: center;
    }
    a {
      color: var(--primary-color);
    }
    .group {
      --expansion-panel-summary-padding: 0;
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
      padding: var(--ha-space-2) 0;
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
