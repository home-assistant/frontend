import { consume, type ContextType } from "@lit/context";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type {
  HASSDomEvent,
  HASSDomTargetEvent,
} from "../../../common/dom/fire_event";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-checkbox";
import type { HaCheckbox } from "../../../components/ha-checkbox";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-expansion-panel";
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
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import { MarketplaceDispatchEvent } from "../../../data/marketplace/common";
import type {
  RepositoryBase,
  RepositoryInfo,
} from "../../../data/marketplace/repository";
import {
  fetchRepositoryInformation,
  repositoryDownloadVersion,
  repositoryReleases,
} from "../../../data/marketplace/repository";
import {
  handleWarningNotAccepted,
  websocketErrorMessage,
  websocketSubscription,
} from "../../../data/marketplace/websocket";
import { marketplaceStyles } from "../styles/marketplace-common-style";
import type { MarketplaceHass } from "../tools/connect-github";
import { handleGitHubRateLimited } from "../tools/connect-github";
import { downloadBlockedReason } from "../tools/download-blocked-reason";
import { generateFrontendResourceURL } from "../tools/frontend-resource";
import type { MarketplaceDownloadDialogParams } from "./show-dialog-marketplace";

interface MarketplaceRelease {
  tag: string;
  name: string;
  published_at: string;
  prerelease: boolean;
}

@customElement("dialog-marketplace-download")
export class DialogMarketplaceDownload extends DialogMixin<MarketplaceDownloadDialogParams>(
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

  // What the backend reports while downloading, unknown until its first step
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

  // The Marketplace helpers take a hass object, dialogs only get contexts.
  private get _hass(): MarketplaceHass {
    return {
      callApi: this._api.callApi,
      connection: this._connection.connection,
      localize: this._i18n.localize,
    };
  }

  private async _load(params: MarketplaceDownloadDialogParams): Promise<void> {
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
      this._selectedVersion = this._repository.available_version;
    }
  }

  // Answers for a closed dialog, or for another repository, are dropped.
  private _isShowing(repository: RepositoryInfo): boolean {
    return this.isConnected && this._repository === repository;
  }

  private _getInstallPath = memoizeOne((repository: RepositoryBase) => {
    let path: string = repository.local_path;
    if (["template", "theme"].includes(repository.category)) {
      path = `${path}/${repository.file_name}`;
    }
    return path;
  });

  private _getAuthors = memoizeOne((repository: RepositoryInfo): string[] => {
    const authors = (repository.authors ?? []).map((author) =>
      author.replace("@", "")
    );
    return authors.length > 0 ? authors : [repository.full_name.split("/")[0]];
  });

  private async _fetchRepository(repositoryId: string) {
    let repository: RepositoryInfo;
    try {
      repository = await fetchRepositoryInformation(this._hass, repositoryId);
    } catch (err) {
      if (!this.isConnected) {
        return;
      }

      this._error = handleGitHubRateLimited(this, this._hass, err)
        ? this._i18n.localize("ui.panel.marketplace.github.rate_limited")
        : websocketErrorMessage(err) ||
          this._i18n.localize("ui.panel.marketplace.common.unknown_error");
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
            ? this._renderDownload(this._repository)
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
        : "ui.panel.marketplace.dialog_download.loading"
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
          ${this._i18n.localize("ui.panel.marketplace.common.cancel")}
        </ha-button>
      </ha-dialog-footer>
    `;
  }

  private _replacementAcceptedChanged(ev: HASSDomTargetEvent<HaCheckbox>) {
    this._replacementAccepted = ev.target.checked;
  }

  private _renderDownload(repository: RepositoryInfo) {
    const installPath = this._getInstallPath(repository);
    const needsAcceptance =
      repository.replaces_built_in &&
      !repository.installed &&
      !this._replacementAccepted;
    // Home Assistant can be too old for the newest version, not for an older one
    const tooNew =
      !repository.can_download &&
      (this._selectedVersion ?? repository.available_version) ===
        repository.available_version;
    return html`
      <div class="content">
        ${
          repository.replaces_built_in
            ? html`<ha-alert
                class="replaces-built-in"
                alert-type="error"
                .title=${this._i18n.localize(
                  "ui.panel.marketplace.dialog_download.replaces_built_in_title",
                  { domain: repository.domain }
                )}
              >
                ${this._i18n.localize(
                  "ui.panel.marketplace.dialog_download.replaces_built_in_warning",
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
                          "ui.panel.marketplace.dialog_download.replaces_built_in_confirm"
                        )}
                      </ha-checkbox>`
                }
              </ha-alert>`
            : nothing
        }
        <p>
          ${this._i18n.localize(
            repository.version_or_commit === "commit"
              ? "ui.panel.marketplace.dialog_download.will_download_commit"
              : "ui.panel.marketplace.dialog_download.will_download_version",
            {
              ref: html`
                <code
                  >${this._selectedVersion || repository.available_version}</code
                >
              `,
            }
          )}
        </p>
        <div class="note">
          ${this._i18n.localize(
            "ui.panel.marketplace.dialog_download.note_downloaded",
            {
              location: html`<code>'${installPath}'</code>`,
            }
          )}
          ${
            repository.category === "plugin" &&
            this.params!.marketplace.info.lovelace_mode !== "storage"
              ? html`
                  <p>
                    ${this._i18n.localize(`ui.panel.marketplace.dialog_download.lovelace_instruction`)}
                  </p>
                  <pre class="frontend-resource">
              url: ${generateFrontendResourceURL({ repository })}
              type: module
              </pre>
                `
              : nothing
          }
          ${
            repository.category === "integration"
              ? html`<p>
                  ${this._i18n.localize("ui.panel.marketplace.dialog_download.restart")}
                </p>`
              : nothing
          }
        </div>
        ${
          this._selectedVersion
            ? html`<ha-expansion-panel
                @expanded-changed=${this._fetchReleases}
                .header=${this._i18n.localize(`ui.panel.marketplace.dialog_download.different_version`)}
              >
                <p>
                  ${this._i18n.localize("ui.panel.marketplace.dialog_download.release_warning")}
                </p>
                ${
                  this._releasesFailed
                    ? this._i18n.localize(
                        "ui.panel.marketplace.dialog_download.releases_failed"
                      )
                    : this._releases === undefined
                      ? this._i18n.localize(
                          "ui.panel.marketplace.dialog_download.fetching_releases"
                        )
                      : this._releases.length === 0
                        ? this._i18n.localize(
                            "ui.panel.marketplace.dialog_download.no_releases"
                          )
                        : html`<ha-select
                            .label=${this._i18n.localize(
                              "ui.panel.marketplace.dialog_download.release"
                            )}
                            .value=${this._selectedVersion}
                            .options=${this._releaseOptions(this._releases)}
                            @selected=${this._versionChanged}
                          ></ha-select>`
                }
              </ha-expansion-panel>`
            : nothing
        }
        ${
          repository.installed
            ? nothing
            : html`<ha-alert
                alert-type="warning"
                .title=${this._i18n.localize(
                  "ui.panel.marketplace.dialog_download.new_download_title"
                )}
              >
                ${this._i18n.localize(
                  "ui.panel.marketplace.dialog_download.new_download_warning",
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
        ${
          tooNew
            ? html`<ha-alert alert-type="warning">
                ${downloadBlockedReason(this._i18n.localize, repository)}
                ${this._i18n.localize(
                  "ui.panel.marketplace.dialog_download.older_version_hint"
                )}
              </ha-alert>`
            : nothing
        }
        ${
          this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : nothing
        }
        ${
          this._installing
            ? html`<ha-progress-bar
                .value=${this._progress ?? 0}
                .indeterminate=${this._progress === undefined}
              ></ha-progress-bar>`
            : nothing
        }
      </div>
      <ha-dialog-footer slot="footer">
        <ha-button
          slot="secondaryAction"
          appearance="plain"
          @click=${this.closeDialog}
        >
          ${this._i18n.localize("ui.panel.marketplace.common.cancel")}
        </ha-button>
        <ha-button
          slot="primaryAction"
          appearance="filled"
          ?disabled=${this._installing || tooNew || needsAcceptance}
          @click=${this._installRepository}
        >
          ${this._i18n.localize("ui.panel.marketplace.common.download")}
        </ha-button>
      </ha-dialog-footer>
    `;
  }

  private async _installRepository(): Promise<void> {
    const repository = this._repository;
    if (!repository) {
      return;
    }

    if (this._installing) {
      this._error = this._i18n.localize(
        "ui.panel.marketplace.dialog_download.already_downloading"
      );
      return;
    }

    this._installing = true;
    this._progress = undefined;
    this._error = undefined;

    // Subscribed before the download starts, or its first steps are missed.
    // Progress is a nicety, the download goes ahead without it.
    const unsubscribeProgress = await websocketSubscription(
      this._hass,
      (data) => {
        if (
          data?.repository === repository.full_name &&
          typeof data.progress === "number"
        ) {
          this._progress = data.progress;
        }
      },
      MarketplaceDispatchEvent.REPOSITORY_DOWNLOAD_PROGRESS
    ).catch(() => undefined);

    try {
      await repositoryDownloadVersion(
        this._hass,
        String(repository.id),
        this._selectedVersion || repository.available_version,
        { confirmReplaceBuiltIn: this._replacementAccepted }
      );
    } catch (err) {
      this._installing = false;
      if (!this._isShowing(repository)) {
        return;
      }

      if (handleWarningNotAccepted(err)) {
        this.closeDialog();
        return;
      }

      if (handleGitHubRateLimited(this, this._hass, err)) {
        return;
      }

      this._error =
        websocketErrorMessage(err) ||
        this._i18n.localize(
          "ui.panel.marketplace.dialog_download.download_failed"
        );
      return;
    } finally {
      unsubscribeProgress?.();
    }

    this._installing = false;

    if (this._error !== undefined) {
      return;
    }

    // A dialog closed during the download is detached, the app itself can
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
        dismissText: this._i18n.localize("ui.panel.marketplace.common.cancel"),
        confirmText: this._i18n.localize("ui.panel.marketplace.common.reload"),
        confirm: () => {
          location.reload();
        },
      });
    }

    if (this.isConnected) {
      this.closeDialog();
    }
  }

  private async _fetchReleases(
    ev: HASSDomEvent<HASSDomEvents["expanded-changed"]>
  ) {
    // Collapsing the panel fires this too, and would repeat a failed fetch.
    if (!ev.detail.expanded || this._releases !== undefined) {
      return;
    }

    const repository = this._repository!;
    this._releasesFailed = false;

    let releases: MarketplaceRelease[];
    try {
      releases = await repositoryReleases(this._hass, String(repository.id));
    } catch (err) {
      if (!this._isShowing(repository)) {
        return;
      }

      this._releasesFailed = true;
      if (!handleGitHubRateLimited(this, this._hass, err)) {
        this._error =
          websocketErrorMessage(err) ||
          this._i18n.localize("ui.panel.marketplace.common.unknown_error");
      }
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
              "ui.panel.marketplace.dialog_download.pre_release"
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
      marketplaceStyles,
      css`
        .note {
          margin-block-start: var(--ha-space-3);
        }
        pre {
          white-space: pre-line;
          user-select: all;
          padding: var(--ha-space-2);
        }
        ha-progress-bar {
          margin-block-end: calc(-1 * var(--ha-space-2));
          margin-block-start: var(--ha-space-1);
        }
        ha-expansion-panel {
          background-color: var(--secondary-background-color);
          padding: var(--ha-space-2);
        }
        .replaces-built-in {
          display: block;
          margin-block-end: var(--ha-space-4);
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
    "dialog-marketplace-download": DialogMarketplaceDownload;
  }
}
