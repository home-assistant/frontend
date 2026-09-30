import {
  mdiAccount,
  mdiArrowDownBold,
  mdiArrowUpBoldCircleOutline,
  mdiDotsVertical,
  mdiDownload,
  mdiExclamationThick,
  mdiStar,
} from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
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
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-error-screen";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-subpage";
import type { HomeAssistant, Route } from "../../../types";
import { showMarketplaceInstallDialog } from "../dialogs/show-dialog-marketplace-install";
import type { MarketplaceRepositoryMenuItem } from "../components/ha-marketplace-repository-overflow-menu";
import { repositoryMenuItems } from "../components/ha-marketplace-repository-overflow-menu";
import type { MarketplaceData } from "../../../data/marketplace/marketplace";
import type {
  RepositoryBase,
  RepositoryInfo,
  RepositoryType,
} from "../../../data/marketplace/repository";
import {
  addMarketplaceRepository,
  fetchMarketplaceRepositories,
  fetchMarketplaceRepository,
} from "../../../data/marketplace/repository";
import {
  ERROR_WARNING_NOT_ACCEPTED,
  isWebSocketError,
  websocketErrorMessage,
} from "../../../data/marketplace/websocket";
import { haStyle } from "../../../resources/styles";
import {
  ensureGitHubConnected,
  handleGitHubNotConnected,
  handleGitHubRateLimited,
} from "../tools/connect-github";
import { brandsUrl } from "../../../util/brands-url";
import { installBlockedReason } from "../tools/install-blocked-reason";
import { typeIcon } from "../tools/type-icon";
import { markdownWithRepositoryContext } from "../tools/markdown";

// Repository pages live at /<id> below /repository, my links at /repository itself.
const repositoryIdFromRoute = (route: Route): string => route.path.substring(1);

@customElement("ha-marketplace-repository-dashboard")
export class HaMarketplaceRepositoryDashboard extends LitElement {
  @property({ attribute: false }) public marketplace!: MarketplaceData;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public narrow!: boolean;

  @property({ attribute: false }) public route!: Route;

  @state() private _repository?: RepositoryInfo;

  @state() private _error?: string;

  // Answers for a repository navigated away from are dropped.
  // A refresh that failed while the repository is shown, told on top of it
  @state() private _refreshError?: string;

  // Only the newest request counts, also one for the same repository
  private _request = 0;

  protected async firstUpdated(
    changedProperties: PropertyValues<this>
  ): Promise<void> {
    super.firstUpdated(changedProperties);

    const params = extractSearchParamsObject();
    if (params.owner && params.repository) {
      let existing: RepositoryBase | undefined;
      const requestedRepository = `${params.owner}/${params.repository}`;
      existing = this.marketplace.repositories.find(
        (repository) =>
          repository.full_name.toLocaleLowerCase() ===
          requestedRepository.toLocaleLowerCase()
      );
      if (!existing && params.category) {
        if (
          !ensureGitHubConnected(
            this,
            this.hass,
            this.hass.localize,
            this.marketplace.info
          )
        ) {
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
            confirmText: this.hass.localize("ui.common.add"),
            dismissText: this.hass.localize("ui.common.cancel"),
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
          await addMarketplaceRepository(
            this.hass,
            requestedRepository,
            params.category as RepositoryType
          );
          const repositories = await fetchMarketplaceRepositories(this.hass);
          existing = repositories.find(
            (repository) =>
              repository.full_name.toLocaleLowerCase() ===
              requestedRepository.toLocaleLowerCase()
          );
        } catch (err: unknown) {
          // The panel swaps to the warning screen, accepting it brings the
          // user back here to add the repository.
          if (isWebSocketError(err, ERROR_WARNING_NOT_ACCEPTED)) {
            fireEvent(this, "marketplace-refresh");
            return;
          }

          this._error = handleGitHubNotConnected(
            this,
            this.hass,
            this.hass.localize,
            err
          )
            ? this.hass.localize(
                "ui.panel.marketplace.github.add_repository_needs_github",
                { repository: requestedRepository }
              )
            : websocketErrorMessage(err);
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
    this._refreshError = undefined;
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
      this._request++;
      this._error = this.hass.localize(
        "ui.panel.marketplace.dashboard.repository_not_found"
      );
      return;
    }

    this._fetchRepository(repositoryId);
  }

  private async _fetchRepository(repositoryId?: string) {
    const requestedRepositoryId = repositoryId || String(this._repository!.id);
    const request = ++this._request;

    try {
      const repository = await fetchMarketplaceRepository(
        this.hass,
        requestedRepositoryId
      );
      if (!this._isCurrentRequest(request)) {
        return;
      }
      this._repository = repository;
      this._error = undefined;
      this._refreshError = undefined;
    } catch (err: unknown) {
      if (!this._isCurrentRequest(request)) {
        return;
      }

      const message = handleGitHubRateLimited(
        this,
        this.hass,
        this.hass.localize,
        err
      )
        ? this.hass.localize("ui.panel.marketplace.github.rate_limited")
        : websocketErrorMessage(err) ||
          this.hass.localize("ui.panel.marketplace.common.unknown_error");

      if (String(this._repository?.id) === requestedRepositoryId) {
        this._refreshError = message;
      } else {
        this._error = message;
      }
    }
  }

  private _isCurrentRequest(request: number): boolean {
    return this.isConnected && this._request === request;
  }

  private _retry() {
    this._error = undefined;
    this._loadRepositoryFromRoute();
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
      >
        <ha-button appearance="filled" size="s" @click=${this._retry}>
          ${this.hass.localize("ui.panel.marketplace.common.retry")}
        </ha-button>
      </hass-error-screen>`;
    }

    if (!this._repository) {
      return html`<hass-loading-screen
        .hass=${this.hass}
        .narrow=${this.narrow}
      ></hass-loading-screen>`;
    }

    const repository = this._repository;
    const authors = this._getAuthors(repository);
    const readme = markdownWithRepositoryContext(
      repository.additional_info,
      repository
    );

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/marketplace"
        .header=${repository.name}
      >
        <ha-dropdown
          slot="toolbar-icon"
          @wa-select=${this._handleOverflowAction}
        >
          <ha-icon-button
            slot="trigger"
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>
          ${repositoryMenuItems(this, repository, this.hass.localize).map(
            (entry) =>
              "divider" in entry
                ? html`<wa-divider></wa-divider>`
                : html`
                    <ha-dropdown-item
                      .value=${entry.value}
                      variant=${entry.variant || "default"}
                    >
                      <ha-svg-icon
                        .path=${entry.path}
                        slot="icon"
                      ></ha-svg-icon>
                      ${entry.label}
                    </ha-dropdown-item>
                  `
          )}
        </ha-dropdown>
        <div class="content">
          ${
            this._refreshError
              ? html`<ha-alert alert-type="error">
                  ${this._refreshError}
                </ha-alert>`
              : nothing
          }
          ${
            repository.can_install
              ? nothing
              : html`<ha-alert alert-type="warning">
                  ${installBlockedReason(this.hass.localize, repository)}
                </ha-alert>`
          }
          <ha-card outlined>
            <div class="card-content">
              <div class="header">
                ${this._renderIcon(repository)}
                <div class="title">
                  ${this.narrow ? nothing : html`<h1>${repository.name}</h1>`}
                  <div class="version">${this._versionText(repository)}</div>
                </div>
              </div>
              ${
                repository.description
                  ? html`<p class="description">${repository.description}</p>`
                  : nothing
              }
              <ha-chip-set>
                ${authors.map(
                  (author) =>
                    html`<ha-assist-chip
                      href="https://github.com/${author}"
                      target="_blank"
                      .label=${`@${author}`}
                      title=${this.hass.localize("ui.panel.marketplace.repository.author")}
                    >
                      <ha-svg-icon
                        slot="icon"
                        .path=${mdiAccount}
                      ></ha-svg-icon>
                    </ha-assist-chip>`
                )}
                ${
                  repository.downloads
                    ? html`<ha-assist-chip
                        title=${this.hass.localize("ui.panel.marketplace.repository.downloads")}
                        .label=${String(repository.downloads)}
                      >
                        <ha-svg-icon
                          slot="icon"
                          .path=${mdiArrowDownBold}
                        ></ha-svg-icon>
                      </ha-assist-chip>`
                    : nothing
                }
                <ha-assist-chip
                  .label=${String(repository.stars)}
                  title=${this.hass.localize("ui.panel.marketplace.repository.stars")}
                >
                  <ha-svg-icon slot="icon" .path=${mdiStar}></ha-svg-icon>
                </ha-assist-chip>
                <ha-assist-chip
                  href="https://github.com/${repository.full_name}/issues"
                  target="_blank"
                  .label=${String(repository.issues)}
                  title=${this.hass.localize("ui.panel.marketplace.repository.open_issues")}
                >
                  <ha-svg-icon
                    slot="icon"
                    .path=${mdiExclamationThick}
                  ></ha-svg-icon>
                </ha-assist-chip>
              </ha-chip-set>
            </div>
            ${this._renderActions(repository)}
          </ha-card>
          ${
            readme
              ? html`<ha-card class="readme" outlined>
                  <div class="card-content">
                    <ha-markdown .content=${readme} lazy-images></ha-markdown>
                  </div>
                </ha-card>`
              : nothing
          }
        </div>
      </hass-subpage>
    `;
  }

  private _renderIcon(repository: RepositoryInfo) {
    return repository.category === "integration" && repository.domain
      ? html`<img
          class="icon"
          alt=""
          crossorigin="anonymous"
          referrerpolicy="no-referrer"
          src=${brandsUrl(
            {
              domain: repository.domain,
              type: "icon",
              darkOptimized: this.hass.themes?.darkMode,
            },
            this.hass.auth.data.hassUrl
          )}
        />`
      : html`<ha-svg-icon
          class="icon"
          .path=${typeIcon(repository.category)}
        ></ha-svg-icon>`;
  }

  private _versionText(repository: RepositoryInfo): string {
    if (!repository.installed) {
      return this.hass.localize(
        "ui.panel.marketplace.repository.version_available",
        { version: repository.available_version }
      );
    }

    return repository.pending_upgrade
      ? this.hass.localize("ui.panel.marketplace.repository.version_update", {
          installed: repository.installed_version,
          version: repository.available_version,
        })
      : this.hass.localize(
          "ui.panel.marketplace.repository.version_installed",
          { version: repository.installed_version }
        );
  }

  // Like the Install and Update buttons of an app, a reinstall stays in the menu
  private _renderActions(repository: RepositoryInfo) {
    if (repository.installed && !repository.pending_upgrade) {
      return nothing;
    }

    return html`<div class="card-actions">
      <ha-button appearance="filled" @click=${this._installRepositoryDialog}>
        <ha-svg-icon
          slot="start"
          .path=${repository.installed ? mdiArrowUpBoldCircleOutline : mdiDownload}
        ></ha-svg-icon>
        ${this.hass.localize(
          repository.installed
            ? "ui.common.update"
            : "ui.panel.marketplace.common.install"
        )}
      </ha-button>
    </div>`;
  }

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

  private _installRepositoryDialog() {
    showMarketplaceInstallDialog(this, {
      marketplace: this.marketplace,
      repositoryId: String(this._repository!.id),
      repository: this._repository!,
    });
  }

  static get styles() {
    return [
      haStyle,
      css`
        .content {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-4);
          margin: auto;
          padding: var(--ha-space-4);
          max-width: 1200px;
        }
        .header {
          display: flex;
          align-items: center;
          gap: var(--ha-space-4);
        }
        .icon {
          width: 48px;
          height: 48px;
          flex: none;
          --mdc-icon-size: 48px;
          color: var(--secondary-text-color);
        }
        h1 {
          margin: 0;
          font-size: var(--ha-font-size-2xl);
          font-weight: var(--ha-font-weight-normal);
          line-height: var(--ha-line-height-condensed);
        }
        .version {
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-s);
        }
        .description {
          margin-block: var(--ha-space-4) 0;
        }
        ha-chip-set {
          margin-block-start: var(--ha-space-4);
        }
        .card-actions {
          display: flex;
          justify-content: flex-end;
          gap: var(--ha-space-2);
        }
        .readme {
          direction: ltr;
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
