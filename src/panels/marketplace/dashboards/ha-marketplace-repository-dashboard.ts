import {
  mdiAccount,
  mdiArrowDownBold,
  mdiCube,
  mdiDotsVertical,
  mdiDownload,
  mdiExclamationThick,
  mdiStar,
} from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { extractSearchParamsObject } from "../../../common/url/search-params";
import { deepEqual } from "../../../common/util/deep-equal";
import "../../../components/chips/ha-assist-chip";
import "../../../components/chips/ha-chip-set";
import "../../../components/ha-alert";
import "../../../components/ha-card";
import "../../../components/ha-button";
import "../../../components/ha-markdown";
import "@home-assistant/webawesome/dist/components/divider/divider";
import "../../../components/ha-dropdown";
import type {
  HaDropdown,
  HaDropdownSelectEvent,
} from "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-error-screen";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-subpage";
import type { HomeAssistant, Route } from "../../../types";
import { showMarketplaceDownloadDialog } from "../dialogs/show-dialog-marketplace";
import type { MarketplaceRepositoryMenuItem } from "../components/ha-marketplace-repository-overflow-menu";
import { repositoryMenuItems } from "../components/ha-marketplace-repository-overflow-menu";
import type { MarketplaceData } from "../../../data/marketplace/marketplace";
import type {
  RepositoryBase,
  RepositoryInfo,
} from "../../../data/marketplace/repository";
import { fetchRepositoryInformation } from "../../../data/marketplace/repository";
import {
  getRepositories,
  handleWarningNotAccepted,
  repositoryAdd,
} from "../../../data/marketplace/websocket";
import { marketplaceStyles } from "../styles/marketplace-common-style";
import {
  ensureGitHubConnected,
  handleGitHubNotConnected,
  handleGitHubRateLimited,
} from "../tools/connect-github";
import { downloadBlockedReason } from "../tools/download-blocked-reason";
import { markdownWithRepositoryContext } from "../tools/markdown";

// Repository pages live at /repository/<id>, my links at /repository.
const repositoryIdFromRoute = (route: Route): string => {
  const dividerPos = route.path.indexOf("/", 1);
  return dividerPos === -1 ? "" : route.path.substring(dividerPos + 1);
};

@customElement("ha-marketplace-repository-dashboard")
export class HaMarketplaceRepositoryDashboard extends LitElement {
  @property({ attribute: false }) public marketplace!: MarketplaceData;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public narrow!: boolean;

  @property({ attribute: false }) public route!: Route;

  @state() private _repository?: RepositoryInfo;

  @state() private _error?: string;

  @query("#overflow-menu")
  private _repositoryOverflowMenu!: HaDropdown;

  private _openingOverflowMenu = false;

  // Answers for a repository navigated away from are dropped.
  private _requestedRepositoryId?: string;

  protected async firstUpdated(
    changedProperties: PropertyValues<this>
  ): Promise<void> {
    super.firstUpdated(changedProperties);

    const params = extractSearchParamsObject();
    if (Object.entries(params).length) {
      let existing: RepositoryBase | undefined;
      const requestedRepository = `${params.owner}/${params.repository}`;
      existing = this.marketplace.repositories.find(
        (repository) =>
          repository.full_name.toLocaleLowerCase() ===
          requestedRepository.toLocaleLowerCase()
      );
      if (!existing && params.category) {
        if (!ensureGitHubConnected(this, this.hass, this.marketplace.info)) {
          this._error = this.hass.localize(
            "ui.panel.marketplace.github.add_repository_needs_github",
            { repository: requestedRepository }
          );
          return;
        }

        if (
          !(await showConfirmationDialog(this, {
            title: this.hass.localize(
              "ui.panel.marketplace.my.add_repository_title"
            ),
            text: this.hass.localize(
              "ui.panel.marketplace.my.add_repository_description",
              {
                repository: requestedRepository,
              }
            ),
            confirmText: this.hass.localize("ui.panel.marketplace.common.add"),
            dismissText: this.hass.localize(
              "ui.panel.marketplace.common.cancel"
            ),
          }))
        ) {
          this._error = this.hass.localize(
            "ui.panel.marketplace.my.repository_not_found",
            {
              repository: requestedRepository,
            }
          );
          return;
        }
        try {
          await repositoryAdd(this.hass, requestedRepository, params.category);
          fireEvent(this, "marketplace-refresh");
          const repositories = await getRepositories(this.hass);
          existing = repositories.find(
            (repository) =>
              repository.full_name.toLocaleLowerCase() ===
              requestedRepository.toLocaleLowerCase()
          );
        } catch (err: any) {
          // The panel swaps to the warning screen, accepting it brings the
          // user back here to add the repository.
          if (handleWarningNotAccepted(err)) {
            return;
          }

          this._error = handleGitHubNotConnected(this, this.hass, err)
            ? this.hass.localize(
                "ui.panel.marketplace.github.add_repository_needs_github",
                { repository: requestedRepository }
              )
            : err?.message;
          return;
        }
      }
      if (existing) {
        this._fetchRepository(String(existing.id));
      } else {
        this._error = this.hass.localize(
          "ui.panel.marketplace.my.repository_not_found",
          {
            repository: requestedRepository,
          }
        );
      }
    } else {
      this._loadRepositoryFromRoute();
    }
  }

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);

    // The router reuses this element when going from one repository to
    // another, the first one is loaded by firstUpdated.
    const previousRoute = changedProps.get("route");
    if (
      !this.hasUpdated ||
      !previousRoute ||
      repositoryIdFromRoute(previousRoute) === repositoryIdFromRoute(this.route)
    ) {
      return;
    }

    this._repository = undefined;
    this._error = undefined;
    this._loadRepositoryFromRoute();
  }

  protected updated(changedProps: PropertyValues<this>): void {
    super.updated(changedProps);

    if (!changedProps.has("marketplace") || !this._repository) {
      return;
    }

    // The Marketplace data is refetched as a whole, so only pick up changes that
    // affect the repository shown here.
    const repositoryId = this._repository.id;
    const listed = this.marketplace.repositories.find(
      (repository) => repository.id === repositoryId
    );
    const previouslyListed = changedProps
      .get("marketplace")
      ?.repositories.find((repository) => repository.id === repositoryId);

    if (previouslyListed && !deepEqual(previouslyListed, listed)) {
      this._fetchRepository();
    }
  }

  private _loadRepositoryFromRoute(): void {
    const repositoryId = repositoryIdFromRoute(this.route);
    if (!repositoryId) {
      this._requestedRepositoryId = undefined;
      this._error = this.hass.localize(
        "ui.panel.marketplace.dashboard.repository_not_found"
      );
      return;
    }

    this._fetchRepository(repositoryId);
  }

  private async _fetchRepository(repositoryId?: string) {
    const requestedRepositoryId = repositoryId || String(this._repository!.id);
    this._requestedRepositoryId = requestedRepositoryId;

    try {
      const repository = await fetchRepositoryInformation(
        this.hass,
        requestedRepositoryId
      );
      if (!this._isCurrentRequest(requestedRepositoryId)) {
        return;
      }
      this._repository = repository;
    } catch (err: any) {
      if (!this._isCurrentRequest(requestedRepositoryId)) {
        return;
      }

      this._error = handleGitHubRateLimited(this, this.hass, err)
        ? this.hass.localize("ui.panel.marketplace.github.rate_limited")
        : err?.message ||
          this.hass.localize("ui.panel.marketplace.common.unknown_error");
    }
  }

  private _isCurrentRequest(repositoryId: string): boolean {
    return this.isConnected && this._requestedRepositoryId === repositoryId;
  }

  private _getAuthors = memoizeOne((repository: RepositoryInfo) => {
    const authors: string[] = [];
    if (!repository.authors) return authors;
    repository.authors.forEach((author) =>
      authors.push(author.replace("@", ""))
    );
    if (authors.length === 0) {
      const author = repository.full_name.split("/")[0];
      if (
        [
          "custom-cards",
          "custom-components",
          "home-assistant-community-themes",
        ].includes(author)
      ) {
        return authors;
      }
      authors.push(author);
    }
    return authors;
  });

  protected render(): TemplateResult {
    if (this._error) {
      return html`<hass-error-screen
        .hass=${this.hass}
        .narrow=${this.narrow}
        .error=${this._error}
      ></hass-error-screen>`;
    }

    if (!this._repository) {
      return html`<hass-loading-screen
        .hass=${this.hass}
        .narrow=${this.narrow}
      ></hass-loading-screen>`;
    }

    const authors = this._getAuthors(this._repository);

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/marketplace"
        .header=${this._repository.name}
      >
        <ha-icon-button
          slot="toolbar-icon"
          .label=${this.hass.localize("ui.common.overflow_menu")}
          .path=${mdiDotsVertical}
          @click=${this._showOverflowRepositoryMenu}
        ></ha-icon-button>
        <div class="content">
          <ha-card>
            <ha-chip-set>
              ${
                this._repository.installed
                  ? html`
                      <ha-assist-chip
                        .label=${this._repository.installed_version}
                        title=${this.hass.localize("ui.panel.marketplace.dialog_info.version_installed")}
                      >
                        <ha-svg-icon slot="icon" .path=${mdiCube}></ha-svg-icon>
                      </ha-assist-chip>
                    `
                  : ""
              }
              ${authors.map(
                (author) =>
                  html`<ha-assist-chip
                    href="https://github.com/${author}"
                    target="_blank"
                    .label=${`@${author}`}
                    title=${this.hass.localize("ui.panel.marketplace.dialog_info.author")}
                  >
                    <ha-svg-icon slot="icon" .path=${mdiAccount}></ha-svg-icon>
                  </ha-assist-chip>`
              )}
              ${
                this._repository.downloads
                  ? html` <ha-assist-chip
                      title=${this.hass.localize("ui.panel.marketplace.dialog_info.downloads")}
                      .label=${String(this._repository.downloads)}
                    >
                      <ha-svg-icon
                        slot="icon"
                        .path=${mdiArrowDownBold}
                      ></ha-svg-icon>
                    </ha-assist-chip>`
                  : ""
              }
              <ha-assist-chip
                .label=${String(this._repository.stars)}
                title=${this.hass.localize("ui.panel.marketplace.dialog_info.stars")}
              >
                <ha-svg-icon slot="icon" .path=${mdiStar}></ha-svg-icon>
              </ha-assist-chip>
              <ha-assist-chip
                href="https://github.com/${this._repository.full_name}/issues"
                target="_blank"
                .label=${String(this._repository.issues)}
                title=${this.hass.localize("ui.panel.marketplace.dialog_info.open_issues")}
              >
                <ha-svg-icon
                  slot="icon"
                  .path=${mdiExclamationThick}
                ></ha-svg-icon>
              </ha-assist-chip>
            </ha-chip-set>
            ${
              this._repository.can_download
                ? nothing
                : html`<ha-alert alert-type="warning">
                    ${downloadBlockedReason(this.hass.localize, this._repository)}
                  </ha-alert>`
            }
            <ha-markdown
              .content=${
                markdownWithRepositoryContext(
                  this._repository.additional_info,
                  this._repository
                ) ||
                this.hass.localize("ui.panel.marketplace.dialog_info.no_info")
              }
            ></ha-markdown>
          </ha-card>
        </div>

        ${
          !this._repository.installed_version && this._repository.can_download
            ? html`<ha-button
                slot="fab"
                size="l"
                @click=${this._downloadRepositoryDialog}
              >
                <ha-svg-icon slot="start" .path=${mdiDownload}></ha-svg-icon>
                ${this.hass.localize("ui.panel.marketplace.common.download")}
              </ha-button>`
            : nothing
        }
      </hass-subpage>
      <ha-dropdown
        id="overflow-menu"
        @wa-select=${this._handleOverflowAction}
        @wa-after-show=${this._overflowMenuOpened}
        @wa-after-hide=${this._overflowMenuClosed}
      >
        ${repositoryMenuItems(this, this._repository, this.hass.localize).map(
          (entry) =>
            "divider" in entry
              ? html`<wa-divider></wa-divider>`
              : html`
                  <ha-dropdown-item
                    .value=${entry.value}
                    variant=${entry.variant || "default"}
                  >
                    <ha-svg-icon .path=${entry.path} slot="icon"></ha-svg-icon>
                    ${entry.label}
                  </ha-dropdown-item>
                `
        )}
      </ha-dropdown>
    `;
  }

  private _showOverflowRepositoryMenu = (ev) => {
    if (this._repositoryOverflowMenu.anchorElement === ev.target) {
      this._repositoryOverflowMenu.anchorElement = undefined;
      return;
    }
    this._openingOverflowMenu = true;
    this._repositoryOverflowMenu.anchorElement = ev.target;
    this._repositoryOverflowMenu.open = true;
  };

  private _handleOverflowAction = (ev: HaDropdownSelectEvent) => {
    if (!this._repository) {
      return;
    }

    repositoryMenuItems(this, this._repository, this.hass.localize)
      .filter(
        (entry): entry is MarketplaceRepositoryMenuItem => "value" in entry
      )
      .find((entry) => entry.value === ev.detail.item.value)
      ?.action();
  };

  private _overflowMenuOpened = () => {
    this._openingOverflowMenu = false;
  };

  private _overflowMenuClosed = () => {
    // Changing the anchor element fires a close event, ignore that one.
    if (this._openingOverflowMenu) {
      return;
    }

    this._repositoryOverflowMenu.anchorElement = undefined;
  };

  private _downloadRepositoryDialog() {
    showMarketplaceDownloadDialog(this, {
      marketplace: this.marketplace,
      repositoryId: this._repository!.id,
      repository: this._repository!,
    });
  }

  static get styles() {
    return [
      marketplaceStyles,
      css`
        ha-card {
          display: block;
          padding: 16px;
        }
        .content {
          margin: auto;
          padding: 8px;
          max-width: 1536px;
        }

        ha-chip-set {
          padding-bottom: 8px;
        }

        ha-alert {
          display: block;
          margin-bottom: 8px;
        }

        @media all and (max-width: 500px) {
          .content {
            margin: 8px 4px 64px;
            max-width: none;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-marketplace-repository-dashboard": HaMarketplaceRepositoryDashboard;
  }
}
