import "@material/mwc-list/mwc-list-item";
import { mdiArrowRight } from "@mdi/js";
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
import "../../../src/components/ha-checkbox";
import "../../../src/components/ha-expansion-panel";
import "../../../src/components/ha-icon-button";
import "../../../src/components/ha-markdown";
import "../../../src/components/ha-settings-row";
import "../../../src/components/ha-switch";
import {
  fetchHassioAddonChangelog,
  fetchHassioAddonInfo,
  HassioAddonDetails,
  updateHassioAddon,
} from "../../../src/data/hassio/addon";
import { createHassioPartialBackup } from "../../../src/data/hassio/backup";
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
import { SUPERVISOR_UPDATE_ENTRIES } from "../../../src/panels/config/dashboard/ha-config-updates";
import { HomeAssistant, Route } from "../../../src/types";
import { documentationUrl } from "../../../src/util/documentation-url";
import { addonArchIsSupported, extractChangelog } from "../util/addon";

const changelogUrl = (
  hass: HomeAssistant,
  entry: string,
  version: string
): string | undefined => {
  if (entry === "core") {
    return documentationUrl(hass, "/latest-release-notes/");
  }
  if (entry === "os") {
    return !version?.includes("dev")
      ? `https://github.com/home-assistant/operating-system/releases/tag/${version}`
      : undefined;
  }
  if (entry === "supervisor") {
    return `https://github.com/home-assistant/supervisor/releases/tag/${version}`;
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

  @state() private _updateInfo?: HassioAddonDetails;

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
      this._updateInfo?.name ||
      SUPERVISOR_UPDATE_ENTRIES[this._updateEntry]?.name;
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
        .header=${this.supervisor.localize("common.update")}
      >
        <ha-card .header=${name}>
          <div class="card-content">
            ${this._error
              ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
              : ""}
            ${this._action === null
              ? html`
                  ${this._changelogContent
                    ? html`
                        <ha-expansion-panel header="Changelog" outlined>
                          <ha-markdown .content=${this._changelogContent}>
                          </ha-markdown>
                        </ha-expansion-panel>
                      `
                    : ""}
                  <div class="versions">
                    <span></span>
                    <ha-settings-row>
                      <span slot="heading">
                        ${this.supervisor.localize("common.version")}
                      </span>
                      <span slot="description">
                        ${this._updateInfo?.version ||
                        this.supervisor[this._updateEntry]?.version}
                      </span>
                    </ha-settings-row>
                    <ha-svg-icon .path=${mdiArrowRight}></ha-svg-icon>
                    <ha-settings-row>
                      <span slot="heading">
                        ${this.supervisor.localize("common.newest_version")}
                      </span>
                      <span slot="description">
                        ${this._updateInfo?.version_latest ||
                        this.supervisor[this._updateEntry]?.version}
                      </span>
                    </ha-settings-row>
                    <span></span>
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
                            ${this.supervisor.localize("dialog.update.backup")}
                          </span>
                          <span slot="description">
                            ${this.supervisor.localize(
                              "dialog.update.create_backup",
                              {
                                name,
                              }
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
                      ? this.supervisor.localize("dialog.update.updating", {
                          name,
                          version:
                            this._updateInfo?.version ||
                            this.supervisor[this._updateEntry]?.version,
                        })
                      : this.supervisor.localize(
                          "dialog.update.creating_backup",
                          { name }
                        )}
                  </p>`}
          </div>
          ${this._action === null
            ? html`
                <div class="card-actions">
                  ${changelog
                    ? html`<a .href=${changelog} target="_blank">
                        <mwc-button>Open releasenotes</mwc-button>
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
      this._updateInfo = await fetchHassioAddonInfo(
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
      !this._updateInfo.detached && !this._updateInfo.available
        ? this._addonStoreInfo(
            this._updateInfo.slug,
            this.supervisor.store.addons
          )
        : undefined;

    if (this._updateInfo.changelog) {
      try {
        const content = await fetchHassioAddonChangelog(
          this.hass,
          this._updateEntry!
        );
        this._changelogContent = extractChangelog(this._updateInfo, content);
      } catch (err) {
        this._error = extractApiErrorMessage(err);
        return;
      }
    }

    if (!this._updateInfo.available && addonStoreInfo) {
      if (
        !addonArchIsSupported(
          this.supervisor.info.supported_arch,
          this._updateInfo.arch
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
      this._action = "backup";
      try {
        await createHassioPartialBackup(this.hass, { name: "test" });
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
      .versions {
        --mdc-icon-size: 32px;
        display: flex;
        justify-content: space-around;
        align-items: center;
        margin: auto;
      }
      .versions ha-settings-row {
        text-align: center;
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
    `;
  }
}

customElements.define("update-available-dashboard", UpdateAvailableDashboard);
