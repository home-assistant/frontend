import type { ContextType } from "@lit/context";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { consume } from "../../../common/decorators/consume";
import type { HASSDomTargetEvent } from "../../../common/dom/fire_event";
import { navigate } from "../../../common/navigate";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-checkbox";
import type { HaCheckbox } from "../../../components/ha-checkbox";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-select";
import type {
  HaSelectOption,
  HaSelectSelectEvent,
} from "../../../components/ha-select";
import "../../../components/ha-spinner";
import "../../../components/progress/ha-progress-bar";

import { relativeTime } from "../../../common/datetime/relative_time";
import { formatListWithAnds } from "../../../common/string/format-list";
import {
  apiContext,
  connectionContext,
  internationalizationContext,
} from "../../../data/context";
import { DialogMixin } from "../../../dialogs/dialog-mixin";
import { showConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-config-flow";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import type {
  MarketplaceRelease,
  RepositoryInfo,
} from "../../../data/marketplace/repository";
import {
  fetchMarketplaceRepository,
  installMarketplaceRepository,
  fetchMarketplaceRepositoryReleases,
} from "../../../data/marketplace/repository";
import {
  marketplaceErrorMessage,
  websocketErrorMessage,
  subscribeMarketplaceInstallProgress,
} from "../../../data/marketplace/websocket";
import { repositoryAuthors } from "../tools/authors";
import { handleGitHubRateLimited } from "../tools/connect-github";
import { installBlockedReason } from "../tools/install-blocked-reason";
import { generateFrontendResourceURL } from "../tools/frontend-resource";
import type { MarketplaceInstallDialogParams } from "./show-dialog-marketplace-install";

@customElement("dialog-marketplace-install")
export class DialogMarketplaceInstall extends DialogMixin<MarketplaceInstallDialogParams>(
  LitElement
) {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: connectionContext, subscribe: true })
  private _connection!: ContextType<typeof connectionContext>;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @state() private _installing = false;

  // What the backend reports while installing, unknown until its first step
  @state() private _progress?: number;

  @state() private _error?: string;

  @state() private _releasesFailed = false;

  @state() private _releases?: MarketplaceRelease[];

  @state() private _repository?: RepositoryInfo;

  @state() private _selectedVersion?: string;

  @state() private _replacementAccepted = false;

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.params) {
      this._load(this.params);
    }
  }

  private async _load(params: MarketplaceInstallDialogParams): Promise<void> {
    this._replacementAccepted = false;
    if (params.repository) {
      this._repository = params.repository;
    } else {
      await this._fetchRepository(params.repositoryId);
    }

    // The dialog can be closed while the repository information loads.
    if (!this.isConnected) {
      return;
    }

    if (this._repository && this._repository.version_or_commit !== "commit") {
      this._selectedVersion =
        (params.reinstall && this._repository.installed_version) ||
        this._repository.available_version;
    }

    if (this._repository && this._choosingVersion(this._repository)) {
      await this._loadReleases();
    }
  }

  // The newest version can need a newer Home Assistant, an earlier one is
  // then the only way to install it.
  private _choosingVersion(repository: RepositoryInfo): boolean {
    return (
      this._selectedVersion !== undefined &&
      (this.params!.chooseVersion === true || !repository.can_install)
    );
  }

  // Answers for a closed dialog, or for another repository, are dropped.
  private _isShowing(repository: RepositoryInfo): boolean {
    return this.isConnected && this._repository === repository;
  }

  private _getAuthors = memoizeOne(repositoryAuthors);

  private async _fetchRepository(repositoryId: string) {
    let repository: RepositoryInfo;
    try {
      repository = await fetchMarketplaceRepository(this._api, repositoryId);
    } catch (err) {
      if (!this.isConnected) {
        return;
      }

      this._error = handleGitHubRateLimited(
        this,
        this._api,
        this._i18n.localize,
        err
      )
        ? this._i18n.localize("ui.panel.marketplace.github.rate_limited")
        : marketplaceErrorMessage(err, this._i18n.localize);
      return;
    }

    if (this.isConnected) {
      this._repository = repository;
    }
  }

  protected render() {
    if (!this.params) {
      return nothing;
    }

    // One dialog for all states: swapping it out while loading makes the
    // removed one report a close, which closes the whole dialog.
    return html`
      <ha-dialog open .headerTitle=${this._headerTitle()}>
        ${
          this._repository
            ? this._renderInstall(this._repository)
            : this._error
              ? this._renderLoadError(this._error)
              : html`<div class="loading">
                  <ha-spinner></ha-spinner>
                </div>`
        }
      </ha-dialog>
    `;
  }

  private _headerTitle(): string {
    if (this._repository) {
      return this._repository.name;
    }

    return this._i18n.localize(
      this._error
        ? "ui.panel.marketplace.dialog.error.title"
        : "ui.panel.marketplace.dialog_install.loading"
    );
  }

  private _renderLoadError(error: string) {
    return html`
      <ha-alert alert-type="error">${error}</ha-alert>
      <ha-dialog-footer slot="footer">
        <ha-button
          slot="secondaryAction"
          appearance="plain"
          @click=${this.closeDialog}
        >
          ${this._i18n.localize("ui.common.cancel")}
        </ha-button>
      </ha-dialog-footer>
    `;
  }

  private _replacementAcceptedChanged(ev: HASSDomTargetEvent<HaCheckbox>) {
    this._replacementAccepted = ev.target.checked;
  }

  private _renderInstall(repository: RepositoryInfo) {
    const needsAcceptance =
      repository.replaces_built_in &&
      !repository.installed &&
      !this._replacementAccepted;
    // Home Assistant can be too old for the newest version, not for an older one
    const tooNew =
      !repository.can_install &&
      (this._selectedVersion ?? repository.available_version) ===
        repository.available_version;
    const version = this._selectedVersion || repository.available_version;
    const reinstalling =
      repository.installed && version === repository.installed_version;

    return html`
      ${this._renderInstallAlerts(repository, tooNew)}
      ${this._renderInstallContent(repository, version, reinstalling)}
      ${this._renderInstallFooter(
        repository,
        reinstalling,
        this._installing || tooNew || needsAcceptance
      )}
    `;
  }

  private _renderInstallAlerts(repository: RepositoryInfo, tooNew: boolean) {
    return html`
      ${
        this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : nothing
      }
      ${
        repository.replaces_built_in
          ? html`<ha-alert
              class="replaces-built-in"
              alert-type="error"
              .title=${this._i18n.localize(
                "ui.panel.marketplace.dialog_install.replaces_built_in_title",
                { domain: repository.domain }
              )}
            >
              ${this._i18n.localize(
                "ui.panel.marketplace.dialog_install.replaces_built_in_warning",
                { repository: repository.name, domain: repository.domain }
              )}
              ${
                repository.installed
                  ? nothing
                  : html`<ha-checkbox
                      .checked=${this._replacementAccepted}
                      @change=${this._replacementAcceptedChanged}
                    >
                      ${this._i18n.localize(
                        "ui.panel.marketplace.dialog_install.replaces_built_in_confirm"
                      )}
                    </ha-checkbox>`
              }
            </ha-alert>`
          : nothing
      }
      ${
        tooNew
          ? html`<ha-alert alert-type="warning">
              ${installBlockedReason(this._i18n.localize, repository)}
              ${this._i18n.localize(
                "ui.panel.marketplace.dialog_install.older_version_hint"
              )}
            </ha-alert>`
          : nothing
      }
      ${
        repository.installed
          ? nothing
          : html`<ha-alert
              alert-type="warning"
              .title=${this._i18n.localize(
                "ui.panel.marketplace.dialog_install.new_install_title"
              )}
            >
              ${this._i18n.localize(
                "ui.panel.marketplace.dialog_install.new_install_warning",
                {
                  repository: repository.name,
                  authors: formatListWithAnds(
                    this._i18n.locale,
                    this._getAuthors(repository)
                  ),
                }
              )}
            </ha-alert>`
      }
    `;
  }

  private _renderInstallContent(
    repository: RepositoryInfo,
    version: string,
    reinstalling: boolean
  ) {
    return html`
      <div class="content">
        ${
          this._installing
            ? html`<ha-progress-bar
                .value=${this._progress ?? 0}
                .indeterminate=${this._progress === undefined}
                .loading=${this._progress !== undefined}
              ></ha-progress-bar>`
            : nothing
        }
        <p>
          ${
            reinstalling
              ? this._i18n.localize(
                  "ui.panel.marketplace.dialog_install.reinstall_intro",
                  { name: repository.name, version }
                )
              : repository.installed
                ? this._i18n.localize(
                    "ui.panel.marketplace.dialog_install.update_intro",
                    {
                      name: repository.name,
                      installed: repository.installed_version,
                      version,
                    }
                  )
                : this._i18n.localize(
                    "ui.panel.marketplace.dialog_install.install_intro",
                    { name: repository.name, version }
                  )
          }
        </p>
        ${
          // A first installation can often be set up right away, an update runs
          // the old code until Home Assistant restarts
          repository.category === "integration" && repository.installed
            ? html`<p>
                ${this._i18n.localize("ui.panel.marketplace.dialog_install.restart")}
              </p>`
            : nothing
        }
        ${
          repository.category === "plugin" &&
          this.params!.marketplace.info.lovelace_mode !== "storage"
            ? html`
                <p>
                  ${this._i18n.localize("ui.panel.marketplace.dialog_install.lovelace_instruction")}
                </p>
                <pre class="frontend-resource">
              url: ${generateFrontendResourceURL({
                    repository,
                    version:
                      this._selectedVersion || repository.available_version,
                  })}
              type: module
              </pre>
              `
            : nothing
        }
        ${this._choosingVersion(repository) ? this._renderVersions() : nothing}
      </div>
    `;
  }

  private _renderInstallFooter(
    repository: RepositoryInfo,
    reinstalling: boolean,
    disabled: boolean
  ) {
    return html`
      <ha-dialog-footer slot="footer">
        <ha-button
          slot="secondaryAction"
          appearance="plain"
          @click=${this.closeDialog}
        >
          ${this._i18n.localize(
            // Closing does not stop an install that runs
            this._installing ? "ui.common.close" : "ui.common.cancel"
          )}
        </ha-button>
        <ha-button
          slot="primaryAction"
          appearance="filled"
          .loading=${this._installing}
          ?disabled=${disabled}
          @click=${this._installRepository}
        >
          ${this._i18n.localize(
            reinstalling
              ? "ui.panel.marketplace.repository_menu.reinstall"
              : repository.installed
                ? "ui.common.update"
                : "ui.panel.marketplace.common.install"
          )}
        </ha-button>
      </ha-dialog-footer>
    `;
  }

  private _renderVersions() {
    return html`<div class="versions">
      <p>
        ${this._i18n.localize(
          "ui.panel.marketplace.dialog_install.release_warning"
        )}
      </p>
      ${
        this._releasesFailed
          ? html`${this._i18n.localize(
                "ui.panel.marketplace.dialog_install.releases_failed"
              )}
              <ha-button appearance="plain" @click=${this._loadReleases}>
                ${this._i18n.localize("ui.panel.marketplace.common.retry")}
              </ha-button>`
          : this._releases === undefined
            ? this._i18n.localize(
                "ui.panel.marketplace.dialog_install.fetching_releases"
              )
            : this._releases.length === 0
              ? this._i18n.localize(
                  "ui.panel.marketplace.dialog_install.no_releases"
                )
              : html`<ha-select
                  .label=${this._i18n.localize(
                    "ui.panel.marketplace.dialog_install.release"
                  )}
                  .value=${this._selectedVersion}
                  .options=${this._releaseOptions(this._releases)}
                  @selected=${this._versionChanged}
                ></ha-select>`
      }
    </div>`;
  }

  private async _installRepository(): Promise<void> {
    const repository = this._repository;
    if (!repository) {
      return;
    }

    if (this._installing) {
      this._error = this._i18n.localize(
        "ui.panel.marketplace.dialog_install.already_installing"
      );
      return;
    }

    this._installing = true;
    this._progress = undefined;
    this._error = undefined;

    // Subscribed before the installation starts, or its first steps are missed.
    // Progress is a nicety, the installation goes ahead without it.
    const unsubscribeProgress = await subscribeMarketplaceInstallProgress(
      this._connection,
      (update) => {
        if (
          update.repository === repository.full_name &&
          typeof update.progress === "number"
        ) {
          this._progress = update.progress;
        }
      }
    ).catch(() => undefined);

    try {
      await installMarketplaceRepository(
        this._api,
        repository.id,
        this._selectedVersion || repository.available_version,
        { confirmReplaceBuiltIn: this._replacementAccepted }
      );
    } catch (err) {
      this._installing = false;
      if (!this._isShowing(repository)) {
        return;
      }

      if (handleGitHubRateLimited(this, this._api, this._i18n.localize, err)) {
        return;
      }

      this._error =
        websocketErrorMessage(err, this._i18n.localize) ||
        this._i18n.localize(
          "ui.panel.marketplace.dialog_install.install_failed"
        );
      return;
    } finally {
      unsubscribeProgress?.();
    }

    this._installing = false;

    if (this._error !== undefined) {
      return;
    }

    // A dialog closed during the installation is detached, the app itself can
    // still show the reload prompt.
    const promptHost = this.isConnected
      ? this
      : (document.querySelector("home-assistant") as HTMLElement | null);

    // Dialogs are appended outside of this element, so the reload prompt has
    // to be resolved before this dialog tears itself down.
    if (repository.category === "plugin" && promptHost) {
      await showConfirmationDialog(promptHost, {
        title: this._i18n.localize("ui.panel.marketplace.common.reload"),
        text: html`${this._i18n.localize(
            "ui.panel.marketplace.dialog.reload.description"
          )}<br />${this._i18n.localize("ui.panel.marketplace.dialog.reload.confirm")}`,
        dismissText: this._i18n.localize("ui.common.cancel"),
        confirmText: this._i18n.localize("ui.panel.marketplace.common.reload"),
        confirm: () => {
          location.reload();
        },
      });
    }

    if (!repository.installed && promptHost) {
      await this._startSetUp(promptHost, repository);
    }

    if (this.isConnected) {
      this.closeDialog();
    }
  }

  // Installing is the ask, a first installation that needs no restart goes
  // straight into setting it up. The backend knows, it read the manifest of
  // the version that was written.
  private async _startSetUp(
    promptHost: HTMLElement,
    repository: RepositoryInfo
  ): Promise<void> {
    if (repository.category !== "integration") {
      return;
    }

    let installed: RepositoryInfo;
    try {
      installed = await fetchMarketplaceRepository(this._api, repository.id);
    } catch (_err: unknown) {
      // Setting it up is still offered on the integrations page
      return;
    }

    const domain = installed.domain;
    if (!domain) {
      return;
    }

    if (!installed.config_flow) {
      await this._showHowToUse(promptHost, installed);
      return;
    }

    if (installed.status === "pending-restart") {
      return;
    }

    showConfigFlowDialog(promptHost, {
      startFlowHandler: domain,
      navigateToResult: true,
    });
  }

  // Without a config flow there is nothing to start here, how it is set up
  // is in its documentation.
  private async _showHowToUse(
    promptHost: HTMLElement,
    repository: RepositoryInfo
  ): Promise<void> {
    await showConfirmationDialog(promptHost, {
      title: this._i18n.localize(
        "ui.panel.marketplace.dialog_install.installed_title",
        { name: repository.name }
      ),
      text: this._i18n.localize(
        "ui.panel.marketplace.dialog_install.installed_without_set_up",
        { name: repository.name }
      ),
      confirmText: this._i18n.localize(
        "ui.panel.marketplace.dialog_install.view_documentation"
      ),
      dismissText: this._i18n.localize("ui.common.close"),
      confirm: () => {
        navigate(`/marketplace/repository/${repository.id}`);
      },
    });
  }

  private async _loadReleases() {
    if (this._releases !== undefined) {
      return;
    }

    const repository = this._repository!;
    this._releasesFailed = false;

    let releases: MarketplaceRelease[];
    try {
      releases = await fetchMarketplaceRepositoryReleases(
        this._api,
        repository.id
      );
    } catch (err) {
      if (!this._isShowing(repository)) {
        return;
      }

      // Told next to the versions, with a retry, not a second time above them
      this._releasesFailed = true;
      handleGitHubRateLimited(this, this._api, this._i18n.localize, err);
      return;
    }

    if (this._isShowing(repository)) {
      this._releases = releases;
    }
  }

  private _releaseOptions(releases: MarketplaceRelease[]): HaSelectOption[] {
    return releases.map((release) => ({
      value: release.tag,
      label: release.tag,
      secondary: [
        release.prerelease
          ? this._i18n.localize(
              "ui.panel.marketplace.dialog_install.pre_release"
            )
          : undefined,
        relativeTime(new Date(release.published_at), this._i18n.locale),
        release.name && release.name !== release.tag ? release.name : undefined,
      ]
        .filter(Boolean)
        .join(" · "),
    }));
  }

  private _versionChanged(ev: HaSelectSelectEvent<string, true>) {
    this._selectedVersion = ev.detail.value;
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        ha-dialog {
          --dialog-content-padding: 0;
        }
        ha-alert {
          display: block;
        }
        .content {
          padding: var(--ha-space-6);
        }
        .versions ha-select {
          display: block;
        }
        pre {
          white-space: pre-line;
          user-select: all;
          padding: var(--ha-space-2);
          background-color: var(--markdown-code-background-color, none);
          border-radius: var(--ha-border-radius-sm);
          color: var(--markdown-code-text-color, inherit);
        }
        .replaces-built-in ha-checkbox {
          display: block;
          margin-block-start: var(--ha-space-2);
        }
        .loading {
          text-align: center;
          padding: var(--ha-space-4);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-marketplace-install": DialogMarketplaceInstall;
  }
}
