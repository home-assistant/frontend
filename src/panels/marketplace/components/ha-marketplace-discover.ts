import type { ContextType } from "@lit/context";
import { mdiCheckCircle, mdiDownload, mdiStar } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { consume } from "../../../common/decorators/consume";
import { transform } from "../../../common/decorators/transform";
import { formatNumber } from "../../../common/number/format_number";
import "../../../components/ha-card";
import "../../../components/ha-svg-icon";
import {
  configContext,
  internationalizationContext,
  uiContext,
} from "../../../data/context";
import type { MarketplaceData } from "../../../data/marketplace/marketplace";
import type { RepositoryBase } from "../../../data/marketplace/repository";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistantConfig, HomeAssistantUI } from "../../../types";
import { browseUrl, timestamp } from "../dashboards/dashboard-repositories";
import { renderRepositoryIcon } from "../tools/repository-icon";

// Enough to get an idea, the rest is one select away on the browse tab
const ROWS_PER_SECTION = 6;

interface DiscoverSection {
  name: "popular" | "updated";
  repositories: RepositoryBase[];
  // Browsing everything the way the section picked from it
  seeAll: string;
}

const discoverSections = (
  repositories: RepositoryBase[]
): DiscoverSection[] => {
  const top = (
    list: RepositoryBase[],
    compare: (a: RepositoryBase, b: RepositoryBase) => number
  ) => [...list].sort(compare).slice(0, ROWS_PER_SECTION);
  const byStars = (a: RepositoryBase, b: RepositoryBase) => b.stars - a.stars;
  const mostStars = { column: "stars", direction: "desc" } as const;

  return [
    {
      name: "popular",
      repositories: top(repositories, byStars),
      seeAll: browseUrl({ sorting: mostStars, filters: {} }),
    },
    {
      name: "updated",
      // Parsed once per repository, not twice per comparison of the catalog
      repositories: repositories
        .map((repository) => ({
          repository,
          updated: timestamp(repository.last_updated),
        }))
        .sort((a, b) => b.updated - a.updated)
        .slice(0, ROWS_PER_SECTION)
        .map(({ repository }) => repository),
      seeAll: browseUrl({
        sorting: { column: "last_updated", direction: "desc" },
        filters: {},
      }),
    },
  ];
};

@customElement("ha-marketplace-discover")
export class HaMarketplaceDiscover extends LitElement {
  @property({ attribute: false }) public marketplace!: MarketplaceData;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: uiContext, subscribe: true })
  @transform<HomeAssistantUI, boolean | undefined>({
    transformer: ({ themes }) => themes?.darkMode,
  })
  private _darkMode?: boolean;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, string>({
    transformer: ({ auth }) => auth.data.hassUrl,
  })
  private _hassUrl!: string;

  private _sections = memoizeOne(discoverSections);

  protected render() {
    const localize = this._i18n.localize;

    return html`<div class="content">
      <div class="intro">
        <h1>${localize("ui.panel.marketplace.discover.title")}</h1>
        <p>${localize("ui.panel.marketplace.discover.intro")}</p>
      </div>
      ${this._sections(this.marketplace.repositories).map(
        (section) =>
          html`<section class=${section.name}>
            <div class="section-header">
              <h2>
                ${localize(`ui.panel.marketplace.discover.${section.name}`)}
              </h2>
              <a class="see-all" href=${section.seeAll}>
                ${localize("ui.panel.marketplace.discover.see_all")}
              </a>
            </div>
            <ha-card outlined>
              ${section.repositories.map((repository) =>
                this._renderRow(repository)
              )}
            </ha-card>
          </section>`
      )}
    </div>`;
  }

  private _renderRow(repository: RepositoryBase) {
    const localize = this._i18n.localize;
    const locale = this._i18n.locale;
    const compact = { notation: "compact" } as const;

    return html`<div class="row">
      <div class="icon">
        ${renderRepositoryIcon(repository, {
          darkMode: this._darkMode,
          hassUrl: this._hassUrl,
        })}
      </div>
      <div class="text">
        <div class="title">
          <a class="name" href="/marketplace/repository/${repository.id}"
            >${repository.name}</a
          >
          <span class="type">
            ${localize(`ui.panel.marketplace.common.type.${repository.category}`)}
          </span>
        </div>
        <div class="description">${repository.description}</div>
      </div>
      ${
        repository.installed
          ? html`<span class="installed">
              <ha-svg-icon .path=${mdiCheckCircle}></ha-svg-icon>
              ${localize("ui.panel.marketplace.repository_status.installed")}
            </span>`
          : nothing
      }
      <div class="numbers">
        ${
          repository.downloads
            ? html`<span>
                <ha-svg-icon .path=${mdiDownload}></ha-svg-icon>
                ${formatNumber(repository.downloads, locale, compact)}
              </span>`
            : nothing
        }
        <span>
          <ha-svg-icon .path=${mdiStar}></ha-svg-icon>
          ${formatNumber(repository.stars, locale, compact)}
        </span>
      </div>
    </div>`;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: block;
        }

        .content {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-8);
          max-width: 1000px;
          margin: auto;
          padding: var(--ha-space-8) var(--ha-space-4);
        }

        h1 {
          margin: 0;
          font-size: var(--ha-font-size-3xl);
          font-weight: var(--ha-font-weight-medium);
        }

        .intro p {
          margin: var(--ha-space-2) 0 0;
          color: var(--secondary-text-color);
        }

        .section-header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-block-end: var(--ha-space-3);
        }

        h2 {
          margin: 0;
          font-size: var(--ha-font-size-xl);
          font-weight: var(--ha-font-weight-medium);
        }

        .see-all {
          color: var(--primary-color);
          text-decoration: none;
        }

        .row {
          position: relative;
          display: flex;
          align-items: center;
          gap: var(--ha-space-4);
          padding: var(--ha-space-3) var(--ha-space-4);
        }

        .row + .row {
          border-top: var(--ha-border-width-sm) solid var(--divider-color);
        }

        .icon {
          display: flex;
          flex: none;
          justify-content: center;
          width: 36px;
          color: var(--secondary-text-color);
          --mdc-icon-size: 36px;
        }

        .icon img {
          width: 36px;
          height: 36px;
        }

        .text {
          flex: 1;
          min-width: 0;
        }

        .title {
          display: flex;
          align-items: center;
          gap: var(--ha-space-2);
        }

        /* The whole row opens the page */
        .name {
          font-weight: var(--ha-font-weight-medium);
          color: var(--primary-text-color);
          text-decoration: none;
        }

        .name::after {
          content: "";
          position: absolute;
          inset: 0;
        }

        .type {
          padding: 0 var(--ha-space-2);
          border-radius: var(--ha-border-radius-sm);
          font-size: var(--ha-font-size-s);
          color: var(--secondary-text-color);
          background-color: var(--secondary-background-color);
          white-space: nowrap;
        }

        .description {
          overflow: hidden;
          color: var(--secondary-text-color);
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .numbers {
          display: flex;
          flex: none;
          gap: var(--ha-space-3);
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-s);
          font-variant-numeric: tabular-nums;
        }

        .numbers span {
          display: inline-flex;
          align-items: center;
          gap: var(--ha-space-1);
        }

        .numbers ha-svg-icon {
          --mdc-icon-size: 16px;
        }

        .installed {
          display: inline-flex;
          flex: none;
          align-items: center;
          gap: var(--ha-space-1);
          color: var(--success-color);
          font-size: var(--ha-font-size-s);
        }

        .installed ha-svg-icon {
          --mdc-icon-size: 18px;
        }

        @media (max-width: 600px) {
          .numbers {
            display: none;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-marketplace-discover": HaMarketplaceDiscover;
  }
}
