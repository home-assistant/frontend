import "@material/mwc-button/mwc-button";
import "@material/mwc-linear-progress/mwc-linear-progress";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../homeassistant-frontend/src/common/dom/fire_event";
import { mainWindow } from "../../../homeassistant-frontend/src/common/dom/get_main_window";
import { computeRTL } from "../../../homeassistant-frontend/src/common/util/compute_rtl";
import "../../../homeassistant-frontend/src/components/ha-alert";
import "../../../homeassistant-frontend/src/components/ha-button";
import "../../../homeassistant-frontend/src/components/ha-circular-progress";
import "../../../homeassistant-frontend/src/components/ha-dialog";
import "../../../homeassistant-frontend/src/components/ha-expansion-panel";
import "../../../homeassistant-frontend/src/components/ha-form/ha-form";
import "../../../homeassistant-frontend/src/components/ha-list-item";

import { relativeTime } from "../../../homeassistant-frontend/src/common/datetime/relative_time";
import { showConfirmationDialog } from "../../../homeassistant-frontend/src/dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../homeassistant-frontend/src/types";
import { HacsDispatchEvent } from "../../data/common";
import {
  fetchRepositoryInformation,
  RepositoryBase,
  repositoryDownloadVersion,
  RepositoryInfo,
  repositoryReleases,
} from "../../data/repository";
import { websocketSubscription } from "../../data/websocket";
import { HacsStyles } from "../../styles/hacs-common-style";
import { generateFrontendResourceURL } from "../../tools/frontend-resource";
import type { HacsDownloadDialogParams } from "./show-hacs-dialog";

@customElement("release-item")
export class ReleaseItem extends LitElement {
  @property({ attribute: false }) public locale!: HomeAssistant["locale"];
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
        ${this.release.prerelease ? html`<span class="pre-release">pre-release</span>` : nothing}
      </span>
      <span class="secondary">
        ${relativeTime(new Date(this.release.published_at), this.locale)}
        ${this.release.name && this.release.name !== this.release.tag
          ? html` - ${this.release.name}`
          : nothing}
      </span>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
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
}
@customElement("hacs-download-dialog")
export class HacsDonwloadDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _waiting = true;

  @state() private _installing = false;

  @state() private _error?: any;

  @state() private _releases?: {
    tag: string;
    name: string;
    published_at: string;
    prerelease: boolean;
  }[];

  @state() public _repository?: RepositoryInfo;

  @state() _dialogParams?: HacsDownloadDialogParams;

  @state() _selectedVersion?: string;

  public async showDialog(dialogParams: HacsDownloadDialogParams): Promise<void> {
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

    websocketSubscription(
      this.hass,
      (data) => {
        this._error = data;
        this._installing = false;
      },
      HacsDispatchEvent.ERROR,
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
        this._dialogParams!.repositoryId,
      );
    } catch (err: any) {
      this._error = err;
    }
  }

  protected render() {
    if (!this._dialogParams) {
      return nothing;
    }
    if (!this._repository) {
      return html`
        <ha-dialog open scrimClickAction escapeKeyAction heading="Loading...">
          <div class="loading">
            <ha-circular-progress indeterminate></ha-circular-progress>
            ${this._error
              ? html`<ha-alert alert-type="error" .rtl=${computeRTL(this.hass)}>
                  ${this._error.message || this._error}
                </ha-alert>`
              : nothing}
          </div>
        </ha-dialog>
      `;
    }

    const installPath = this._getInstallPath(this._repository);
    return html`
      <ha-dialog
        open
        scrimClickAction
        escapeKeyAction
        .heading=${this._repository.name}
        @closed=${this.closeDialog}
      >
        <div class="content">
          <p>
            ${this._dialogParams.hacs.localize(
              this._repository.version_or_commit === "commit"
                ? "dialog_download.will_download_commit"
                : "dialog_download.will_download_version",
              {
                ref: html`
                  <code>${this._selectedVersion || this._repository.available_version}</code>
                `,
              },
            )}
          </p>
          <div class="note">
            ${this._dialogParams.hacs.localize("dialog_download.note_downloaded", {
              location: html`<code>'${installPath}'</code>`,
            })}
            ${this._repository.category === "plugin" &&
            this._dialogParams.hacs.info.lovelace_mode !== "storage"
              ? html`
                  <p>${this._dialogParams.hacs.localize(`dialog_download.lovelace_instruction`)}</p>
                  <pre class="frontend-resource">
                url: ${generateFrontendResourceURL({ repository: this._repository })}
                type: module
                </pre
                  >
                `
              : nothing}
            ${this._repository.category === "integration"
              ? html`<p>${this._dialogParams.hacs.localize("dialog_download.restart")}</p>`
              : nothing}
          </div>
          ${this._selectedVersion
            ? html`<ha-expansion-panel
                @expanded-changed=${this._fetchReleases}
                .header=${this._dialogParams.hacs.localize(`dialog_download.different_version`)}
              >
                <p>${this._dialogParams!.hacs.localize("dialog_download.release_warning")}</p>
                ${this._releases === undefined
                  ? this._dialogParams.hacs.localize("dialog_download.fetching_releases")
                  : this._releases.length === 0
                    ? this._dialogParams.hacs.localize("dialog_download.no_releases")
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
                                  label: html`<release-item
                                    .locale=${this.hass.locale}
                                    .release=${release}
                                  >
                                    ${release.tag}
                                  </release-item>`,
                                })),
                              },
                            },
                          },
                        ]}
                      ></ha-form>`}
              </ha-expansion-panel>`
            : nothing}
          ${this._error
            ? html`<ha-alert alert-type="error" .rtl=${computeRTL(this.hass)}>
                ${this._error.message || this._error}
              </ha-alert>`
            : nothing}
          ${this._installing
            ? html`<mwc-linear-progress indeterminate></mwc-linear-progress>`
            : nothing}
        </div>
        <mwc-button slot="secondaryAction" @click=${this.closeDialog} dialogInitialFocus>
          ${this._dialogParams.hacs.localize("common.cancel")}
        </mwc-button>
        <mwc-button
          slot="primaryAction"
          ?disabled=${this._waiting || this._installing}
          @click=${this._installRepository}
        >
          ${this._dialogParams.hacs.localize("common.download")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _computeLabel = (entry: any): string =>
    entry.name === "release"
      ? this._dialogParams!.hacs.localize("dialog_download.release")
      : entry.name;

  private async _installRepository(): Promise<void> {
    if (!this._repository) {
      return;
    }

    if (this._waiting) {
      this._error = "Waiting to update repository information, try later.";
      return;
    }

    if (this._installing) {
      this._error = "Already installing, please wait.";
      return;
    }

    this._installing = true;
    this._error = undefined;

    try {
      await repositoryDownloadVersion(
        this.hass,
        String(this._repository.id),
        this._selectedVersion || this._repository.available_version,
      );
    } catch (err: any) {
      this._error = err || {
        message: "Could not download repository, check core logs for more information.",
      };
      this._installing = false;
      return;
    }

    this._dialogParams!.hacs.log.debug(this._repository.category, "_installRepository");
    this._dialogParams!.hacs.log.debug(
      this._dialogParams!.hacs.info.lovelace_mode,
      "_installRepository",
    );
    this._installing = false;

    if (this._repository.category === "plugin") {
      showConfirmationDialog(this, {
        title: this._dialogParams!.hacs.localize!("common.reload"),
        text: html`${this._dialogParams!.hacs.localize!("dialog.reload.description")}<br />${this
            ._dialogParams!.hacs.localize!("dialog.reload.confirm")}`,
        dismissText: this._dialogParams!.hacs.localize!("common.cancel"),
        confirmText: this._dialogParams!.hacs.localize!("common.reload"),
        confirm: () => {
          // eslint-disable-next-line
          mainWindow.location.href = mainWindow.location.href;
        },
      });
    }
    if (this._error === undefined) {
      this.closeDialog();
    }
  }

  async _fetchReleases() {
    if (this._releases !== undefined) {
      return;
    }
    try {
      this._releases = await repositoryReleases(this.hass, this._repository!.id);
    } catch (error) {
      this._error = error;
    }
  }

  private _versionChanged(ev: CustomEvent) {
    this._selectedVersion = ev.detail.value.release;
  }

  static get styles(): CSSResultGroup {
    return [
      HacsStyles,
      css`
        .note {
          margin-top: 12px;
        }
        pre {
          white-space: pre-line;
          user-select: all;
          padding: 8px;
        }
        mwc-linear-progress {
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
    "hacs-download-dialog": HacsDonwloadDialog;
    "release-item": ReleaseItem;
  }
}
