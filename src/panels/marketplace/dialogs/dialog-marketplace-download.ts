import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-expansion-panel";
import "../../../components/ha-form/ha-form";
import "../../../components/ha-spinner";
import "../../../components/progress/ha-progress-bar";

import { relativeTime } from "../../../common/datetime/relative_time";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../types";
import { MarketplaceDispatchEvent } from "../data/common";
import type { RepositoryBase, RepositoryInfo } from "../data/repository";
import {
  fetchRepositoryInformation,
  repositoryDownloadVersion,
  repositoryReleases,
} from "../data/repository";
import { websocketSubscription } from "../data/websocket";
import { marketplaceStyles } from "../styles/marketplace-common-style";
import { generateFrontendResourceURL } from "../tools/frontend-resource";
import type { MarketplaceDownloadDialogParams } from "./show-dialog-marketplace";

@customElement("ha-marketplace-release-item")
export class HaMarketplaceReleaseItem extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public release!: {
    tag: string;
    published_at: string;
    name: string;
    prerelease: boolean;
  };

  protected render() {
    return html`
      <span>
        ${this.release.tag}
        ${
          this.release.prerelease
            ? html`<span class="pre-release">
                ${this.hass.localize(
                  "ui.panel.marketplace.dialog_download.pre_release"
                )}
              </span>`
            : nothing
        }
      </span>
      <span class="secondary">
        ${relativeTime(new Date(this.release.published_at), this.hass.locale)}
        ${
          this.release.name && this.release.name !== this.release.tag
            ? html` - ${this.release.name}`
            : nothing
        }
      </span>
    `;
  }

  static styles: CSSResultGroup = css`
    :host {
      display: flex;
      flex-direction: column;
    }
    .secondary {
      font-size: 0.8em;
      color: var(--secondary-text-color);
      font-style: italic;
    }
    .pre-release {
      background-color: var(--accent-color);
      padding: 2px 4px;
      font-size: 0.8em;
      font-weight: 600;
      border-radius: 12px;
      margin: 0 2px;
      color: var(--secondary-background-color);
    }
  `;
}

// The backend reports errors both as plain strings and as objects with a
// message, the dialog only ever shows a single line of text.
const errorMessage = (error: unknown): string => {
  if (typeof error === "string") {
    return error;
  }
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === "string" ? message : String(error);
};

@customElement("dialog-marketplace-download")
export class DialogMarketplaceDownload extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _waiting = true;

  @state() private _installing = false;

  @state() private _error?: string;

  @state() private _releases?: {
    tag: string;
    name: string;
    published_at: string;
    prerelease: boolean;
  }[];

  @state() private _repository?: RepositoryInfo;

  @state() private _dialogParams?: MarketplaceDownloadDialogParams;

  @state() private _selectedVersion?: string;

  private _errorSubscription?: UnsubscribeFunc;

  public async showDialog(
    dialogParams: MarketplaceDownloadDialogParams
  ): Promise<void> {
    this._dialogParams = dialogParams;
    this._waiting = false;
    if (dialogParams.repository) {
      this._repository = dialogParams.repository;
    } else {
      await this._fetchRepository();
    }

    if (this._repository && this._repository.version_or_commit !== "commit") {
      this._selectedVersion = this._repository.available_version;
    }
    this._releases = undefined;

    this._errorSubscription = await websocketSubscription(
      this.hass,
      (data) => {
        this._error = errorMessage(data);
        this._installing = false;
      },
      MarketplaceDispatchEvent.ERROR
    );
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._dialogParams = undefined;
    this._repository = undefined;
    this._error = undefined;
    this._installing = false;
    this._waiting = false;
    this._releases = undefined;
    this._selectedVersion = undefined;
    if (this._errorSubscription) {
      this._errorSubscription();
      this._errorSubscription = undefined;
    }
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _getInstallPath = memoizeOne((repository: RepositoryBase) => {
    let path: string = repository.local_path;
    if (["template", "theme", "python_script"].includes(repository.category)) {
      path = `${path}/${repository.file_name}`;
    }
    return path;
  });

  private async _fetchRepository() {
    try {
      this._repository = await fetchRepositoryInformation(
        this.hass,
        this._dialogParams!.repositoryId
      );
    } catch (err) {
      this._error = errorMessage(err);
    }
  }

  protected render() {
    if (!this._dialogParams) {
      return nothing;
    }
    if (!this._repository) {
      return html`
        <ha-dialog
          open
          .headerTitle=${this.hass.localize(
            "ui.panel.marketplace.dialog_download.loading"
          )}
          @closed=${this.closeDialog}
        >
          <div class="loading">
            <ha-spinner></ha-spinner>
            ${
              this._error
                ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
                : nothing
            }
          </div>
        </ha-dialog>
      `;
    }

    const installPath = this._getInstallPath(this._repository);
    return html`
      <ha-dialog
        open
        .headerTitle=${this._repository.name}
        @closed=${this.closeDialog}
      >
        <div class="content">
          <p>
            ${this.hass.localize(
              this._repository.version_or_commit === "commit"
                ? "ui.panel.marketplace.dialog_download.will_download_commit"
                : "ui.panel.marketplace.dialog_download.will_download_version",
              {
                ref: html`
                  <code
                    >${this._selectedVersion || this._repository.available_version}</code
                  >
                `,
              }
            )}
          </p>
          <div class="note">
            ${this.hass.localize(
              "ui.panel.marketplace.dialog_download.note_downloaded",
              {
                location: html`<code>'${installPath}'</code>`,
              }
            )}
            ${
              this._repository.category === "plugin" &&
              this._dialogParams.marketplace.info.lovelace_mode !== "storage"
                ? html`
                    <p>
                      ${this.hass.localize(`ui.panel.marketplace.dialog_download.lovelace_instruction`)}
                    </p>
                    <pre class="frontend-resource">
                url: ${generateFrontendResourceURL({ repository: this._repository })}
                type: module
                </pre>
                  `
                : nothing
            }
            ${
              this._repository.category === "integration"
                ? html`<p>
                    ${this.hass.localize("ui.panel.marketplace.dialog_download.restart")}
                  </p>`
                : nothing
            }
          </div>
          ${
            this._selectedVersion
              ? html`<ha-expansion-panel
                  @expanded-changed=${this._fetchReleases}
                  .header=${this.hass.localize(`ui.panel.marketplace.dialog_download.different_version`)}
                >
                  <p>
                    ${this.hass.localize("ui.panel.marketplace.dialog_download.release_warning")}
                  </p>
                  ${
                    this._releases === undefined
                      ? this.hass.localize(
                          "ui.panel.marketplace.dialog_download.fetching_releases"
                        )
                      : this._releases.length === 0
                        ? this.hass.localize(
                            "ui.panel.marketplace.dialog_download.no_releases"
                          )
                        : html`<ha-form
                            @value-changed=${this._versionChanged}
                            .computeLabel=${this._computeLabel}
                            .schema=${[
                              {
                                name: "release",
                                selector: {
                                  select: {
                                    mode: "dropdown",
                                    options: this._releases?.map((release) => ({
                                      value: release.tag,
                                      label: html`<ha-marketplace-release-item
                                        .hass=${this.hass}
                                        .release=${release}
                                      ></ha-marketplace-release-item>`,
                                    })),
                                  },
                                },
                              },
                            ]}
                          ></ha-form>`
                  }
                </ha-expansion-panel>`
              : nothing
          }
          ${
            this._error
              ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
              : nothing
          }
          ${
            this._installing
              ? html`<ha-progress-bar indeterminate></ha-progress-bar>`
              : nothing
          }
        </div>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this.closeDialog}
          >
            ${this.hass.localize("ui.panel.marketplace.common.cancel")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            appearance="filled"
            ?disabled=${this._waiting || this._installing}
            @click=${this._installRepository}
          >
            ${this.hass.localize("ui.panel.marketplace.common.download")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _computeLabel = (entry: any): string =>
    entry.name === "release"
      ? this.hass.localize("ui.panel.marketplace.dialog_download.release")
      : entry.name;

  private async _installRepository(): Promise<void> {
    const repository = this._repository;
    if (!repository) {
      return;
    }

    if (this._waiting) {
      this._error = this.hass.localize(
        "ui.panel.marketplace.dialog_download.waiting_for_information"
      );
      return;
    }

    if (this._installing) {
      this._error = this.hass.localize(
        "ui.panel.marketplace.dialog_download.already_downloading"
      );
      return;
    }

    this._installing = true;
    this._error = undefined;

    try {
      await repositoryDownloadVersion(
        this.hass,
        String(repository.id),
        this._selectedVersion || repository.available_version
      );
    } catch (err) {
      this._error =
        errorMessage(err) ||
        this.hass.localize(
          "ui.panel.marketplace.dialog_download.download_failed"
        );
      this._installing = false;
      return;
    }

    this._installing = false;

    if (this._error !== undefined) {
      return;
    }

    // Dialogs are appended outside of this element, so the reload prompt has
    // to be resolved before this dialog tears itself down.
    if (repository.category === "plugin") {
      await showConfirmationDialog(this, {
        title: this.hass.localize("ui.panel.marketplace.common.reload"),
        text: html`${this.hass.localize(
            "ui.panel.marketplace.dialog.reload.description"
          )}<br />${this.hass.localize("ui.panel.marketplace.dialog.reload.confirm")}`,
        dismissText: this.hass.localize("ui.panel.marketplace.common.cancel"),
        confirmText: this.hass.localize("ui.panel.marketplace.common.reload"),
        confirm: () => {
          location.reload();
        },
      });
    }

    this.closeDialog();
  }

  private async _fetchReleases() {
    if (this._releases !== undefined) {
      return;
    }
    try {
      this._releases = await repositoryReleases(
        this.hass,
        this._repository!.id
      );
    } catch (err) {
      this._error = errorMessage(err);
    }
  }

  private _versionChanged(ev: CustomEvent) {
    this._selectedVersion = ev.detail.value.release;
  }

  static get styles(): CSSResultGroup {
    return [
      marketplaceStyles,
      css`
        .note {
          margin-top: 12px;
        }
        pre {
          white-space: pre-line;
          user-select: all;
          padding: 8px;
        }
        ha-progress-bar {
          margin-bottom: -8px;
          margin-top: 4px;
        }
        ha-expansion-panel {
          background-color: var(--secondary-background-color);
          padding: 8px;
        }
        .loading {
          text-align: center;
          padding: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-marketplace-download": DialogMarketplaceDownload;
    "ha-marketplace-release-item": HaMarketplaceReleaseItem;
  }
}
