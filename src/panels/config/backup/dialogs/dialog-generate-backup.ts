import { mdiClose } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-icon-button-prev";
import "../../../../components/ha-md-list";
import "../../../../components/ha-md-list-item";
import "../../../../components/ha-select";
import "../../../../components/ha-textfield";
import "../../../../components/ha-wa-dialog";
import type {
  BackupAgent,
  BackupConfig,
  GenerateBackupParams,
} from "../../../../data/backup";
import {
  CLOUD_AGENT,
  compareAgents,
  fetchBackupAgentsInfo,
  fetchBackupConfig,
} from "../../../../data/backup";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import "../components/config/ha-backup-config-data";
import type { BackupConfigData } from "../components/config/ha-backup-config-data";
import "../components/ha-backup-agents-picker";
import type { GenerateBackupDialogParams } from "./show-dialog-generate-backup";

interface FormData {
  name: string;
  agents_mode: "all" | "custom";
  agent_ids: string[];
  data: BackupConfigData;
}

const INITIAL_DATA: FormData = {
  data: {
    include_homeassistant: true,
    include_database: true,
    include_folders: [],
    include_all_addons: true,
  },
  name: "",
  agents_mode: "all",
  agent_ids: [],
};

const STEPS = ["data", "sync"] as const;

const DISALLOWED_AGENTS_NO_HA = [CLOUD_AGENT];

@customElement("ha-dialog-generate-backup")
class DialogGenerateBackup extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _step?: "data" | "sync";

  @state() private _agents: BackupAgent[] = [];

  @state() private _backupConfig?: BackupConfig;

  @state() private _params?: GenerateBackupDialogParams;

  @state() private _formData?: FormData;

  @state() private _open = false;

  public showDialog(_params: GenerateBackupDialogParams): void {
    this._step = STEPS[0];
    this._formData = INITIAL_DATA;
    this._params = _params;
    this._open = true;

    this._fetchAgents();
    this._fetchBackupConfig();
  }

  private _dialogClosed() {
    if (this._params!.cancel) {
      this._params!.cancel();
    }
    this._open = false;
    this._step = undefined;
    this._formData = undefined;
    this._agents = [];
    this._backupConfig = undefined;
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private async _fetchAgents() {
    const { agents } = await fetchBackupAgentsInfo(this.hass);
    this._agents = agents
      .filter(
        (agent) =>
          agent.agent_id !== CLOUD_AGENT ||
          (this._params?.cloudStatus?.logged_in &&
            this._params?.cloudStatus?.active_subscription)
      )
      .sort((a, b) => compareAgents(a.agent_id, b.agent_id));
  }

  private async _fetchBackupConfig() {
    const { config } = await fetchBackupConfig(this.hass);
    this._backupConfig = config;
  }

  public closeDialog() {
    this._open = false;
    return true;
  }

  private _previousStep() {
    const index = STEPS.indexOf(this._step!);
    if (index === 0) {
      return;
    }
    this._step = STEPS[index - 1];
  }

  private _nextStep() {
    const index = STEPS.indexOf(this._step!);
    if (index === STEPS.length - 1) {
      return;
    }
    this._step = STEPS[index + 1];
  }

  private get _allAgentIds() {
    return this._agents.map((agent) => agent.agent_id);
  }

  protected willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);

    if (changedProperties.has("_step")) {
      if (this._step === "sync" && this._formData) {
        const disallowedAgents = this._disabledAgentIds();
        if (disallowedAgents.length) {
          // Remove disallowed agents from the list
          const agentsIds =
            this._formData.agents_mode === "all"
              ? this._allAgentIds
              : this._formData.agent_ids;

          const filteredAgents = agentsIds.filter(
            (agentId) => !disallowedAgents.includes(agentId)
          );
          this._formData = {
            ...this._formData,
            agents_mode: "custom",
            agent_ids: filteredAgents,
          };
        }
      }
    }
  }

  protected render() {
    if (!this._step || !this._formData) {
      return nothing;
    }

    const dialogTitle = this.hass.localize(
      `ui.panel.config.backup.dialogs.generate.${this._step}.title`
    );

    const isFirstStep = this._step === STEPS[0];
    const isLastStep = this._step === STEPS[STEPS.length - 1];

    const selectedAgents = this._formData.agent_ids;

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        @closed=${this._dialogClosed}
      >
        <ha-dialog-header slot="header">
          ${isFirstStep
            ? html`
                <ha-icon-button
                  slot="navigationIcon"
                  data-dialog="close"
                  .label=${this.hass.localize("ui.common.close")}
                  .path=${mdiClose}
                ></ha-icon-button>
              `
            : html`
                <ha-icon-button-prev
                  slot="navigationIcon"
                  @click=${this._previousStep}
                ></ha-icon-button-prev>
              `}
          <span slot="title" .title=${dialogTitle}> ${dialogTitle} </span>
        </ha-dialog-header>
        <div class="content">
          ${this._step === "data" ? this._renderData() : this._renderSync()}
        </div>
        <ha-dialog-footer slot="footer">
          ${isFirstStep
            ? html`
                <ha-button
                  slot="secondaryAction"
                  @click=${this.closeDialog}
                  appearance="plain"
                >
                  ${this.hass.localize("ui.common.cancel")}
                </ha-button>
              `
            : nothing}
          ${isLastStep
            ? html`
                <ha-button
                  slot="primaryAction"
                  @click=${this._submit}
                  .disabled=${this._formData.agents_mode === "custom" &&
                  !selectedAgents.length}
                >
                  ${this.hass.localize(
                    "ui.panel.config.backup.dialogs.generate.actions.create"
                  )}
                </ha-button>
              `
            : html`
                <ha-button
                  slot="primaryAction"
                  @click=${this._nextStep}
                  .disabled=${this._step === "data" && this._noDataSelected}
                >
                  ${this.hass.localize("ui.common.next")}
                </ha-button>
              `}
        </ha-dialog-footer>
      </ha-wa-dialog>
    `;
  }

  private get _noDataSelected() {
    const hassio = isComponentLoaded(this.hass, "hassio");
    if (
      this._formData?.data.include_homeassistant ||
      this._formData?.data.include_database ||
      (hassio && this._formData?.data.include_folders?.length) ||
      (hassio && this._formData?.data.include_all_addons) ||
      (hassio && this._formData?.data.include_addons?.length)
    ) {
      return false;
    }
    return true;
  }

  private _renderData() {
    if (!this._formData) {
      return nothing;
    }

    return html`
      <ha-backup-config-data
        .hass=${this.hass}
        .value=${this._formData.data}
        @value-changed=${this._dataConfigChanged}
      ></ha-backup-config-data>
    `;
  }

  private _dataConfigChanged(ev) {
    ev.stopPropagation();
    const data = ev.detail.value as BackupConfigData;
    this._formData = {
      ...this._formData!,
      data,
    };
  }

  private _renderSync() {
    if (!this._formData) {
      return nothing;
    }

    const disabledAgentIds = this._disabledAgentIds();

    return html`
      <ha-textfield
        name="name"
        .label=${this.hass.localize(
          "ui.panel.config.backup.dialogs.generate.sync.name"
        )}
        .value=${this._formData.name}
        @change=${this._nameChanged}
      >
      </ha-textfield>
      <ha-md-list>
        <ha-md-list-item>
          <span slot="headline">
            ${this.hass.localize(
              "ui.panel.config.backup.dialogs.generate.sync.locations"
            )}
          </span>
          <span slot="supporting-text">
            ${this.hass.localize(
              "ui.panel.config.backup.dialogs.generate.sync.locations_description"
            )}
          </span>
          <ha-select
            slot="end"
            @selected=${this._selectChanged}
            .value=${this._formData.agents_mode}
            .options=${[
              {
                value: "all",
                label: this.hass.localize(
                  "ui.panel.config.backup.dialogs.generate.sync.locations_options.all",
                  { count: this._allAgentIds.length }
                ),
                disabled: !!disabledAgentIds.length,
              },
              {
                value: "custom",
                label: this.hass.localize(
                  "ui.panel.config.backup.dialogs.generate.sync.locations_options.custom"
                ),
              },
            ]}
          ></ha-select>
        </ha-md-list-item>
      </ha-md-list>
      ${disabledAgentIds.length
        ? html`
            <ha-alert
              alert-type="info"
              .title=${this.hass.localize(
                "ui.panel.config.backup.dialogs.generate.sync.ha_cloud_alert.title"
              )}
            >
              ${this.hass.localize(
                "ui.panel.config.backup.dialogs.generate.sync.ha_cloud_alert.description"
              )}
            </ha-alert>
          `
        : nothing}
      ${this._formData.agents_mode === "custom"
        ? html`
            <ha-expansion-panel
              .header=${this.hass.localize(
                "ui.panel.config.backup.dialogs.generate.sync.locations"
              )}
              outlined
              expanded
            >
              <ha-backup-agents-picker
                .hass=${this.hass}
                .value=${this._formData.agent_ids}
                @value-changed=${this._agentsChanged}
                .agents=${this._agents}
                .disabledAgentIds=${disabledAgentIds}
              ></ha-backup-agents-picker>
            </ha-expansion-panel>
          `
        : nothing}
    `;
  }

  private _selectChanged(ev: ValueChangedEvent<"custom" | "all">) {
    const value = ev.detail.value;
    this._formData = {
      ...this._formData!,
      agents_mode: value,
    };
  }

  private _agentsChanged(ev) {
    this._formData = {
      ...this._formData!,
      agent_ids: ev.detail.value,
    };
  }

  private _nameChanged(ev) {
    this._formData = {
      ...this._formData!,
      name: ev.target.value,
    };
  }

  private _disabledAgentIds() {
    if (!this._formData) {
      return [];
    }
    const allAgents = this._allAgentIds;
    return !this._formData.data.include_homeassistant
      ? DISALLOWED_AGENTS_NO_HA.filter((agentId) => allAgents.includes(agentId))
      : [];
  }

  private async _submit() {
    if (!this._formData) {
      return;
    }

    const { agent_ids, agents_mode, name, data } = this._formData;

    const password = this._backupConfig?.create_backup.password || undefined;

    const params: GenerateBackupParams = {
      name,
      password,
      agent_ids: agents_mode === "all" ? this._allAgentIds : agent_ids,
      // We always include homeassistant if we include database
      include_homeassistant:
        data.include_homeassistant || data.include_database,
      include_database: data.include_database,
    };

    if (isComponentLoaded(this.hass, "hassio")) {
      params.include_folders = data.include_folders;
      params.include_all_addons = data.include_all_addons;
      params.include_addons = data.include_addons;
    }

    // Ensure we don't upload to disallowed agents if we are not including homeassistant
    if (!params.include_homeassistant) {
      params.agent_ids = params.agent_ids.filter(
        (agentId) => !DISALLOWED_AGENTS_NO_HA.includes(agentId)
      );
    }

    this._params!.submit?.(params);
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-wa-dialog {
          --dialog-content-padding: 24px;
        }
        ha-md-list {
          background: none;
          padding: 0;
        }
        ha-md-list-item {
          --md-list-item-leading-space: 0;
          --md-list-item-trailing-space: 0;
        }
        ha-md-list-item ha-select {
          min-width: 210px;
        }
        @media all and (max-width: 450px) {
          ha-md-list-item ha-select {
            min-width: 160px;
            width: 160px;
          }
        }
        ha-md-list-item ha-select > span {
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
        }
        ha-textfield {
          width: 100%;
        }
        .content {
          padding-top: 0;
        }
        ha-alert {
          margin-bottom: 16px;
          display: block;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-generate-backup": DialogGenerateBackup;
  }
}
