import "../../../src/components/ha-faded";
import "@material/mwc-list/mwc-list-item";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import "../../../src/common/search/search-input";
import "../../../src/components/buttons/ha-progress-button";
import "../../../src/components/ha-alert";
import "../../../src/components/ha-button-menu";
import "../../../src/components/ha-card";
import "../../../src/components/ha-checkbox";
import "../../../src/components/ha-expansion-panel";
import "../../../src/components/ha-icon-button";
import "../../../src/components/ha-markdown";
import "../../../src/components/ha-settings-row";
import "../../../src/components/ha-svg-icon";
import "../../../src/components/ha-switch";
import {
  fetchHassioAddonChangelog,
  fetchHassioAddonInfo,
  HassioAddonDetails,
  updateHassioAddon,
} from "../../../src/data/hassio/addon";
import {
  createHassioPartialBackup,
  HassioPartialBackupCreateParams,
} from "../../../src/data/hassio/backup";
import {
  extractApiErrorMessage,
  ignoreSupervisorError,
} from "../../../src/data/hassio/common";
import { updateOS } from "../../../src/data/hassio/host";
import { updateSupervisor } from "../../../src/data/hassio/supervisor";
import { updateCore } from "../../../src/data/supervisor/core";
import { StoreAddon } from "../../../src/data/supervisor/store";
import { Supervisor } from "../../../src/data/supervisor/supervisor";
import { showAlertDialog } from "../../../src/dialogs/generic/show-dialog-box";
import "../../../src/layouts/hass-loading-screen";
import "../../../src/layouts/hass-subpage";
import "../../../src/layouts/hass-tabs-subpage";
import { SUPERVISOR_UPDATE_NAMES } from "../../../src/panels/config/dashboard/ha-config-updates";
import { HomeAssistant, Route } from "../../../src/types";
import { documentationUrl } from "../../../src/util/documentation-url";
import { addonArchIsSupported, extractChangelog } from "../util/addon";

const changelogUrl = (
  hass: HomeAssistant,
  entry: string,
  version: string
): string | undefined => {
  if (entry === "core") {
    return version?.includes("dev")
      ? "https://github.com/home-assistant/core/commits/dev"
      : documentationUrl(hass, "/latest-release-notes/");
  }
  if (entry === "os") {
    return version?.includes("dev")
      ? "https://github.com/home-assistant/operating-system/commits/dev"
      : `https://github.com/home-assistant/operating-system/releases/tag/${version}`;
  }
  if (entry === "supervisor") {
    return version?.includes("dev")
      ? "https://github.com/home-assistant/supervisor/commits/main"
      : `https://github.com/home-assistant/supervisor/releases/tag/${version}`;
  }
  return undefined;
};

class UpdateAvailableDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false }) public route!: Route;

  @state() private _updateEntry?: string;

  @state() private _changelogContent?: string;

  @state() private _addonInfo?: HassioAddonDetails;

  @state() private _createBackup = true;

  @state() private _action: "backup" | "update" | null = null;

  @state() private _error?: string;

  private _isAddon = false;

  private _addonStoreInfo = memoizeOne(
    (slug: string, storeAddons: StoreAddon[]) =>
      storeAddons.find((addon) => addon.slug === slug)
  );

  protected render(): TemplateResult {
    if (!this._updateEntry) {
      return html``;
    }
    const name =
      // @ts-ignore
      this._addonInfo?.name || SUPERVISOR_UPDATE_NAMES[this._updateEntry];
    const changelog = !this._isAddon
      ? changelogUrl(
          this.hass,
          this._updateEntry,
          this.supervisor[this._updateEntry]?.version
        )
      : undefined;
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
      >
        <ha-card
          .header=${this.supervisor.localize("update_available.update_name", {
            name,
          })}
        >
          <div class="card-content">
            ${this._error
              ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
              : ""}
            ${this._action === null
              ? html`
                  ${this._changelogContent
                    ? html`
                        <ha-faded>
                          <ha-markdown .content=${this._changelogContent}>
                          </ha-markdown>
                        </ha-faded>
                      `
                    : ""}
                  <div class="versions">
                    <p>
                      ${this.supervisor.localize(
                        "update_available.description",
                        {
                          name,
                          version:
                            this._addonInfo?.version ||
                            this.supervisor[this._updateEntry]?.version,
                          newest_version:
                            this._addonInfo?.version_latest ||
                            this.supervisor[this._updateEntry]?.version_latest,
                        }
                      )}
                    </p>
                    ${this._updateEntry === "core"
                      ? html`
                          <i>
                            ${this.supervisor.localize(
                              "update_available.core_note",
                              {
                                version:
                                  this._addonInfo?.version ||
                                  this.supervisor[this._updateEntry]?.version,
                              }
                            )}
                          </i>
                        `
                      : ""}
                  </div>
                  ${!["os", "supervisor"].includes(this._updateEntry)
                    ? html`
                        <ha-settings-row>
                          <ha-checkbox
                            slot="prefix"
                            .checked=${this._createBackup}
                            @click=${this._toggleBackup}
                          >
                          </ha-checkbox>
                          <span slot="heading">
                            ${this.supervisor.localize(
                              "update_available.create_backup"
                            )}
                          </span>
                        </ha-settings-row>
                      `
                    : ""}
                `
              : html`<ha-circular-progress alt="Updating" size="large" active>
                  </ha-circular-progress>
                  <p class="progress-text">
                    ${this._action === "update"
                      ? this.supervisor.localize("update_available.updating", {
                          name,
                          version:
                            this._addonInfo?.version_latest ||
                            this.supervisor[this._updateEntry]?.version_latest,
                        })
                      : this.supervisor.localize(
                          "update_available.creating_backup",
                          { name }
                        )}
                  </p>`}
          </div>
          ${this._action === null
            ? html`
                <div class="card-actions">
                  ${changelog
                    ? html`<a
                        .href=${changelog}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <mwc-button
                          .label=${this.supervisor.localize(
                            "update_available.open_release_notes"
                          )}
                        >
                        </mwc-button>
                      </a>`
                    : ""}
                  <span></span>
                  <ha-progress-button
                    .disabled=${this._error !== undefined}
                    @click=${this._update}
                    raised
                  >
                    ${this.supervisor.localize("common.update")}
                  </ha-progress-button>
                </div>
              `
            : ""}
        </ha-card>
      </hass-subpage>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._updateEntry = this.route.path.substring(1, this.route.path.length);
    this._isAddon = !["core", "os", "supervisor"].includes(this._updateEntry);
    if (this._isAddon) {
      this._loadAddonData();
    }
  }

  private async _loadAddonData() {
    try {
      this._addonInfo = await fetchHassioAddonInfo(
        this.hass,
        this._updateEntry!
      );
    } catch (err) {
      showAlertDialog(this, {
        title: this._updateEntry,
        text: extractApiErrorMessage(err),
        confirm: () => history.back(),
      });
      return;
    }
    const addonStoreInfo =
      !this._addonInfo.detached && !this._addonInfo.available
        ? this._addonStoreInfo(
            this._addonInfo.slug,
            this.supervisor.store.addons
          )
        : undefined;

    if (this._addonInfo.changelog) {
      try {
        const content = await fetchHassioAddonChangelog(
          this.hass,
          this._updateEntry!
        );
        this._changelogContent = extractChangelog(this._addonInfo, content);
      } catch (err) {
        this._error = extractApiErrorMessage(err);
        return;
      }
    }

    if (!this._addonInfo.available && addonStoreInfo) {
      if (
        !addonArchIsSupported(
          this.supervisor.info.supported_arch,
          this._addonInfo.arch
        )
      ) {
        this._error = this.supervisor.localize(
          "addon.dashboard.not_available_arch"
        );
      } else {
        this._error = this.supervisor.localize(
          "addon.dashboard.not_available_arch",
          {
            core_version_installed: this.supervisor.core.version,
            core_version_needed: addonStoreInfo.homeassistant,
          }
        );
      }
    }
  }

  private _toggleBackup() {
    this._createBackup = !this._createBackup;
  }

  private async _update() {
    if (this._createBackup) {
      let backupArgs: HassioPartialBackupCreateParams;
      if (this._isAddon) {
        backupArgs = {
          name: `addon_${this._updateEntry}_${this._addonInfo?.version}`,
          addons: [this._updateEntry!],
          homeassistant: false,
        };
      } else {
        backupArgs = {
          name: `${this._updateEntry}_${this._addonInfo?.version}`,
          folders: ["homeassistant"],
          homeassistant: true,
        };
      }
      this._action = "backup";
      try {
        await createHassioPartialBackup(this.hass, backupArgs);
      } catch (err: any) {
        this._error = extractApiErrorMessage(err);
        this._action = null;
        return;
      }
    }

    this._action = "update";
    try {
      if (this._isAddon) {
        await updateHassioAddon(this.hass, this._updateEntry!);
      } else if (this._updateEntry === "core") {
        await updateCore(this.hass);
      } else if (this._updateEntry === "os") {
        await updateOS(this.hass);
      } else if (this._updateEntry === "supervisor") {
        await updateSupervisor(this.hass);
      }
    } catch (err: any) {
      if (this.hass.connection.connected && !ignoreSupervisorError(err)) {
        this._error = extractApiErrorMessage(err);
        this._action = null;
        return;
      }
    }
    history.back();
  }

  static get styles(): CSSResultGroup {
    return css`
    hass-subpage {
      --app-header-background-color: background-color: var(--primary-background-color);
    }
      ha-card {
        margin: auto;
        margin-top: 16px;
        max-width: 600px;
      }
      a {
        text-decoration: none;
        color: var(--primary-text-color);
      }
      ha-settings-row {
        padding: 0;
      }
      .card-actions {
        display: flex;
        justify-content: space-between;
      }

      ha-circular-progress {
        display: block;
        margin: 32px;
        text-align: center;
      }

      .progress-text {
        text-align: center;
      }
      ha-markdown {
        margin-bottom: 24px;
      }
    `;
  }
}

customElements.define("update-available-dashboard", UpdateAvailableDashboard);
