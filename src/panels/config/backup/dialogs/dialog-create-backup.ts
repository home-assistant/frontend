import {
  mdiChartBox,
  mdiClose,
  mdiCog,
  mdiFolder,
  mdiPlayBoxMultiple,
} from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-icon-button-prev";
import "../../../../components/ha-md-dialog";
import type { HaMdDialog } from "../../../../components/ha-md-dialog";
import "../../../../components/ha-md-select";
import "../../../../components/ha-md-select-option";
import "../../../../components/ha-settings-row";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-switch";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { CreateBackupDialogParams } from "./show-dialog-create-backup";

type FormData = {
  name: string;
  history: boolean;
  media: boolean;
  share: boolean;
  addons_mode: "all" | "custom";
  addons: string[];
  agents_mode: "all" | "custom";
  agents: string[];
};

const INITIAL_FORM_DATA: FormData = {
  name: "",
  history: true,
  media: false,
  share: false,
  addons_mode: "all",
  addons: [],
  agents_mode: "all",
  agents: [],
};

const STEPS = ["data", "sync"] as const;

@customElement("ha-dialog-create-backup")
class DialogCreateBackup extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _formData?: FormData;

  @state() private _step?: "data" | "sync";

  @query("ha-md-dialog") private _dialog?: HaMdDialog;

  public showDialog(_params: CreateBackupDialogParams): void {
    this._step = STEPS[0];
    this._formData = INITIAL_FORM_DATA;
  }

  private _dialogClosed() {
    this._step = undefined;
    this._formData = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
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

    const dialogTitle = "Backup data";

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
      <ha-settings-row>
        <ha-svg-icon slot="prefix" .path=${mdiCog}></ha-svg-icon>
        <span slot="heading"> Home Assistant settings </span>
        <span slot="description">
          With these settings you are able to restore your system.
        </span>
        <ha-switch disabled checked></ha-switch>
      </ha-settings-row>
      <ha-settings-row>
        <ha-svg-icon slot="prefix" .path=${mdiChartBox}></ha-svg-icon>
        <span slot="heading">History</span>
        <span slot="description"> For example of your energy dashboard. </span>
        <ha-switch
          id="history"
          name="history"
          @change=${this._switchChanged}
          .checked=${this._formData.history}
        ></ha-switch>
      </ha-settings-row>
      <ha-settings-row>
        <ha-svg-icon slot="prefix" .path=${mdiPlayBoxMultiple}></ha-svg-icon>
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
      <ha-settings-row>
        <span slot="heading">Locations</span>
        <span slot="description">
          What locations you want to automatically backup to.
        </span>
        <ha-md-select
          @change=${this._agentModeChanged}
          .value=${this._formData.agents_mode}
        >
          <ha-md-select-option value="all">All (3)</ha-md-select-option>
          <ha-md-select-option value="custom">
            Custom (${this._formData.agents.length})
          </ha-md-select-option>
        </ha-md-select>
      </ha-settings-row>
    `;
  }

  private _agentModeChanged(ev) {
    const select = ev.currentTarget;
    this._formData = {
      ...this._formData!,
      agents_mode: select.value,
    };
  }

  private _switchChanged(ev) {
    const _switch = ev.currentTarget;
    this._formData = {
      ...this._formData!,
      [_switch.id]: _switch.checked,
    };
  }

  private _nameChanged(ev) {
    this._formData = {
      ...this._formData!,
      name: ev.target.value,
    };
  }

  private _submit() {
    // eslint-disable-next-line no-console
    console.log(this._formData);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        :host {
          --dialog-content-overflow: visible;
        }
        ha-md-dialog {
          --dialog-content-padding: 24px;
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
          width: 150px;
        }
        ha-settings-row > ha-md-select-option {
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        }
        ha-textfield {
          width: 100%;
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
    "ha-dialog-create-backup": DialogCreateBackup;
  }
}
