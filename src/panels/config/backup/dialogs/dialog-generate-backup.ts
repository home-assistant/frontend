import {
  mdiChartBox,
  mdiClose,
  mdiCog,
  mdiFolder,
  mdiPlayBoxMultiple,
} from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";
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
import "../../../../components/ha-switch";
import "../../../../components/ha-textfield";
import type {
  BackupAgent,
  GenerateBackupParams,
} from "../../../../data/backup";
import { fetchBackupAgentsInfo } from "../../../../data/backup";
import { fetchHassioAddonsInfo } from "../../../../data/hassio/addon";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import "../components/ha-backup-addons-picker";
import type { BackupAddon } from "../components/ha-backup-addons-picker";
import "../components/ha-backup-agents-picker";
import type { GenerateBackupDialogParams } from "./show-dialog-generate-backup";

type FormData = {
  name: string;
  homeassistant: boolean;
  database: boolean;
  media: boolean;
  share: boolean;
  addons_mode: "all" | "custom";
  addons: string[];
  agents_mode: "all" | "custom";
  agent_ids: string[];
  password: string;
};

const INITIAL_FORM_DATA: FormData = {
  name: "",
  homeassistant: true,
  database: true,
  media: false,
  share: false,
  addons_mode: "all",
  addons: [],
  agents_mode: "all",
  agent_ids: [],
  password: "",
};

const SELF_CREATED_ADDONS_FOLDER = "addons/local";

const STEPS = ["data", "sync"] as const;

@customElement("ha-dialog-generate-backup")
class DialogGenerateBackup extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _formData?: FormData;

  @state() private _step?: "data" | "sync";

  @state() private _agents: BackupAgent[] = [];

  @state() private _params?: GenerateBackupDialogParams;

  @state() private _addons: BackupAddon[] = [];

  @query("ha-md-dialog") private _dialog?: HaMdDialog;

  public showDialog(_params: GenerateBackupDialogParams): void {
    this._step = STEPS[0];
    this._formData = INITIAL_FORM_DATA;
    this._params = _params;
    this._fetchAgents();
    if (isComponentLoaded(this.hass, "hassio")) {
      this._fetchAddons();
    }
  }

  private _dialogClosed() {
    if (this._params!.cancel) {
      this._params!.cancel();
    }
    this._step = undefined;
    this._formData = undefined;
    this._agents = [];
    this._addons = [];
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private async _fetchAgents() {
    const { agents } = await fetchBackupAgentsInfo(this.hass);
    this._agents = agents;
  }

  private async _fetchAddons() {
    const { addons } = await fetchHassioAddonsInfo(this.hass);
    this._addons = [
      ...addons,
      {
        name: "Self created add-ons",
        slug: SELF_CREATED_ADDONS_FOLDER,
      },
    ];
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

    const isHassio = isComponentLoaded(this.hass, "hassio");

    return html`
      <ha-settings-row>
        <ha-svg-icon slot="prefix" .path=${mdiCog}></ha-svg-icon>
        <span slot="heading">Home Assistant settings</span>
        <span slot="description">
          With these settings you are able to restore your system.
        </span>
        <ha-switch
          id="homeassistant"
          name="homeassistant"
          @change=${this._switchChanged}
          .checked=${this._formData.homeassistant}
          .disabled=${!isHassio || this._formData.database}
        ></ha-switch>
      </ha-settings-row>
      <ha-settings-row>
        <ha-svg-icon slot="prefix" .path=${mdiChartBox}></ha-svg-icon>
        <span slot="heading">History</span>
        <span slot="description">For example of your energy dashboard.</span>
        <ha-switch
          id="database"
          name="database"
          @change=${this._switchChanged}
          .checked=${this._formData.database}
        ></ha-switch>
      </ha-settings-row>
      ${isHassio
        ? html`
            <ha-settings-row>
              <ha-svg-icon
                slot="prefix"
                .path=${mdiPlayBoxMultiple}
              ></ha-svg-icon>
              <span slot="heading">Media</span>
              <span slot="description">
                Folder that is often used for advanced or older configurations.
              </span>
              <ha-switch
                id="media"
                name="media"
                @change=${this._switchChanged}
                .checked=${this._formData.media}
              ></ha-switch>
            </ha-settings-row>
            <ha-settings-row>
              <ha-svg-icon slot="prefix" .path=${mdiFolder}></ha-svg-icon>
              <span slot="heading">Share folder</span>
              <span slot="description">
                Folder that is often used for advanced or older configurations.
              </span>
              <ha-switch
                id="share"
                name="share"
                @change=${this._switchChanged}
                .checked=${this._formData.share}
              ></ha-switch>
            </ha-settings-row>
            ${this._addons.length > 0
              ? html`
                  <ha-settings-row>
                    <span slot="heading">Add-ons</span>
                    <span slot="description">
                      Select what add-ons you want to backup.
                    </span>
                    <ha-md-select
                      id="addons_mode"
                      @change=${this._selectChanged}
                      .value=${this._formData.addons_mode}
                    >
                      <ha-md-select-option value="all">
                        <div slot="headline">All (${this._addons.length})</div>
                      </ha-md-select-option>
                      <ha-md-select-option value="custom">
                        <div slot="headline">Custom</div>
                      </ha-md-select-option>
                    </ha-md-select>
                  </ha-settings-row>
                  ${this._formData.addons_mode === "custom"
                    ? html`
                        <ha-expansion-panel
                          .header=${"Add-ons"}
                          outlined
                          expanded
                        >
                          <ha-backup-addons-picker
                            .hass=${this.hass}
                            .value=${this._formData.addons}
                            @value-changed=${this._addonsChanged}
                            .addons=${this._addons}
                          ></ha-backup-addons-picker>
                        </ha-expansion-panel>
                      `
                    : nothing}
                `
              : nothing}
          `
        : nothing}
    `;
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

  private _addonsChanged(ev) {
    this._formData = {
      ...this._formData!,
      addons: ev.detail.value,
    };
  }

  private _agentsChanged(ev) {
    this._formData = {
      ...this._formData!,
      agent_ids: ev.detail.value,
    };
  }

  private _switchChanged(ev) {
    const _switch = ev.currentTarget;
    this._formData = {
      ...this._formData!,
      [_switch.id]: _switch.checked,
    };
    // If we enable database, we also enable homeassistant
    if (_switch.id === "database" && _switch.checked) {
      this._formData = {
        ...this._formData,
        homeassistant: true,
      };
    }
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

    const {
      homeassistant,
      addons_mode,
      agent_ids,
      agents_mode,
      database,
      media,
      name,
      share,
      password,
    } = this._formData;

    if (!password) {
      const passwordField = this.shadowRoot!.querySelector(
        "ha-password-field"
      ) as HaPasswordField;
      passwordField.reportValidity();
      passwordField.focus();
      return;
    }

    let { addons } = this._formData;

    const ALL_AGENT_IDS = this._agents.map((agent) => agent.agent_id);

    const params: GenerateBackupParams = {
      name,
      agent_ids: agents_mode === "all" ? ALL_AGENT_IDS : agent_ids,
      // We always include homeassistant if we include database
      include_homeassistant: homeassistant || database,
      include_database: database,
      password,
    };

    if (isComponentLoaded(this.hass, "hassio")) {
      const folders: string[] = [];
      if (media) {
        folders.push("media");
      }
      if (share) {
        folders.push("share");
      }
      if (
        addons.includes(SELF_CREATED_ADDONS_FOLDER) ||
        addons_mode === "all"
      ) {
        folders.push(SELF_CREATED_ADDONS_FOLDER);
        addons = addons.filter((addon) => addon !== SELF_CREATED_ADDONS_FOLDER);
      }

      params.include_all_addons = addons_mode === "all";
      params.include_folders = folders;
      if (addons_mode === "custom") {
        params.include_addons = addons;
      }
    }

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
