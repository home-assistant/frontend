import type { ContextType } from "@lit/context";
import {
  mdiAccountGroup,
  mdiAlertCircleOutline,
  mdiArrowUpBoldCircleOutline,
  mdiBug,
  mdiCheckCircle,
  mdiCheckCircleOutline,
  mdiDotsVertical,
  mdiDownload,
  mdiGithub,
  mdiRestart,
  mdiStar,
  mdiUpdate,
} from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { relativeTime } from "../../../common/datetime/relative_time";
import { consume } from "../../../common/decorators/consume";
import { transform } from "../../../common/decorators/transform";
import { fireEvent } from "../../../common/dom/fire_event";
import { formatNumber } from "../../../common/number/format_number";
import { extractSearchParamsObject } from "../../../common/url/search-params";
import { deepEqual } from "../../../common/util/deep-equal";
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
import { getConfigEntries } from "../../../data/config_entries";
import {
  apiContext,
  configContext,
  internationalizationContext,
  statesContext,
  uiContext,
} from "../../../data/context";
import { showConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-config-flow";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import { showRestartDialog } from "../../../dialogs/restart/show-dialog-restart";
import "../../../layouts/hass-error-screen";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-subpage";
import type {
  HomeAssistantConfig,
  HomeAssistantUI,
  Route,
} from "../../../types";
import { showMarketplaceInstallDialog } from "../dialogs/show-dialog-marketplace-install";
import type { MarketplaceRepositoryMenuItem } from "../components/ha-marketplace-repository-overflow-menu";
import {
  renderRepositoryMenuEntry,
  repositoryMenuItems,
} from "../components/ha-marketplace-repository-overflow-menu";
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
  ERROR_GITHUB_RATE_LIMITED,
  ERROR_WARNING_NOT_ACCEPTED,
  isWebSocketError,
  marketplaceErrorMessage,
} from "../../../data/marketplace/websocket";
import { mdiHomeAssistant } from "../../../resources/home-assistant-logo-svg";
import { haStyle } from "../../../resources/styles";
import {
  ensureGitHubConnected,
  handleGitHubNotConnected,
  handleGitHubRateLimited,
} from "../tools/connect-github";
import { brandsUrl } from "../../../util/brands-url";
import { generateFrontendResourceURL } from "../tools/frontend-resource";
import { installBlockedReason } from "../tools/install-blocked-reason";
import { typeIcon } from "../tools/type-icon";
import { isCommunityOrganization, repositoryAuthors } from "../tools/authors";
import {
  markdownWithRepositoryContext,
  repositoryUrl,
} from "../tools/markdown";

// Repository pages live at /<id> below /repository, my links at /repository itself.
const repositoryIdFromRoute = (route: Route): string => route.path.substring(1);

interface NextStep {
  detail?: string;
  action?: TemplateResult;
  extra?: TemplateResult;
}

interface RepositoryStatus extends NextStep {
  kind: "available" | "update" | "restart" | "installed";
  icon: string;
  title: string;
}

// GitHub names are not case sensitive, a My link may spell one differently
const findRepository = (
  repositories: RepositoryBase[],
  fullName: string
): RepositoryBase | undefined =>
  repositories.find(
    (repository) =>
      repository.full_name.toLocaleLowerCase() === fullName.toLocaleLowerCase()
  );

@customElement("ha-marketplace-repository-dashboard")
export class HaMarketplaceRepositoryDashboard extends LitElement {
  @property({ attribute: false }) public marketplace!: MarketplaceData;

  @property({ attribute: false }) public narrow!: boolean;

  @property({ attribute: false }) public route!: Route;

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

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  @state() private _repository?: RepositoryInfo;

  @state() private _error?: string;

  // Answers for a repository navigated away from are dropped.
  // A refresh that failed while the repository is shown, told on top of it
  @state() private _refreshError?: string;

  // How many config entries the installed integration has, once known
  @state() private _configEntryCount?: number;

  // Only the newest request counts, also one for the same repository
  private _request = 0;

  protected async firstUpdated(
    changedProperties: PropertyValues<this>
  ): Promise<void> {
    super.firstUpdated(changedProperties);
    await this._loadRepository();
  }

  // A My link names the repository in the query, the panel in the path
  private async _loadRepository(): Promise<void> {
    const params = extractSearchParamsObject();
    if (!params.owner || !params.repository) {
      this._loadRepositoryFromRoute();
      return;
    }

    await this._loadRepositoryFromMyLink(
      `${params.owner}/${params.repository}`,
      params.category as RepositoryType | undefined
    );
  }

  // A My link names the repository, one the Marketplace does not know yet is
  // added first when the link also names its category.
  private async _loadRepositoryFromMyLink(
    requestedRepository: string,
    category?: RepositoryType
  ): Promise<void> {
    // Going to another repository meanwhile makes this one old news
    const request = ++this._request;
    let existing = findRepository(
      this.marketplace.repositories,
      requestedRepository
    );

    if (!existing && category) {
      if (
        !ensureGitHubConnected(
          this,
          this._api,
          this._i18n.localize,
          this.marketplace.info
        )
      ) {
        this._error = this._i18n.localize(
          "ui.panel.marketplace.github.add_repository_needs_github",
          { repository: requestedRepository }
        );
        return;
      }

      const confirmed = await showConfirmationDialog(this, {
        title: this._i18n.localize(
          "ui.panel.marketplace.my.add_repository_title"
        ),
        text: this._i18n.localize(
          "ui.panel.marketplace.my.add_repository_description",
          { repository: requestedRepository }
        ),
        confirmText: this._i18n.localize("ui.common.add"),
        dismissText: this._i18n.localize("ui.common.cancel"),
      });
      if (!this._isCurrentRequest(request)) {
        return;
      }
      if (!confirmed) {
        this._error = this._i18n.localize(
          "ui.panel.marketplace.my.repository_not_found",
          { repository: requestedRepository }
        );
        return;
      }

      try {
        await addMarketplaceRepository(
          this._api,
          requestedRepository,
          category
        );
        existing = findRepository(
          await fetchMarketplaceRepositories(this._api),
          requestedRepository
        );
      } catch (err: unknown) {
        if (!this._isCurrentRequest(request)) {
          return;
        }

        // The panel swaps to the warning screen, accepting it brings the
        // user back here to add the repository.
        if (isWebSocketError(err, ERROR_WARNING_NOT_ACCEPTED)) {
          fireEvent(this, "marketplace-refresh");
          return;
        }

        this._error = handleGitHubNotConnected(
          this,
          this._api,
          this._i18n.localize,
          err
        )
          ? this._i18n.localize(
              "ui.panel.marketplace.github.add_repository_needs_github",
              { repository: requestedRepository }
            )
          : marketplaceErrorMessage(err, this._i18n.localize);
        return;
      }
    }

    if (!this._isCurrentRequest(request)) {
      return;
    }

    if (!existing) {
      this._error = this._i18n.localize(
        "ui.panel.marketplace.my.repository_not_found",
        { repository: requestedRepository }
      );
      return;
    }

    this._fetchRepository(existing.id);
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
      this._fetchRepository(undefined, { background: true });
    }
  }

  // The list does not carry the fields only this page shows, those need a fetch
  public reloadRepository(): void {
    this._fetchRepository();
  }

  private _loadRepositoryFromRoute(): void {
    const repositoryId = repositoryIdFromRoute(this.route);
    if (!repositoryId) {
      this._request++;
      this._error = this._i18n.localize(
        "ui.panel.marketplace.dashboard.repository_not_found"
      );
      return;
    }

    this._fetchRepository(repositoryId);
  }

  private async _fetchRepository(
    repositoryId?: string,
    { background = false }: { background?: boolean } = {}
  ) {
    const requestedRepositoryId = repositoryId || this._repository!.id;
    const request = ++this._request;

    try {
      const repository = await fetchMarketplaceRepository(
        this._api,
        requestedRepositoryId
      );
      if (!this._isCurrentRequest(request)) {
        return;
      }
      this._repository = repository;
      this._error = undefined;
      this._refreshError = undefined;
      this._loadConfigEntryCount(repository);
    } catch (err: unknown) {
      if (!this._isCurrentRequest(request)) {
        return;
      }

      // A refetch on a signal comes without the user doing anything, only
      // what they asked for may open the dialog to connect GitHub
      const rateLimited = background
        ? isWebSocketError(err, ERROR_GITHUB_RATE_LIMITED)
        : handleGitHubRateLimited(this, this._api, this._i18n.localize, err);
      const message = rateLimited
        ? this._i18n.localize("ui.panel.marketplace.github.rate_limited")
        : marketplaceErrorMessage(err, this._i18n.localize);

      if (this._repository?.id === requestedRepositoryId) {
        this._refreshError = message;
      } else {
        this._error = message;
      }
    }
  }

  private async _loadConfigEntryCount(repository: RepositoryInfo) {
    this._configEntryCount = undefined;
    if (
      repository.category !== "integration" ||
      !repository.installed ||
      !repository.domain
    ) {
      return;
    }

    let count = 0;
    try {
      count = (await getConfigEntries(this._api, { domain: repository.domain }))
        .length;
    } catch (_err: unknown) {
      // Counted as none, the setup flow tells when it is set up already
    }
    if (this._repository === repository) {
      this._configEntryCount = count;
    }
  }

  private _isCurrentRequest(request: number): boolean {
    return this.isConnected && this._request === request;
  }

  private _retry() {
    this._error = undefined;
    this._loadRepository();
  }

  // Most renders of the page leave the README as it was
  private _readme = memoizeOne(markdownWithRepositoryContext);

  // The same function while the repository stays, a new one renders it again
  private _readmeUrl = memoizeOne(repositoryUrl);

  private _getAuthors = memoizeOne((repository: RepositoryInfo) =>
    repositoryAuthors(repository).filter(
      (author) => !isCommunityOrganization(author)
    )
  );

  protected render(): TemplateResult {
    if (this._error) {
      return html`<hass-error-screen
        .narrow=${this.narrow}
        .error=${this._error}
      >
        <ha-button appearance="filled" size="s" @click=${this._retry}>
          ${this._i18n.localize("ui.panel.marketplace.common.retry")}
        </ha-button>
      </hass-error-screen>`;
    }

    if (!this._repository) {
      return html`<hass-loading-screen
        .narrow=${this.narrow}
      ></hass-loading-screen>`;
    }

    const repository = this._repository;
    const readme = this._readme(repository.additional_info, repository);

    return html`
      <hass-subpage
        .narrow=${this.narrow}
        back-path="/marketplace"
        .header=${this._i18n.localize("ui.panel.marketplace.title")}
      >
        <ha-dropdown
          slot="toolbar-icon"
          @wa-select=${this._handleOverflowAction}
        >
          <ha-icon-button
            slot="trigger"
            .label=${this._i18n.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>
          ${repositoryMenuItems(
            this,
            this._api,
            repository,
            this._i18n.localize
          ).map(renderRepositoryMenuEntry)}
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
                  ${installBlockedReason(this._i18n.localize, repository)}
                  ${this._i18n.localize(
                    "ui.panel.marketplace.repository.earlier_version_hint"
                  )}
                </ha-alert>`
          }
          ${this._renderSummary(repository)}
          <div class="cards">
            ${this._renderCommunity(repository)}
            ${this._renderDetails(repository)}
          </div>
          ${
            readme
              ? html`<ha-card class="readme" outlined>
                  <div class="card-content">
                    <ha-markdown
                      .content=${readme}
                      .rewriteUrl=${this._readmeUrl(repository)}
                      lazy-images
                    ></ha-markdown>
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
              darkOptimized: this._darkMode,
            },
            this._hassUrl
          )}
        />`
      : html`<ha-svg-icon
          class="icon"
          .path=${typeIcon(repository.category)}
        ></ha-svg-icon>`;
  }

  private _renderSummary(repository: RepositoryInfo) {
    return html`<ha-card outlined class="summary">
      <div class="card-content">
        <div class="header">
          ${this._renderIcon(repository)}
          <div class="title">
            <h1>${repository.name}</h1>
            <div class="type">
              ${this._i18n.localize(
                `ui.panel.marketplace.common.type.${repository.category}`
              )}
            </div>
          </div>
        </div>
        ${
          repository.description
            ? html`<p class="description">${repository.description}</p>`
            : nothing
        }
      </div>
      ${this._renderStatus(repository)}
    </ha-card>`;
  }

  // Where it stands, and the one thing to do next
  private _renderStatus(repository: RepositoryInfo) {
    const status = this._status(repository);

    return html`<div class="status ${status.kind}">
      <ha-svg-icon class="status-icon" .path=${status.icon}></ha-svg-icon>
      <div class="status-text">
        <span class="status-title">${status.title}</span>
        ${
          status.detail
            ? html`<span class="status-detail">${status.detail}</span>`
            : nothing
        }
        ${status.extra ?? nothing}
      </div>
      ${status.action ?? nothing}
    </div>`;
  }

  private _status(repository: RepositoryInfo): RepositoryStatus {
    const localize = this._i18n.localize;
    const name = repository.name;

    if (!repository.installed) {
      return {
        kind: "available",
        icon: mdiDownload,
        title: localize("ui.panel.marketplace.repository.status.not_installed"),
        detail: localize("ui.panel.marketplace.repository.status.available", {
          version: repository.available_version,
        }),
        action: this._installButton(
          mdiDownload,
          localize("ui.panel.marketplace.common.install")
        ),
      };
    }

    // Installing and updating are the main actions, a reinstall stays in the menu
    if (repository.pending_upgrade) {
      return {
        kind: "update",
        icon: mdiArrowUpBoldCircleOutline,
        title: localize(
          "ui.panel.marketplace.repository.status.update_available"
        ),
        detail: localize("ui.panel.marketplace.repository.version_update", {
          installed: repository.installed_version,
          version: repository.available_version,
        }),
        action: this._installButton(
          mdiArrowUpBoldCircleOutline,
          localize("ui.common.update"),
          this._update
        ),
      };
    }

    if (repository.status === "pending-restart") {
      return {
        kind: "restart",
        icon: mdiRestart,
        title: localize(
          "ui.panel.marketplace.repository.status.pending_restart"
        ),
        detail: localize("ui.panel.marketplace.repository.next_step.restart", {
          name,
        }),
        action: html`<ha-button appearance="filled" @click=${this._restart}>
          ${localize("ui.panel.marketplace.repository.next_step.restart_button")}
        </ha-button>`,
      };
    }

    return {
      kind: "installed",
      icon: mdiCheckCircle,
      title: localize("ui.panel.marketplace.repository.version_installed", {
        version: repository.installed_version,
      }),
      ...this._nextStep(repository),
    };
  }

  private _installButton(
    icon: string,
    label: string,
    handler: () => void = this._installRepositoryDialog
  ) {
    return html`<ha-button appearance="filled" @click=${handler}>
      <ha-svg-icon slot="start" .path=${icon}></ha-svg-icon>
      ${label}
    </ha-button>`;
  }

  // Once it is installed, what to do with it depends on what it is
  private _nextStep(repository: RepositoryInfo): NextStep {
    const localize = this._i18n.localize;
    const name = repository.name;

    switch (repository.category) {
      case "integration":
        return this._integrationNextStep(repository);
      case "plugin":
        return this.marketplace.info.lovelace_mode === "storage"
          ? {
              detail: localize(
                "ui.panel.marketplace.repository.next_step.plugin",
                { name }
              ),
            }
          : {
              detail: localize(
                "ui.panel.marketplace.dialog_install.lovelace_instruction"
              ),
              extra: html`<pre class="frontend-resource">
url: ${generateFrontendResourceURL({
                  repository,
                  version:
                    repository.installed_version ||
                    repository.available_version,
                })}
type: module</pre>`,
            };
      case "theme":
        return {
          detail: localize("ui.panel.marketplace.repository.next_step.theme", {
            name,
          }),
          action: html`<ha-button appearance="filled" href="/profile">
            ${localize("ui.panel.marketplace.repository.next_step.open_profile")}
          </ha-button>`,
        };
      default:
        return {
          detail: localize(
            "ui.panel.marketplace.repository.next_step.template",
            { name }
          ),
        };
    }
  }

  private _integrationNextStep(repository: RepositoryInfo): NextStep {
    const localize = this._i18n.localize;
    const name = repository.name;

    if (!repository.config_flow) {
      return {
        detail: localize(
          "ui.panel.marketplace.repository.next_step.integration_without_set_up",
          { name }
        ),
      };
    }

    // Offering to set it up before the count is known would flip over
    if (this._configEntryCount === undefined) {
      return {};
    }

    if (this._configEntryCount > 0) {
      return {
        detail: localize(
          "ui.panel.marketplace.repository.next_step.integration_set_up",
          { name }
        ),
        action: html`<ha-button
          appearance="filled"
          href="/config/integrations/integration/${repository.domain}"
        >
          ${localize("ui.panel.marketplace.repository.next_step.open_integration")}
        </ha-button>`,
      };
    }

    return {
      detail: localize(
        "ui.panel.marketplace.repository.next_step.integration_to_set_up",
        { name }
      ),
      action: html`<ha-button appearance="filled" @click=${this._setUp}>
        ${localize("ui.panel.marketplace.repository.next_step.set_up")}
      </ha-button>`,
    };
  }

  // Who made it, not Home Assistant, and where its code and issues are
  private _renderCommunity(repository: RepositoryInfo) {
    const localize = this._i18n.localize;
    const authors = this._getAuthors(repository);
    const github = `https://github.com/${repository.full_name}`;

    return html`<ha-card outlined class="community">
      <div class="card-content">
        <div class="card-heading">
          <div class="badge">
            <ha-svg-icon .path=${mdiAccountGroup}></ha-svg-icon>
          </div>
          <h2>
            ${localize("ui.panel.marketplace.repository.community.title")}
          </h2>
        </div>
        <p>
          ${
            authors.length
              ? localize("ui.panel.marketplace.repository.community.made_by", {
                  authors: this._authorLinks(authors),
                  count: authors.length,
                })
              : localize(
                  "ui.panel.marketplace.repository.community.made_by_community"
                )
          }
        </p>
      </div>
      <div class="card-actions">
        <ha-button
          appearance="plain"
          href=${github}
          target="_blank"
          rel="noreferrer"
        >
          <ha-svg-icon slot="start" .path=${mdiGithub}></ha-svg-icon>
          ${localize("ui.panel.marketplace.repository.details.source_code")}
        </ha-button>
        <ha-button
          appearance="plain"
          href=${`${github}/issues`}
          target="_blank"
          rel="noreferrer"
        >
          <ha-svg-icon slot="start" .path=${mdiBug}></ha-svg-icon>
          ${localize("ui.panel.marketplace.repository.details.issue_tracker")}
        </ha-button>
      </div>
    </ha-card>`;
  }

  // Authors are GitHub accounts, listed the way the language lists names
  private _authorLinks(authors: string[]) {
    return html`${new Intl.ListFormat(this._i18n.locale.language, {
      style: "long",
      type: "conjunction",
    })
      .formatToParts(authors)
      .map((part) =>
        part.type === "element"
          ? html`<a
              href="https://github.com/${part.value}"
              target="_blank"
              rel="noreferrer"
              >${part.value}</a
            >`
          : part.value
      )}`;
  }

  // What is known about how it is doing
  private _renderDetails(repository: RepositoryInfo) {
    return html`<ha-card outlined class="details">
      <div class="card-content">
        <ul class="signals">
          ${this._signals(repository).map(
            (signal) =>
              html`<li>
                <ha-svg-icon .path=${signal.icon}></ha-svg-icon>
                <span>${signal.text}</span>
              </li>`
          )}
        </ul>
      </div>
    </ha-card>`;
  }

  private _signals(
    repository: RepositoryInfo
  ): { icon: string; text: string }[] {
    const localize = this._i18n.localize;
    const locale = this._i18n.locale;
    const signals: { icon: string; text: string }[] = [];

    if (repository.homeassistant) {
      signals.push({
        icon: mdiHomeAssistant,
        text: localize("ui.panel.marketplace.repository.details.requires", {
          version: html`<strong>${repository.homeassistant}</strong>`,
        }),
      });
    }
    const lastChange = this._relativeTime(repository.last_updated);
    if (lastChange) {
      signals.push({
        icon: mdiUpdate,
        text: localize(
          "ui.panel.marketplace.repository.community.last_change",
          {
            time: html`<strong>${lastChange}</strong>`,
          }
        ),
      });
    }
    if (repository.downloads) {
      signals.push({
        icon: mdiDownload,
        text: localize("ui.panel.marketplace.repository.community.downloads", {
          number: repository.downloads,
          count: html`<strong
            >${formatNumber(repository.downloads, locale)}</strong
          >`,
        }),
      });
    }
    signals.push({
      icon: mdiStar,
      text: localize("ui.panel.marketplace.repository.community.stars", {
        number: repository.stars,
        count: html`<strong>${formatNumber(repository.stars, locale)}</strong>`,
      }),
    });
    signals.push(
      repository.issues
        ? {
            icon: mdiAlertCircleOutline,
            text: localize(
              "ui.panel.marketplace.repository.community.open_issues",
              {
                number: repository.issues,
                count: html`<strong
                  >${formatNumber(repository.issues, locale)}</strong
                >`,
              }
            ),
          }
        : {
            icon: mdiCheckCircleOutline,
            text: localize(
              "ui.panel.marketplace.repository.community.no_open_issues"
            ),
          }
    );

    return signals;
  }

  private _relativeTime(value: string | number): string | undefined {
    if (!value) {
      return undefined;
    }
    try {
      return relativeTime(new Date(value), this._i18n.locale);
    } catch {
      return undefined;
    }
  }

  // Updates are installed from their update entity everywhere else too, the
  // install dialog is for when there is none
  private _update() {
    const entityId = this._repository!.update_entity_id;

    if (entityId && this._states[entityId]) {
      fireEvent(this, "hass-more-info", { entityId });
      return;
    }

    this._installRepositoryDialog();
  }

  private _restart() {
    showRestartDialog(this);
  }

  private _setUp() {
    showConfigFlowDialog(this, {
      startFlowHandler: this._repository!.domain!,
      navigateToResult: true,
    });
  }

  private _handleOverflowAction = (ev: HaDropdownSelectEvent) => {
    if (!this._repository) {
      return;
    }

    repositoryMenuItems(this, this._api, this._repository, this._i18n.localize)
      .filter(
        (entry): entry is MarketplaceRepositoryMenuItem => "value" in entry
      )
      .find((entry) => entry.value === ev.detail.item.value)
      ?.action();
  };

  private _installRepositoryDialog() {
    showMarketplaceInstallDialog(this, {
      marketplace: this.marketplace,
      repositoryId: this._repository!.id,
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
        .type {
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-s);
        }
        .description {
          margin-block: var(--ha-space-4) 0;
        }
        .status {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: var(--ha-space-3) var(--ha-space-4);
          padding: var(--ha-space-3) var(--ha-space-4);
          border-top: var(--ha-border-width-sm) solid var(--divider-color);
        }
        .status-icon {
          flex: none;
          color: var(--primary-color);
        }
        .status.installed .status-icon {
          color: var(--success-color);
        }
        .status.restart .status-icon {
          color: var(--warning-color);
        }
        .status-text {
          display: flex;
          flex: 1 1 240px;
          flex-direction: column;
          gap: var(--ha-space-1);
          min-width: 0;
        }
        .status-title {
          font-weight: var(--ha-font-weight-medium);
        }
        .status-detail {
          color: var(--secondary-text-color);
        }
        .status pre {
          direction: ltr;
          margin: var(--ha-space-1) 0 0;
          padding: var(--ha-space-2) var(--ha-space-3);
          overflow-x: auto;
          border-radius: var(--ha-border-radius-md);
          background-color: var(--secondary-background-color);
        }
        .cards {
          display: grid;
          grid-template-columns: repeat(
            auto-fit,
            minmax(min(100%, 320px), 1fr)
          );
          gap: var(--ha-space-4);
        }
        .card-heading {
          display: flex;
          align-items: center;
          gap: var(--ha-space-3);
        }
        .badge {
          display: flex;
          flex: none;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: var(--ha-border-radius-circle);
          color: var(--warning-color);
          background-color: rgba(var(--rgb-warning-color), 0.2);
        }
        h2 {
          margin: 0;
          font-size: var(--ha-font-size-l);
          font-weight: var(--ha-font-weight-medium);
        }
        .community p {
          margin-block: var(--ha-space-3) 0;
        }
        .signals {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-2);
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .signals li {
          display: flex;
          align-items: center;
          gap: var(--ha-space-2);
        }
        .signals ha-svg-icon {
          flex: none;
          --mdc-icon-size: 20px;
          color: var(--secondary-text-color);
        }
        /* Stretched to the height of the card next to it, the actions at the bottom */
        .community {
          display: flex;
          flex-direction: column;
        }
        .community .card-content {
          flex: 1;
        }
        /* Centred in the height the card next to it sets, not left hanging */
        .details {
          display: flex;
          flex-direction: column;
        }
        .details .card-content {
          display: flex;
          flex: 1;
        }
        .details .signals {
          flex: 1;
          gap: var(--ha-space-3);
          justify-content: center;
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
