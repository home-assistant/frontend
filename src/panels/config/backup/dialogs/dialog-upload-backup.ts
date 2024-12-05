import { mdiClose, mdiFolderUpload } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { keyed } from "lit/directives/keyed";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-alert";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-file-upload";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-md-dialog";
import type { HaMdDialog } from "../../../../components/ha-md-dialog";
import "../../../../components/ha-md-list";
import "../../../../components/ha-md-list-item";
import "../../../../components/ha-md-select";
import "../../../../components/ha-md-select-option";
import type { BackupAgent } from "../../../../data/backup";
import { fetchBackupAgentsInfo, uploadBackup } from "../../../../data/backup";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { showAlertDialog } from "../../../lovelace/custom-card-helpers";
import "../components/ha-backup-agents-picker";
import type { UploadBackupDialogParams } from "./show-dialog-upload-backup";

const SUPPORTED_FORMAT = "application/x-tar";

type FormData = {
  agents_mode: "all" | "custom";
  agent_ids: string[];
  file?: File;
};

const INITIAL_DATA: FormData = {
  agents_mode: "all",
  agent_ids: [],
  file: undefined,
};

@customElement("ha-dialog-upload-backup")
export class DialogUploadBackup
  extends LitElement
  implements HassDialog<UploadBackupDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: UploadBackupDialogParams;

  @state() private _uploading = false;

  @state() private _error?: string;

  @state() private _agents: BackupAgent[] = [];

  @state() private _formData?: FormData;

  @query("ha-md-dialog") private _dialog?: HaMdDialog;

  public async showDialog(params: UploadBackupDialogParams): Promise<void> {
    this._params = params;
    this._formData = INITIAL_DATA;
    this._fetchAgents();
  }

  private _dialogClosed() {
    if (this._params!.cancel) {
      this._params!.cancel();
    }
    this._formData = undefined;
    this._agents = [];
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  public closeDialog() {
    this._dialog?.close();
  }

  private async _fetchAgents() {
    const { agents } = await fetchBackupAgentsInfo(this.hass);
    this._agents = agents;
  }

  private _formValid() {
    return (
      this._formData?.file !== undefined &&
      (this._formData.agents_mode === "all" ||
        this._formData.agent_ids.length > 0)
    );
  }

  protected render() {
    if (!this._params || !this._formData) {
      return nothing;
    }

    return html`
      <ha-md-dialog open @closed=${this._dialogClosed}>
        <ha-dialog-header slot="headline">
          <ha-icon-button
            slot="navigationIcon"
            .label=${this.hass.localize("ui.dialogs.generic.close")}
            .path=${mdiClose}
            @click=${this.closeDialog}
          ></ha-icon-button>

          <span slot="title">Upload backup</span>
        </ha-dialog-header>
        <div slot="content">
          <ha-file-upload
            .hass=${this.hass}
            .uploading=${this._uploading}
            .icon=${mdiFolderUpload}
            accept=${SUPPORTED_FORMAT}
            label="Select backup file"
            supports="Supports .tar files"
            @file-picked=${this._filePicked}
          ></ha-file-upload>
          <ha-md-list>
            <ha-md-list-item>
              <span slot="headline">Locations</span>
              <span slot="supporting-text">
                What locations you want to upload this backup.
              </span>
              ${keyed(
                this._agents.length,
                html`
                  <ha-md-select
                    slot="end"
                    id="agents_mode"
                    @change=${this._selectChanged}
                    .value=${this._formData!.agents_mode}
                  >
                    <ha-md-select-option value="all">
                      <div slot="headline">All (${this._agents.length})</div>
                    </ha-md-select-option>
                    <ha-md-select-option value="custom">
                      <div slot="headline">Custom</div>
                    </ha-md-select-option>
                  </ha-md-select>
                `
              )}
            </ha-md-list-item>
          </ha-md-list>
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
          ${this._error
            ? html`<ha-alert alertType="error">${this._error}</ha-alert>`
            : nothing}
        </div>
        <div slot="actions">
          <ha-button @click=${this.closeDialog}>Cancel</ha-button>
          <ha-button @click=${this._upload} .disabled=${!this._formValid()}>
            Upload backup
          </ha-button>
        </div>
      </ha-md-dialog>
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

  private async _filePicked(ev: CustomEvent<{ files: File[] }>): Promise<void> {
    this._error = undefined;
    const file = ev.detail.files[0];

    this._formData = {
      ...this._formData!,
      file,
    };
  }

  private async _upload() {
    const { file, agent_ids, agents_mode } = this._formData!;
    if (!file || file.type !== SUPPORTED_FORMAT) {
      showAlertDialog(this, {
        title: "Unsupported file format",
        text: "Please choose a Home Assistant backup file (.tar)",
        confirmText: "ok",
      });
      return;
    }

    const agents =
      agents_mode === "all"
        ? this._agents.map((agent) => agent.agent_id)
        : agent_ids;

    this._uploading = true;
    try {
      await uploadBackup(this.hass!, file, agents);
      this._params!.submit?.();
      this.closeDialog();
    } catch (err: any) {
      this._error = err.message;
    } finally {
      this._uploading = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-md-dialog {
          max-width: 500px;
          width: 100%;
          max-width: 500px;
          max-height: 100%;
        }
        ha-md-list {
          background: none;
          --md-list-item-leading-space: 0;
          --md-list-item-trailing-space: 0;
        }
        ha-md-select {
          min-width: 210px;
        }
        @media all and (max-width: 450px) {
          ha-md-select {
            min-width: 160px;
            width: 160px;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-upload-backup": DialogUploadBackup;
  }
}
