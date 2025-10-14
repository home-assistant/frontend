import { mdiTransmissionTower } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/entity/ha-statistic-picker";
import "../../../../components/ha-dialog";
import "../../../../components/ha-button";
import type { GridPowerSourceEnergyPreference } from "../../../../data/energy";
import { energyStatisticHelpUrl } from "../../../../data/energy";
import { getSensorDeviceClassConvertibleUnits } from "../../../../data/sensor";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { EnergySettingsGridPowerDialogParams } from "./show-dialogs-energy";

const powerUnitClasses = ["power"];

@customElement("dialog-energy-grid-power-settings")
export class DialogEnergyGridPowerSettings
  extends LitElement
  implements HassDialog<EnergySettingsGridPowerDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: EnergySettingsGridPowerDialogParams;

  @state() private _source?: GridPowerSourceEnergyPreference;

  @state() private _power_units?: string[];

  @state() private _error?: string;

  private _excludeListPower?: string[];

  public async showDialog(
    params: EnergySettingsGridPowerDialogParams
  ): Promise<void> {
    this._params = params;
    this._source = params.source ? { ...params.source } : { stat_power: "" };

    const initialSourceIdPower = this._source.stat_power;

    this._power_units = (
      await getSensorDeviceClassConvertibleUnits(this.hass, "power")
    ).units;

    this._excludeListPower = [
      ...(this._params.grid_source?.power?.map((entry) => entry.stat_power) ||
        []),
    ].filter((id) => id && id !== initialSourceIdPower) as string[];
  }

  public closeDialog() {
    this._params = undefined;
    this._source = undefined;
    this._error = undefined;
    this._excludeListPower = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
    return true;
  }

  protected render() {
    if (!this._params || !this._source) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        .heading=${html`<ha-svg-icon
            .path=${mdiTransmissionTower}
            style="--mdc-icon-size: 32px;"
          ></ha-svg-icon
          >${this.hass.localize(
            "ui.panel.config.energy.grid.power_dialog.header"
          )}`}
        @closed=${this.closeDialog}
      >
        ${this._error ? html`<p class="error">${this._error}</p>` : ""}

        <ha-statistic-picker
          .hass=${this.hass}
          .helpMissingEntityUrl=${energyStatisticHelpUrl}
          .includeUnitClass=${powerUnitClasses}
          .value=${this._source.stat_power}
          .label=${this.hass.localize(
            "ui.panel.config.energy.grid.power_dialog.power_stat"
          )}
          .excludeStatistics=${this._excludeListPower}
          @value-changed=${this._powerStatisticChanged}
          .helper=${this.hass.localize(
            "ui.panel.config.energy.grid.power_dialog.power_helper",
            { unit: this._power_units?.join(", ") || "" }
          )}
          dialogInitialFocus
        ></ha-statistic-picker>

        <ha-button
          appearance="plain"
          @click=${this.closeDialog}
          slot="primaryAction"
        >
          ${this.hass.localize("ui.common.cancel")}
        </ha-button>
        <ha-button
          @click=${this._save}
          .disabled=${!this._source.stat_power}
          slot="primaryAction"
        >
          ${this.hass.localize("ui.common.save")}
        </ha-button>
      </ha-dialog>
    `;
  }

  private _powerStatisticChanged(ev: CustomEvent<{ value: string }>) {
    this._source = {
      ...this._source!,
      stat_power: ev.detail.value,
    };
  }

  private async _save() {
    try {
      await this._params!.saveCallback(this._source!);
      this.closeDialog();
    } catch (err: any) {
      this._error = err.message;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --mdc-dialog-max-width: 430px;
        }
        ha-statistic-picker {
          display: block;
          margin: var(--ha-space-4) 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-energy-grid-power-settings": DialogEnergyGridPowerSettings;
  }
}
