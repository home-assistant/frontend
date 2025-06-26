import {
  mdiAlertCircle,
  mdiChevronDown,
  mdiChevronUp,
  mdiCogOutline,
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
import { isDevVersion } from "../../../common/config/version";
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
import type { DeviceRegistryEntry } from "../../../data/device_registry";
import type { DiagnosticInfo } from "../../../data/diagnostics";
import { getConfigEntryDiagnosticsDownloadUrl } from "../../../data/diagnostics";
import type { EntityRegistryEntry } from "../../../data/entity_registry";
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
import type { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { fileDownload } from "../../../util/file_download";
import {
  showAlertDialog,
  showConfirmationDialog,
  showPromptDialog,
} from "../../lovelace/custom-card-helpers";
import "./ha-config-entry-device-row";
import { renderConfigEntryError } from "./ha-config-integration-page";
import "./ha-config-sub-entry-row";
import { haStyle } from "../../../resources/styles";

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
          >${entities.length} entities</a
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
              class="expand-button"
              .path=${this._expanded ? mdiChevronDown : mdiChevronUp}
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
          ? html`<ha-button unelevated slot="end" @click=${this._handleEnable}>
              ${this.hass.localize("ui.common.enable")}
            </ha-button>`
          : configPanel &&
              (item.domain !== "matter" ||
                isDevVersion(this.hass.config.version)) &&
              !stateText
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
        <ha-md-button-menu positioning="popover" slot="end">
          <ha-icon-button
            slot="trigger"
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>
          ${devices.length
            ? html`
                <ha-md-menu-item
                  href=${devices.length === 1
                    ? `/config/devices/device/${devices[0].id}`
                    : `/config/devices/dashboard?historyBack=1&config_entry=${item.entry_id}`}
                >
                  <ha-svg-icon .path=${mdiDevices} slot="start"></ha-svg-icon>
                  ${this.hass.localize(
                    `ui.panel.config.integrations.config_entry.devices`,
                    { count: devices.length }
                  )}
                  <ha-icon-next slot="end"></ha-icon-next>
                </ha-md-menu-item>
              `
            : nothing}
          ${services.length
            ? html`<ha-md-menu-item
                href=${services.length === 1
                  ? `/config/devices/device/${services[0].id}`
                  : `/config/devices/dashboard?historyBack=1&config_entry=${item.entry_id}`}
              >
                <ha-svg-icon
                  .path=${mdiHandExtendedOutline}
                  slot="start"
                ></ha-svg-icon>
                ${this.hass.localize(
                  `ui.panel.config.integrations.config_entry.services`,
                  { count: services.length }
                )}
                <ha-icon-next slot="end"></ha-icon-next>
              </ha-md-menu-item> `
            : nothing}
          ${entities.length
            ? html`
                <ha-md-menu-item
                  href=${`/config/entities?historyBack=1&config_entry=${item.entry_id}`}
                >
                  <ha-svg-icon
                    .path=${mdiShapeOutline}
                    slot="start"
                  ></ha-svg-icon>
                  ${this.hass.localize(
                    `ui.panel.config.integrations.config_entry.entities`,
                    { count: entities.length }
                  )}
                  <ha-icon-next slot="end"></ha-icon-next>
                </ha-md-menu-item>
              `
            : nothing}
          ${!item.disabled_by &&
          RECOVERABLE_STATES.includes(item.state) &&
          item.supports_unload &&
          item.source !== "system"
            ? html`
                <ha-md-menu-item @click=${this._handleReload}>
                  <ha-svg-icon slot="start" .path=${mdiReload}></ha-svg-icon>
                  ${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.reload"
                  )}
                </ha-md-menu-item>
              `
            : nothing}

          <ha-md-menu-item @click=${this._handleRename} graphic="icon">
            <ha-svg-icon slot="start" .path=${mdiRenameBox}></ha-svg-icon>
            ${this.hass.localize(
              "ui.panel.config.integrations.config_entry.rename"
            )}
          </ha-md-menu-item>

          ${Object.keys(item.supported_subentry_types).map(
            (flowType) =>
              html`<ha-md-menu-item
                @click=${this._addSubEntry}
                .entry=${item}
                .flowType=${flowType}
                graphic="icon"
              >
                <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
                ${this.hass.localize(
                  `component.${item.domain}.config_subentries.${flowType}.initiate_flow.user`
                )}</ha-md-menu-item
              >`
          )}

          <ha-md-divider role="separator" tabindex="-1"></ha-md-divider>

          ${this.diagnosticHandler && item.state === "loaded"
            ? html`
                <ha-md-menu-item
                  href=${getConfigEntryDiagnosticsDownloadUrl(item.entry_id)}
                  target="_blank"
                  @click=${this._signUrl}
                >
                  <ha-svg-icon slot="start" .path=${mdiDownload}></ha-svg-icon>
                  ${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.download_diagnostics"
                  )}
                </ha-md-menu-item>
              `
            : nothing}
          ${!item.disabled_by &&
          item.supports_reconfigure &&
          item.source !== "system"
            ? html`
                <ha-md-menu-item @click=${this._handleReconfigure}>
                  <ha-svg-icon slot="start" .path=${mdiWrench}></ha-svg-icon>
                  ${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.reconfigure"
                  )}
                </ha-md-menu-item>
              `
            : nothing}

          <ha-md-menu-item @click=${this._handleSystemOptions} graphic="icon">
            <ha-svg-icon slot="start" .path=${mdiCogOutline}></ha-svg-icon>
            ${this.hass.localize(
              "ui.panel.config.integrations.config_entry.system_options"
            )}
          </ha-md-menu-item>
          ${item.disabled_by === "user"
            ? html`
                <ha-md-menu-item @click=${this._handleEnable}>
                  <ha-svg-icon
                    slot="start"
                    .path=${mdiPlayCircleOutline}
                  ></ha-svg-icon>
                  ${this.hass.localize("ui.common.enable")}
                </ha-md-menu-item>
              `
            : item.source !== "system"
              ? html`
                  <ha-md-menu-item
                    class="warning"
                    @click=${this._handleDisable}
                    graphic="icon"
                  >
                    <ha-svg-icon
                      slot="start"
                      class="warning"
                      .path=${mdiStopCircleOutline}
                    ></ha-svg-icon>
                    ${this.hass.localize("ui.common.disable")}
                  </ha-md-menu-item>
                `
              : nothing}
          ${item.source !== "system"
            ? html`
                <ha-md-menu-item class="warning" @click=${this._handleDelete}>
                  <ha-svg-icon
                    slot="start"
                    class="warning"
                    .path=${mdiDelete}
                  ></ha-svg-icon>
                  ${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.delete"
                  )}
                </ha-md-menu-item>
              `
            : nothing}
        </ha-md-button-menu>
      </ha-md-list-item>
      ${this._expanded
        ? subEntries.length
          ? html`${ownDevices.length
              ? html`<ha-md-list class="devices">
                  <ha-md-list-item
                    @click=${this._toggleOwnDevices}
                    type="button"
                    class="toggle-devices-row ${this._devicesExpanded
                      ? "expanded"
                      : ""}"
                  >
                    <ha-icon-button
                      class="expand-button"
                      .path=${this._devicesExpanded
                        ? mdiChevronDown
                        : mdiChevronUp}
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
      ? await getSubEntries(this.hass, this.entry.entry_id)
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
    Object.values(this.hass.devices).filter(
      (device) =>
        device.config_entries.includes(this.entry.entry_id) &&
        device.entry_type !== "service"
    );

  private _getServices = (): DeviceRegistryEntry[] =>
    Object.values(this.hass.devices).filter(
      (device) =>
        device.config_entries.includes(this.entry.entry_id) &&
        device.entry_type === "service"
    );

  private _toggleExpand() {
    this._expanded = !this._expanded;
  }

  private _toggleOwnDevices() {
    this._devicesExpanded = !this._devicesExpanded;
  }

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

  private async _handleReload() {
    const result = await reloadConfigEntry(this.hass, this.entry.entry_id);
    const locale_key = result.require_restart
      ? "reload_restart_confirm"
      : "reload_confirm";
    showAlertDialog(this, {
      text: this.hass.localize(
        `ui.panel.config.integrations.config_entry.${locale_key}`
      ),
    });
  }

  private async _handleReconfigure() {
    showConfigFlowDialog(this, {
      startFlowHandler: this.entry.domain,
      showAdvanced: this.hass.userData?.showAdvanced,
      manifest: await fetchIntegrationManifest(this.hass, this.entry.domain),
      entryId: this.entry.entry_id,
      navigateToResult: true,
    });
  }

  private async _handleRename() {
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
  }

  private async _signUrl(ev) {
    const anchor = ev.currentTarget;
    ev.preventDefault();
    const signedUrl = await getSignedPath(
      this.hass,
      anchor.getAttribute("href")
    );
    fileDownload(signedUrl.path);
  }

  private async _handleDisable() {
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
  }

  private async _handleEnable() {
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
  }

  private async _handleDelete() {
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
  }

  private _handleSystemOptions() {
    showConfigEntrySystemOptionsDialog(this, {
      entry: this.entry,
      manifest: this.manifest,
    });
  }

  private _addSubEntry(ev) {
    showSubConfigFlowDialog(this, this.entry, ev.target.flowType, {
      startFlowHandler: this.entry.entry_id,
    });
  }

  static styles = [
    haStyle,
    css`
      .expand-button {
        margin: 0 -12px;
      }
      ha-md-list {
        border: 1px solid var(--divider-color);
        border-radius: var(--ha-card-border-radius, 12px);
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
        border-radius: var(--ha-card-border-radius, 12px);
      }
      .toggle-devices-row.expanded {
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-entry-row": HaConfigEntryRow;
  }
}
