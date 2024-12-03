import { mdiClose } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-icon-button-prev";
import "../../../../components/ha-md-dialog";
import type { HaMdDialog } from "../../../../components/ha-md-dialog";
import "../../../../components/ha-md-select";
import "../../../../components/ha-md-select-option";
import "../../../../components/ha-password-field";
import type { HaPasswordField } from "../../../../components/ha-password-field";
import "../../../../components/ha-settings-row";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-textfield";
import type {
  BackupAgent,
  GenerateBackupParams,
} from "../../../../data/backup";
import { fetchBackupAgentsInfo } from "../../../../data/backup";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import "../components/ha-backup-config-data";
import "../components/ha-backup-agents-picker";
import type { BackupConfigData } from "../components/ha-backup-config-data";
import type { GenerateBackupDialogParams } from "./show-dialog-generate-backup";

type FormData = {
  name: string;
  agents_mode: "all" | "custom";
  agent_ids: string[];
  password: string;
  data: BackupConfigData;
};

const INITIAL_DATA: FormData = {
  data: {
    include_homeassistant: true,
    include_database: true,
    include_folders: [],
    include_all_addons: true,
  },
  name: "",
  password: "",
  agents_mode: "all",
  agent_ids: [],
};

const STEPS = ["data", "sync"] as const;

@customElement("ha-dialog-generate-backup")
class DialogGenerateBackup extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _step?: "data" | "sync";

  @state() private _agents: BackupAgent[] = [];

  @state() private _params?: GenerateBackupDialogParams;

  @state() private _formData?: FormData;

  @query("ha-md-dialog") private _dialog?: HaMdDialog;

  public showDialog(_params: GenerateBackupDialogParams): void {
    this._step = STEPS[0];
    this._formData = INITIAL_DATA;
    this._params = _params;
    this._fetchAgents();
  }

  private _dialogClosed() {
    if (this._params!.cancel) {
      this._params!.cancel();
    }
    this._step = undefined;
    this._formData = undefined;
    this._agents = [];
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private async _fetchAgents() {
    const { agents } = await fetchBackupAgentsInfo(this.hass);
    this._agents = agents;
  }

  public closeDialog() {
    this._dialog?.close();
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

  protected render() {
    if (!this._step || !this._formData) {
      return nothing;
    }

    const dialogTitle =
      this._step === "sync" ? "Synchronization" : "Backup data";

    const isFirstStep = this._step === STEPS[0];
    const isLastStep = this._step === STEPS[STEPS.length - 1];

    return html`
      <ha-md-dialog open disable-cancel-action @closed=${this._dialogClosed}>
        <ha-dialog-header slot="headline">
          ${isFirstStep
            ? html`
                <ha-icon-button
                  slot="navigationIcon"
                  .label=${this.hass.localize("ui.dialogs.generic.close")}
                  .path=${mdiClose}
                  @click=${this.closeDialog}
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
        <div slot="content" class="content">
          ${this._step === "data" ? this._renderData() : this._renderSync()}
        </div>
        <div slot="actions">
          ${isFirstStep
            ? html`<ha-button @click=${this.closeDialog}>Cancel</ha-button>`
            : nothing}
          ${isLastStep
            ? html`<ha-button @click=${this._submit}>Create backup</ha-button>`
            : html`<ha-button @click=${this._nextStep}>Next</ha-button>`}
        </div>
      </ha-md-dialog>
    `;
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

    return html`
      <ha-textfield
        name="name"
        .label=${"Backup name"}
        .value=${this._formData.name}
        @change=${this._nameChanged}
      >
      </ha-textfield>
      <ha-password-field
        name="password"
        .label=${"Encryption key"}
        .value=${this._formData.password}
        @change=${this._passwordChanged}
        required
      >
      </ha-password-field>
      <ha-settings-row>
        <span slot="heading">Locations</span>
        <span slot="description">
          What locations you want to automatically backup to.
        </span>
        <ha-md-select
          id="agents_mode"
          @change=${this._selectChanged}
          .value=${this._formData.agents_mode}
        >
          <ha-md-select-option value="all">
            <div slot="headline">All (${this._agents.length})</div>
          </ha-md-select-option>
          <ha-md-select-option value="custom">
            <div slot="headline">Custom</div>
          </ha-md-select-option>
        </ha-md-select>
      </ha-settings-row>
      ${this._formData.agents_mode === "custom"
        ? html`
            <ha-expansion-panel .header=${"Locations"} outlined expanded>
              <ha-backup-agents-picker
                .hass=${this.hass}
                .value=${this._formData.agent_ids}
                @value-changed=${this._agentsChanged}
                .agents=${this._agents}
              ></ha-backup-agents-picker>
            </ha-expansion-panel>
          `
        : nothing}
    `;
  }

  private _selectChanged(ev) {
    const select = ev.currentTarget;
    this._formData = {
      ...this._formData!,
      [select.id]: select.value,
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

  private _passwordChanged(ev) {
    this._formData = {
      ...this._formData!,
      password: ev.target.value,
    };
  }

  private async _submit() {
    if (!this._formData) {
      return;
    }

    const { agent_ids, agents_mode, name, password, data } = this._formData;

    if (!password) {
      const passwordField = this.shadowRoot!.querySelector(
        "ha-password-field"
      ) as HaPasswordField;
      passwordField.reportValidity();
      passwordField.focus();
      return;
    }

    const ALL_AGENT_IDS = this._agents.map((agent) => agent.agent_id);

    const params: GenerateBackupParams = {
      name,
      password,
      agent_ids: agents_mode === "all" ? ALL_AGENT_IDS : agent_ids,
      // We always include homeassistant if we include database
      include_homeassistant:
        data.include_homeassistant || data.include_database,
      include_database: data.include_database,
      include_addons: data.include_addons,
      include_folders: data.include_folders,
      include_all_addons: data.include_all_addons,
    };

    this._params!.submit?.(params);
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-md-dialog {
          --dialog-content-padding: 24px;
          max-height: calc(100vh - 48px);
        }
        ha-settings-row {
          --settings-row-prefix-display: flex;
          padding: 0;
        }
        ha-settings-row > ha-svg-icon {
          align-self: center;
          margin-inline-end: 16px;
        }
        ha-settings-row > ha-md-select {
          min-width: 150px;
        }
        ha-settings-row > ha-md-select > span {
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
        }
        ha-settings-row > ha-md-select-option {
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        }
        ha-textfield,
        ha-password-field {
          width: 100%;
        }
        ha-password-field {
          margin-top: 16px;
        }
        .content {
          padding-top: 0;
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
