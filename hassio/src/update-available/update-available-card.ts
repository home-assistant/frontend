import "@material/mwc-list/mwc-list-item";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../src/common/dom/fire_event";
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
  extractApiErrorMessage,
  ignoreSupervisorError,
} from "../../../src/data/hassio/common";
import { fetchHassioHassOsInfo, updateOS } from "../../../src/data/hassio/host";
import {
  fetchHassioHomeAssistantInfo,
  fetchHassioSupervisorInfo,
  updateSupervisor,
} from "../../../src/data/hassio/supervisor";
import { updateCore } from "../../../src/data/supervisor/core";
import { StoreAddon } from "../../../src/data/supervisor/store";
import { Supervisor } from "../../../src/data/supervisor/supervisor";
import { showAlertDialog } from "../../../src/dialogs/generic/show-dialog-box";
import { HomeAssistant, Route } from "../../../src/types";
import { addonArchIsSupported, extractChangelog } from "../util/addon";

declare global {
  interface HASSDomEvents {
    "update-complete": undefined;
  }
}

const SUPERVISOR_UPDATE_NAMES = {
  core: "Home Assistant Core",
  os: "Home Assistant Operating System",
  supervisor: "Home Assistant Supervisor",
};

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

  @state() private _updating = false;

  @state() private _error?: string;

  private _addonStoreInfo = memoizeOne(
    (slug: string, storeAddons: StoreAddon[]) =>
      storeAddons.find((addon) => addon.slug === slug)
  );

  protected render() {
    if (
      !this._updateType ||
      (this._updateType === "addon" && !this._addonInfo)
    ) {
      return nothing;
    }

    const changelog = changelogUrl(this._updateType, this._version_latest);

    return html`
      <ha-card
        outlined
        .header=${this.supervisor.localize("update_available.update_name", {
          name: this._name,
        })}
      >
        <div class="card-content">
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : ""}
          ${this._version === this._version_latest
            ? html`<p>
                ${this.supervisor.localize("update_available.no_update", {
                  name: this._name,
                })}
              </p>`
            : !this._updating
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
                  ${this.supervisor.localize("update_available.updating", {
                    name: this._name,
                    version: this._version_latest,
                  })}
                </p>`}
        </div>
        ${this._version !== this._version_latest && !this._updating
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
                <ha-progress-button @click=${this._update} raised>
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

    switch (updateType) {
      case "addon":
        if (!this.addonSlug) {
          this.addonSlug = pathPart;
        }
        this._loadAddonData();
        break;
      case "core":
        this._loadCoreData();
        break;
      case "supervisor":
        this._loadSupervisorData();
        break;
      case "os":
        this._loadOsData();
        break;
    }
  }

  get _shouldCreateBackup(): boolean {
    if (this._updateType && !["core", "addon"].includes(this._updateType)) {
      return false;
    }
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

  private async _loadSupervisorData() {
    try {
      const supervisor = await fetchHassioSupervisorInfo(this.hass);
      fireEvent(this, "supervisor-update", { supervisor });
    } catch (err) {
      showAlertDialog(this, {
        title: this._updateType,
        text: extractApiErrorMessage(err),
      });
    }
  }

  private async _loadCoreData() {
    try {
      const core = await fetchHassioHomeAssistantInfo(this.hass);
      fireEvent(this, "supervisor-update", { core });
    } catch (err) {
      showAlertDialog(this, {
        title: this._updateType,
        text: extractApiErrorMessage(err),
      });
    }
  }

  private async _loadOsData() {
    try {
      const os = await fetchHassioHassOsInfo(this.hass);
      fireEvent(this, "supervisor-update", { os });
    } catch (err) {
      showAlertDialog(this, {
        title: this._updateType,
        text: extractApiErrorMessage(err),
      });
    }
  }

  private async _update() {
    if (this._shouldCreateBackup && this.supervisor.info.state === "freeze") {
      this._error = this.supervisor.localize("backup.backup_already_running");
      return;
    }

    this._error = undefined;
    this._updating = true;

    try {
      if (this._updateType === "addon") {
        await updateHassioAddon(
          this.hass,
          this.addonSlug!,
          this._shouldCreateBackup
        );
      } else if (this._updateType === "core") {
        await updateCore(this.hass, this._shouldCreateBackup);
      } else if (this._updateType === "os") {
        await updateOS(this.hass);
      } else if (this._updateType === "supervisor") {
        await updateSupervisor(this.hass);
      }
    } catch (err: any) {
      if (this.hass.connection.connected && !ignoreSupervisorError(err)) {
        this._error = extractApiErrorMessage(err);
        this._updating = false;
        return;
      }
    }
    fireEvent(this, "update-complete");
    this._updating = false;
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
