import {
  mdiAlertCircle,
  mdiChevronDown,
  mdiCogOutline,
  mdiContentCopy,
  mdiDelete,
  mdiDevices,
  mdiDotsVertical,
  mdiDownload,
  mdiHandExtendedOutline,
  mdiPlayCircleOutline,
  mdiPlus,
  mdiProgressHelper,
  mdiReload,
  mdiReloadAlert,
  mdiRenameBox,
  mdiShapeOutline,
  mdiStopCircleOutline,
  mdiWrench,
} from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { computeDeviceNameDisplay } from "../../../common/entity/compute_device_name";
import { caseInsensitiveStringCompare } from "../../../common/string/compare";
import { copyToClipboard } from "../../../common/util/copy-clipboard";
import "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import {
  deleteApplicationCredential,
  fetchApplicationCredentialsConfigEntry,
} from "../../../data/application_credential";
import { getSignedPath } from "../../../data/auth";
import type {
  ConfigEntry,
  DisableConfigEntryResult,
  SubEntry,
} from "../../../data/config_entries";
import {
  deleteConfigEntry,
  disableConfigEntry,
  enableConfigEntry,
  ERROR_STATES,
  getSubEntries,
  RECOVERABLE_STATES,
  reloadConfigEntry,
  updateConfigEntry,
} from "../../../data/config_entries";
import type { DeviceRegistryEntry } from "../../../data/device/device_registry";
import type { DiagnosticInfo } from "../../../data/diagnostics";
import { getConfigEntryDiagnosticsDownloadUrl } from "../../../data/diagnostics";
import type { EntityRegistryEntry } from "../../../data/entity/entity_registry";
import type { IntegrationManifest } from "../../../data/integration";
import {
  domainToName,
  fetchIntegrationManifest,
  integrationsWithPanel,
} from "../../../data/integration";
import { showConfigEntrySystemOptionsDialog } from "../../../dialogs/config-entry-system-options/show-dialog-config-entry-system-options";
import { showConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-config-flow";
import { showOptionsFlowDialog } from "../../../dialogs/config-flow/show-dialog-options-flow";
import { showSubConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-sub-config-flow";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { fileDownload } from "../../../util/file_download";
import { showToast } from "../../../util/toast";
import {
  showAlertDialog,
  showConfirmationDialog,
  showPromptDialog,
} from "../../lovelace/custom-card-helpers";
import "./ha-config-entry-device-row";
import { renderConfigEntryError } from "./ha-config-integration-page";
import "./ha-config-sub-entry-row";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";

@customElement("ha-config-entry-row")
class HaConfigEntryRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: false }) public manifest?: IntegrationManifest;

  @property({ attribute: false }) public diagnosticHandler?: DiagnosticInfo;

  @property({ attribute: false }) public entities!: EntityRegistryEntry[];

  @property({ attribute: false }) public entry!: ConfigEntry;

  @state() private _expanded = true;

  @state() private _devicesExpanded = true;

  @state() private _subEntries?: SubEntry[];

  protected willUpdate(changedProperties: PropertyValues): void {
    if (changedProperties.has("entry")) {
      this._fetchSubEntries();
    }
  }

  protected render() {
    const item = this.entry;

    let stateText: Parameters<typeof this.hass.localize> | undefined;
    let stateTextExtra: TemplateResult | string | undefined;
    let icon: string = mdiAlertCircle;

    if (!item.disabled_by && item.state === "not_loaded") {
      stateText = ["ui.panel.config.integrations.config_entry.not_loaded"];
    } else if (item.state === "setup_in_progress") {
      icon = mdiProgressHelper;
      stateText = [
        "ui.panel.config.integrations.config_entry.setup_in_progress",
      ];
    } else if (ERROR_STATES.includes(item.state)) {
      if (item.state === "setup_retry") {
        icon = mdiReloadAlert;
      }
      stateText = [
        `ui.panel.config.integrations.config_entry.state.${item.state}`,
      ];
      stateTextExtra = renderConfigEntryError(this.hass, item);
    }

    const devices = this._getDevices();
    const services = this._getServices();
    const entities = this._getEntities();

    const ownDevices = [...devices, ...services].filter(
      (device) =>
        !device.config_entries_subentries[item.entry_id].length ||
        device.config_entries_subentries[item.entry_id][0] === null
    );

    const statusLine: (TemplateResult | string)[] = [];

    if (item.disabled_by) {
      statusLine.push(
        this.hass.localize(
          "ui.panel.config.integrations.config_entry.disable.disabled_cause",
          {
            cause:
              this.hass.localize(
                `ui.panel.config.integrations.config_entry.disable.disabled_by.${item.disabled_by}`
              ) || item.disabled_by,
          }
        )
      );
      if (item.state === "failed_unload") {
        statusLine.push(`.
        ${this.hass.localize(
          "ui.panel.config.integrations.config_entry.disable_restart_confirm"
        )}.`);
      }
    } else if (!devices.length && !services.length && entities.length) {
      statusLine.push(
        html`<a
          href=${`/config/entities/?historyBack=1&config_entry=${item.entry_id}`}
          >${this.hass.localize(
            "ui.panel.config.integrations.config_entry.entities",
            { count: entities.length }
          )}</a
        >`
      );
    }

    const configPanel = this._configPanel(item.domain, this.hass.panels);

    const subEntries = this._subEntries || [];

    return html`<ha-md-list>
      <ha-md-list-item
        class=${classMap({
          config_entry: true,
          "state-not-loaded": item!.state === "not_loaded",
          "state-failed-unload": item!.state === "failed_unload",
          "state-setup": item!.state === "setup_in_progress",
          "state-error": ERROR_STATES.includes(item!.state),
          "state-disabled": item.disabled_by !== null,
          "has-subentries": this._expanded && subEntries.length > 0,
        })}
      >
        ${subEntries.length || ownDevices.length
          ? html`<ha-icon-button
              class="expand-button ${classMap({ expanded: this._expanded })}"
              .path=${mdiChevronDown}
              slot="start"
              @click=${this._toggleExpand}
            ></ha-icon-button>`
          : nothing}
        <div slot="headline">
          ${item.title || domainToName(this.hass.localize, item.domain)}
        </div>
        <div slot="supporting-text">
          <div>${statusLine}</div>
          ${stateText
            ? html`
                <div class="message">
                  <ha-svg-icon .path=${icon}></ha-svg-icon>
                  <div>
                    ${this.hass.localize(...stateText)}${stateTextExtra
                      ? html`: ${stateTextExtra}`
                      : nothing}
                  </div>
                </div>
              `
            : nothing}
        </div>
        ${item.disabled_by === "user"
          ? html`<ha-button slot="end" @click=${this._handleEnable}>
              ${this.hass.localize("ui.common.enable")}
            </ha-button>`
          : configPanel && !stateText
            ? html`<a
                slot="end"
                href=${`/${configPanel}?config_entry=${item.entry_id}`}
                ><ha-icon-button
                  .path=${mdiCogOutline}
                  .label=${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.configure"
                  )}
                >
                </ha-icon-button
              ></a>`
            : item.supports_options
              ? html`
                  <ha-icon-button
                    slot="end"
                    @click=${this._showOptions}
                    .path=${mdiCogOutline}
                    .label=${this.hass.localize(
                      "ui.panel.config.integrations.config_entry.configure"
                    )}
                  >
                  </ha-icon-button>
                `
              : nothing}
        <ha-dropdown slot="end" @wa-select=${this._handleMenuAction}>
          <ha-icon-button
            slot="trigger"
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>
          ${devices.length
            ? html`
                <a
                  href=${devices.length === 1
                    ? `/config/devices/device/${devices[0].id}`
                    : `/config/devices/dashboard?historyBack=1&config_entry=${item.entry_id}`}
                >
                  <ha-dropdown-item value="devices">
                    <ha-svg-icon .path=${mdiDevices} slot="icon"></ha-svg-icon>
                    ${this.hass.localize(
                      `ui.panel.config.integrations.config_entry.devices`,
                      { count: devices.length }
                    )}
                    <ha-icon-next slot="details"></ha-icon-next>
                  </ha-dropdown-item>
                </a>
              `
            : nothing}
          ${services.length
            ? html`
                <a
                  href=${services.length === 1
                    ? `/config/devices/device/${services[0].id}`
                    : `/config/devices/dashboard?historyBack=1&config_entry=${item.entry_id}`}
                >
                  <ha-dropdown-item value="services">
                    <ha-svg-icon
                      .path=${mdiHandExtendedOutline}
                      slot="icon"
                    ></ha-svg-icon>
                    ${this.hass.localize(
                      `ui.panel.config.integrations.config_entry.services`,
                      { count: services.length }
                    )}
                    <ha-icon-next slot="details"></ha-icon-next>
                  </ha-dropdown-item>
                </a>
              `
            : nothing}
          ${entities.length
            ? html`
                <a
                  href=${`/config/entities?historyBack=1&config_entry=${item.entry_id}`}
                >
                  <ha-dropdown-item value="entities">
                    <ha-svg-icon
                      .path=${mdiShapeOutline}
                      slot="icon"
                    ></ha-svg-icon>
                    ${this.hass.localize(
                      `ui.panel.config.integrations.config_entry.entities`,
                      { count: entities.length }
                    )}
                    <ha-icon-next slot="details"></ha-icon-next>
                  </ha-dropdown-item>
                </a>
              `
            : nothing}
          ${!item.disabled_by &&
          RECOVERABLE_STATES.includes(item.state) &&
          item.supports_unload &&
          item.source !== "system"
            ? html`
                <ha-dropdown-item value="reload">
                  <ha-svg-icon slot="icon" .path=${mdiReload}></ha-svg-icon>
                  ${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.reload"
                  )}
                </ha-dropdown-item>
              `
            : nothing}

          <ha-dropdown-item value="rename">
            <ha-svg-icon slot="icon" .path=${mdiRenameBox}></ha-svg-icon>
            ${this.hass.localize(
              "ui.panel.config.integrations.config_entry.rename"
            )}
          </ha-dropdown-item>

          <ha-dropdown-item value="copy">
            <ha-svg-icon slot="icon" .path=${mdiContentCopy}></ha-svg-icon>
            ${this.hass.localize(
              "ui.panel.config.integrations.config_entry.copy"
            )}
          </ha-dropdown-item>

          ${Object.keys(item.supported_subentry_types).map(
            (flowType) =>
              html`<ha-dropdown-item value="subentry_${flowType}">
                <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
                ${this.hass.localize(
                  `component.${item.domain}.config_subentries.${flowType}.initiate_flow.user`
                )}
              </ha-dropdown-item>`
          )}

          <wa-divider></wa-divider>

          ${this.diagnosticHandler && item.state === "loaded"
            ? html`
                <a
                  href=${getConfigEntryDiagnosticsDownloadUrl(item.entry_id)}
                  target="_blank"
                  @click=${this._signUrl}
                >
                  <ha-dropdown-item value="diagnostics">
                    <ha-svg-icon slot="icon" .path=${mdiDownload}></ha-svg-icon>
                    ${this.hass.localize(
                      "ui.panel.config.integrations.config_entry.download_diagnostics"
                    )}
                  </ha-dropdown-item>
                </a>
              `
            : nothing}
          ${!item.disabled_by &&
          item.supports_reconfigure &&
          item.source !== "system"
            ? html`
                <ha-dropdown-item value="reconfigure">
                  <ha-svg-icon slot="icon" .path=${mdiWrench}></ha-svg-icon>
                  ${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.reconfigure"
                  )}
                </ha-dropdown-item>
              `
            : nothing}

          <ha-dropdown-item value="system_options">
            <ha-svg-icon slot="icon" .path=${mdiCogOutline}></ha-svg-icon>
            ${this.hass.localize(
              "ui.panel.config.integrations.config_entry.system_options"
            )}
          </ha-dropdown-item>
          ${item.disabled_by === "user"
            ? html`
                <ha-dropdown-item value="enable">
                  <ha-svg-icon
                    slot="icon"
                    .path=${mdiPlayCircleOutline}
                  ></ha-svg-icon>
                  ${this.hass.localize("ui.common.enable")}
                </ha-dropdown-item>
              `
            : item.source !== "system"
              ? html`
                  <ha-dropdown-item variant="danger" value="disable">
                    <ha-svg-icon
                      slot="icon"
                      .path=${mdiStopCircleOutline}
                    ></ha-svg-icon>
                    ${this.hass.localize("ui.common.disable")}
                  </ha-dropdown-item>
                `
              : nothing}
          ${item.source !== "system"
            ? html`
                <ha-dropdown-item variant="danger" value="delete">
                  <ha-svg-icon slot="icon" .path=${mdiDelete}></ha-svg-icon>
                  ${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.delete"
                  )}
                </ha-dropdown-item>
              `
            : nothing}
        </ha-dropdown>
      </ha-md-list-item>
      ${this._expanded
        ? subEntries.length
          ? html`${ownDevices.length
              ? html`<ha-md-list class="devices">
                  <ha-md-list-item
                    @click=${this._toggleOwnDevices}
                    type="button"
                    class="toggle-devices-row ${classMap({
                      expanded: this._devicesExpanded,
                    })}"
                  >
                    <ha-icon-button
                      class="expand-button ${classMap({
                        expanded: this._devicesExpanded,
                      })}"
                      .path=${mdiChevronDown}
                      slot="start"
                    >
                    </ha-icon-button>
                    ${this.hass.localize(
                      "ui.panel.config.integrations.config_entry.devices_without_subentry"
                    )}
                  </ha-md-list-item>
                  ${this._devicesExpanded
                    ? ownDevices.map(
                        (device) =>
                          html`<ha-config-entry-device-row
                            .hass=${this.hass}
                            .narrow=${this.narrow}
                            .entry=${item}
                            .device=${device}
                            .entities=${entities}
                          ></ha-config-entry-device-row>`
                      )
                    : nothing}
                </ha-md-list>`
              : nothing}
            ${subEntries.map(
              (subEntry) => html`
                <ha-config-sub-entry-row
                  .hass=${this.hass}
                  .narrow=${this.narrow}
                  .manifest=${this.manifest}
                  .diagnosticHandler=${this.diagnosticHandler}
                  .entities=${this.entities}
                  .entry=${item}
                  .subEntry=${subEntry}
                  data-entry-id=${item.entry_id}
                ></ha-config-sub-entry-row>
              `
            )}`
          : html`
              ${ownDevices.map(
                (device) =>
                  html`<ha-config-entry-device-row
                    .hass=${this.hass}
                    .narrow=${this.narrow}
                    .entry=${item}
                    .device=${device}
                    .entities=${entities}
                  ></ha-config-entry-device-row>`
              )}
            `
        : nothing}
    </ha-md-list>`;
  }

  private async _fetchSubEntries() {
    this._subEntries = this.entry.num_subentries
      ? (await getSubEntries(this.hass, this.entry.entry_id)).sort((a, b) =>
          caseInsensitiveStringCompare(
            a.title,
            b.title,
            this.hass.locale.language
          )
        )
      : undefined;
  }

  private _configPanel = memoizeOne(
    (domain: string, panels: HomeAssistant["panels"]): string | undefined =>
      Object.values(panels).find(
        (panel) => panel.config_panel_domain === domain
      )?.url_path || integrationsWithPanel[domain]
  );

  private _getEntities = (): EntityRegistryEntry[] =>
    this.entities.filter(
      (entity) => entity.config_entry_id === this.entry.entry_id
    );

  private _getDevices = (): DeviceRegistryEntry[] =>
    Object.values(this.hass.devices)
      .filter(
        (device) =>
          device.config_entries.includes(this.entry.entry_id) &&
          device.entry_type !== "service"
      )
      .sort((a, b) =>
        caseInsensitiveStringCompare(
          computeDeviceNameDisplay(a, this.hass),
          computeDeviceNameDisplay(b, this.hass),
          this.hass.locale.language
        )
      );

  private _getServices = (): DeviceRegistryEntry[] =>
    Object.values(this.hass.devices)
      .filter(
        (device) =>
          device.config_entries.includes(this.entry.entry_id) &&
          device.entry_type === "service"
      )
      .sort((a, b) =>
        caseInsensitiveStringCompare(
          computeDeviceNameDisplay(a, this.hass),
          computeDeviceNameDisplay(b, this.hass),
          this.hass.locale.language
        )
      );

  private _toggleExpand() {
    this._expanded = !this._expanded;
  }

  private _toggleOwnDevices() {
    this._devicesExpanded = !this._devicesExpanded;
  }

  private _handleMenuAction = (ev: HaDropdownSelectEvent) => {
    ev.stopPropagation();
    const value = ev.detail.item.value;
    if (value === "reload") {
      this._handleReload();
      return;
    }
    if (value === "rename") {
      this._handleRename();
      return;
    }
    if (value === "copy") {
      this._handleCopy();
      return;
    }
    if (value === "reconfigure") {
      this._handleReconfigure();
      return;
    }
    if (value === "system_options") {
      this._handleSystemOptions();
      return;
    }
    if (value === "enable") {
      this._handleEnable();
      return;
    }
    if (value === "disable") {
      this._handleDisable();
      return;
    }
    if (value === "delete") {
      this._handleDelete();
      return;
    }
    if (value?.startsWith("subentry_")) {
      const flowType = value.substring(9);
      this._addSubEntry(flowType);
    }
    // devices, services, entities, diagnostics are handled by href navigation
  };

  private _showOptions() {
    showOptionsFlowDialog(this, this.entry, { manifest: this.manifest });
  }

  // Return an application credentials id for this config entry to prompt the
  // user for removal. This is best effort so we don't stop overall removal
  // if the integration isn't loaded or there is some other error.
  private async _applicationCredentialForRemove(entryId: string) {
    try {
      return (await fetchApplicationCredentialsConfigEntry(this.hass, entryId))
        .application_credentials_id;
    } catch (_err: any) {
      // We won't prompt the user to remove credentials
      return null;
    }
  }

  private async _removeApplicationCredential(applicationCredentialsId: string) {
    const confirmed = await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.integrations.config_entry.application_credentials.delete_title"
      ),
      text: html`${this.hass.localize(
          "ui.panel.config.integrations.config_entry.application_credentials.delete_prompt"
        )},
        <br />
        <br />
        ${this.hass.localize(
          "ui.panel.config.integrations.config_entry.application_credentials.delete_detail"
        )}
        <br />
        <br />
        <a
          href=${documentationUrl(
            this.hass,
            "/integrations/application_credentials/"
          )}
          target="_blank"
          rel="noreferrer"
        >
          ${this.hass.localize(
            "ui.panel.config.integrations.config_entry.application_credentials.learn_more"
          )}
        </a>`,
      destructive: true,
      confirmText: this.hass.localize("ui.common.remove"),
      dismissText: this.hass.localize(
        "ui.panel.config.integrations.config_entry.application_credentials.dismiss"
      ),
    });
    if (!confirmed) {
      return;
    }
    try {
      await deleteApplicationCredential(this.hass, applicationCredentialsId);
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.integrations.config_entry.application_credentials.delete_error_title"
        ),
        text: err.message,
      });
    }
  }

  private _handleReload = async () => {
    const result = await reloadConfigEntry(this.hass, this.entry.entry_id);
    const locale_key = result.require_restart
      ? "reload_restart_confirm"
      : "reload_confirm";
    showAlertDialog(this, {
      text: this.hass.localize(
        `ui.panel.config.integrations.config_entry.${locale_key}`
      ),
    });
  };

  private _handleReconfigure = async () => {
    showConfigFlowDialog(this, {
      startFlowHandler: this.entry.domain,
      showAdvanced: this.hass.userData?.showAdvanced,
      manifest: await fetchIntegrationManifest(this.hass, this.entry.domain),
      entryId: this.entry.entry_id,
      navigateToResult: true,
    });
  };

  private _handleCopy = async () => {
    await copyToClipboard(this.entry.entry_id);
    showToast(this, {
      message:
        this.hass?.localize("ui.common.copied_clipboard") ||
        "Copied to clipboard",
    });
  };

  private _handleRename = async () => {
    const newName = await showPromptDialog(this, {
      title: this.hass.localize("ui.panel.config.integrations.rename_dialog"),
      defaultValue: this.entry.title,
      inputLabel: this.hass.localize(
        "ui.panel.config.integrations.rename_input_label"
      ),
    });
    if (newName === null) {
      return;
    }
    await updateConfigEntry(this.hass, this.entry.entry_id, {
      title: newName,
    });
  };

  private async _signUrl(ev) {
    const anchor = ev.currentTarget;
    ev.preventDefault();
    const signedUrl = await getSignedPath(
      this.hass,
      anchor.getAttribute("href")
    );
    fileDownload(signedUrl.path);
  }

  private _handleDisable = async () => {
    const entryId = this.entry.entry_id;

    const confirmed = await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.integrations.config_entry.disable_confirm_title",
        { title: this.entry.title }
      ),
      text: this.hass.localize(
        "ui.panel.config.integrations.config_entry.disable_confirm_text"
      ),
      confirmText: this.hass!.localize("ui.common.disable"),
      dismissText: this.hass!.localize("ui.common.cancel"),
      destructive: true,
    });

    if (!confirmed) {
      return;
    }
    let result: DisableConfigEntryResult;
    try {
      result = await disableConfigEntry(this.hass, entryId);
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.integrations.config_entry.disable_error"
        ),
        text: err.message,
      });
      return;
    }
    if (result.require_restart) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.config.integrations.config_entry.disable_restart_confirm"
        ),
      });
    }
  };

  private _handleEnable = async () => {
    const entryId = this.entry.entry_id;

    let result: DisableConfigEntryResult;
    try {
      result = await enableConfigEntry(this.hass, entryId);
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.integrations.config_entry.disable_error"
        ),
        text: err.message,
      });
      return;
    }

    if (result.require_restart) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.config.integrations.config_entry.enable_restart_confirm"
        ),
      });
    }
  };

  private _handleDelete = async () => {
    const entryId = this.entry.entry_id;

    const applicationCredentialsId =
      await this._applicationCredentialForRemove(entryId);

    const confirmed = await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.integrations.config_entry.delete_confirm_title",
        { title: this.entry.title }
      ),
      text: this.hass.localize(
        "ui.panel.config.integrations.config_entry.delete_confirm_text"
      ),
      confirmText: this.hass!.localize("ui.common.delete"),
      dismissText: this.hass!.localize("ui.common.cancel"),
      destructive: true,
    });

    if (!confirmed) {
      return;
    }
    const result = await deleteConfigEntry(this.hass, entryId);

    if (result.require_restart) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.config.integrations.config_entry.restart_confirm"
        ),
      });
    }
    if (applicationCredentialsId) {
      this._removeApplicationCredential(applicationCredentialsId);
    }
  };

  private _handleSystemOptions = () => {
    showConfigEntrySystemOptionsDialog(this, {
      entry: this.entry,
      manifest: this.manifest,
    });
  };

  private _addSubEntry = (flowType: string) => {
    showSubConfigFlowDialog(this, this.entry, flowType, {
      startFlowHandler: this.entry.entry_id,
    });
  };

  static styles = [
    haStyle,
    css`
      .expand-button {
        margin: 0 -12px;
        transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1);
      }
      .expand-button.expanded {
        transform: rotate(180deg);
      }
      ha-md-list {
        border: 1px solid var(--divider-color);
        border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
        padding: 0;
      }
      :host([narrow]) {
        margin-left: -12px;
        margin-right: -12px;
      }
      ha-md-list.devices {
        margin: 16px;
        margin-top: 0;
      }
      a ha-icon-button {
        color: var(
          --md-list-item-trailing-icon-color,
          var(--md-sys-color-on-surface-variant, #49454f)
        );
      }
      .toggle-devices-row {
        overflow: hidden;
        border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
      }
      .toggle-devices-row.expanded {
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
      }
      ha-dropdown a {
        text-decoration: none;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-entry-row": HaConfigEntryRow;
  }
}
