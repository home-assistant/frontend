import "@material/mwc-list/mwc-list-item";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../src/common/dom/fire_event";
import "../../../src/common/search/search-input";
import "../../../src/components/buttons/ha-progress-button";
import "../../../src/components/ha-alert";
import "../../../src/components/ha-button-menu";
import "../../../src/components/ha-card";
import "../../../src/components/ha-checkbox";
import "../../../src/components/ha-faded";
import "../../../src/components/ha-formfield";
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
import { addonArchIsSupported, extractChangelog } from "../util/addon";

declare global {
  interface HASSDomEvents {
    "update-complete": undefined;
  }
}

type updateType = "os" | "supervisor" | "core" | "addon";

const changelogUrl = (
  entry: updateType,
  version: string
): string | undefined => {
  if (entry === "addon") {
    return undefined;
  }
  if (entry === "core") {
    return version.includes("dev")
      ? "https://github.com/home-assistant/core/commits/dev"
      : version.includes("b")
      ? "https://next.home-assistant.io/latest-release-notes/"
      : "https://www.home-assistant.io/latest-release-notes/";
  }
  if (entry === "os") {
    return version.includes("dev")
      ? "https://github.com/home-assistant/operating-system/commits/dev"
      : `https://github.com/home-assistant/operating-system/releases/tag/${version}`;
  }
  if (entry === "supervisor") {
    return version.includes("dev")
      ? "https://github.com/home-assistant/supervisor/commits/main"
      : `https://github.com/home-assistant/supervisor/releases/tag/${version}`;
  }
  return undefined;
};

@customElement("update-available-card")
class UpdateAvailableCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false }) public addonSlug?: string;

  @state() private _updateType?: updateType;

  @state() private _changelogContent?: string;

  @state() private _addonInfo?: HassioAddonDetails;

  @state() private _action: "backup" | "update" | null = null;

  @state() private _error?: string;

  private _addonStoreInfo = memoizeOne(
    (slug: string, storeAddons: StoreAddon[]) =>
      storeAddons.find((addon) => addon.slug === slug)
  );

  protected render(): TemplateResult {
    if (
      !this._updateType ||
      (this._updateType === "addon" && !this._addonInfo)
    ) {
      return html``;
    }

    const changelog = changelogUrl(this._updateType, this._version_latest);

    return html`
      <ha-card
        .header=${this.supervisor.localize("update_available.update_name", {
          name: this._name,
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
                    ${this.supervisor.localize("update_available.description", {
                      name: this._name,
                      version: this._version,
                      newest_version: this._version_latest,
                    })}
                  </p>
                </div>
                ${["core", "addon"].includes(this._updateType)
                  ? html`
                      <ha-formfield
                        .label=${this.supervisor.localize(
                          "update_available.create_backup"
                        )}
                      >
                        <ha-checkbox checked></ha-checkbox>
                      </ha-formfield>
                    `
                  : ""}
              `
            : html`<ha-circular-progress alt="Updating" size="large" active>
                </ha-circular-progress>
                <p class="progress-text">
                  ${this._action === "update"
                    ? this.supervisor.localize("update_available.updating", {
                        name: this._name,
                        version: this._version_latest,
                      })
                    : this.supervisor.localize(
                        "update_available.creating_backup",
                        { name: this._name }
                      )}
                </p>`}
        </div>
        ${this._action === null
          ? html`
              <div class="card-actions">
                ${changelog
                  ? html`<a .href=${changelog} target="_blank" rel="noreferrer">
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
                  .disabled=${!this._version ||
                  (this._shouldCreateBackup &&
                    this.supervisor.info?.state !== "running")}
                  @click=${this._update}
                  raised
                >
                  ${this.supervisor.localize("common.update")}
                </ha-progress-button>
              </div>
            `
          : ""}
      </ha-card>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    const pathPart = this.route?.path.substring(1, this.route.path.length);
    const updateType = ["core", "os", "supervisor"].includes(pathPart)
      ? pathPart
      : "addon";
    this._updateType = updateType as updateType;

    if (updateType === "addon") {
      if (!this.addonSlug) {
        this.addonSlug = pathPart;
      }
      this._loadAddonData();
    }
  }

  get _shouldCreateBackup(): boolean {
    const checkbox = this.shadowRoot?.querySelector("ha-checkbox");
    if (checkbox) {
      return checkbox.checked;
    }
    return true;
  }

  get _version(): string {
    return this._updateType
      ? this._updateType === "addon"
        ? this._addonInfo!.version
        : this.supervisor[this._updateType]?.version || ""
      : "";
  }

  get _version_latest(): string {
    return this._updateType
      ? this._updateType === "addon"
        ? this._addonInfo!.version_latest
        : this.supervisor[this._updateType]?.version_latest || ""
      : "";
  }

  get _name(): string {
    return this._updateType
      ? this._updateType === "addon"
        ? this._addonInfo!.name
        : SUPERVISOR_UPDATE_NAMES[this._updateType]
      : "";
  }

  private async _loadAddonData() {
    try {
      this._addonInfo = await fetchHassioAddonInfo(this.hass, this.addonSlug!);
    } catch (err) {
      showAlertDialog(this, {
        title: this._updateType,
        text: extractApiErrorMessage(err),
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
          this.addonSlug!
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
          "addon.dashboard.not_available_version",
          {
            core_version_installed: this.supervisor.core.version,
            core_version_needed: addonStoreInfo.homeassistant,
          }
        );
      }
    }
  }

  private async _update() {
    this._error = undefined;
    if (this._shouldCreateBackup) {
      let backupArgs: HassioPartialBackupCreateParams;
      if (this._updateType === "addon") {
        backupArgs = {
          name: `addon_${this.addonSlug}_${this._version}`,
          addons: [this.addonSlug!],
          homeassistant: false,
        };
      } else {
        backupArgs = {
          name: `${this._updateType}_${this._version}`,
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
      if (this._updateType === "addon") {
        await updateHassioAddon(this.hass, this.addonSlug!);
      } else if (this._updateType === "core") {
        await updateCore(this.hass);
      } else if (this._updateType === "os") {
        await updateOS(this.hass);
      } else if (this._updateType === "supervisor") {
        await updateSupervisor(this.hass);
      }
    } catch (err: any) {
      if (this.hass.connection.connected && !ignoreSupervisorError(err)) {
        this._error = extractApiErrorMessage(err);
        this._action = null;
        return;
      }
    }
    fireEvent(this, "update-complete");
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
      }
      ha-card {
        margin: auto;
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
        border-top: none;
        padding: 0 8px 8px;
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
        padding-bottom: 8px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "update-available-card": UpdateAvailableCard;
  }
}
