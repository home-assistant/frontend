import { html, LitElement, nothing } from "lit";
import { customElement, query, state } from "lit/decorators";
import { consumeLocalize } from "../../../../common/decorators/consume-context-entry";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-footer";
import { DialogMixin } from "../../../../dialogs/dialog-mixin";
import type {
  EnergyEditorElement,
  EnergyEditorStatus,
} from "../editors/energy-editor";
import { renderEnergyEditor } from "../editors/render-energy-editor";
import type { EnergySettingsDialogParams } from "./show-dialogs-energy";

const HEADERS = {
  grid: "ui.panel.config.energy.grid.dialog.header",
  solar: "ui.panel.config.energy.solar.dialog.header",
  home: "ui.panel.config.energy.home.dialog.header",
  battery: "ui.panel.config.energy.battery.dialog.header",
  device: "ui.panel.config.energy.device_consumption.dialog.header",
  gas: "ui.panel.config.energy.gas.dialog.header",
  water: "ui.panel.config.energy.water.dialog.header",
  water_device: "ui.panel.config.energy.device_consumption_water.dialog.header",
} as const;

@customElement("dialog-energy-settings")
export class DialogEnergySettings extends DialogMixin<EnergySettingsDialogParams>(
  LitElement
) {
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state() private _status?: EnergyEditorStatus;

  @query(".editor") private _editor?: EnergyEditorElement;

  protected render() {
    if (!this.params) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        header-title=${this._localize(HEADERS[this.params.editor.kind])}
        .preventScrimClose=${!!this._status?.dirty}
        @energy-editor-status-changed=${this._statusChanged}
      >
        ${renderEnergyEditor(this.params.hass, this.params.editor)}
        <ha-dialog-footer slot="footer">
          <ha-button
            appearance="plain"
            @click=${this.closeDialog}
            slot="secondaryAction"
          >
            ${this._localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            @click=${this._save}
            .disabled=${
              !this._status?.dirty || !this._status.valid || this._status.saving
            }
            .loading=${!!this._status?.saving}
            slot="primaryAction"
          >
            ${this._localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _statusChanged(
    ev: HASSDomEvent<HASSDomEvents["energy-editor-status-changed"]>
  ) {
    this._status = ev.detail;
  }

  private async _save() {
    if (await this._editor?.save()) {
      this.closeDialog();
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-energy-settings": DialogEnergySettings;
  }
}
