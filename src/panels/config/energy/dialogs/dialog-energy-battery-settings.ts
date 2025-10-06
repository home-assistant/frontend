import { mdiBatteryHigh } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/entity/ha-statistic-picker";
import "../../../../components/ha-dialog";
import "../../../../components/ha-button";
import type { BatterySourceTypeEnergyPreference } from "../../../../data/energy";
import {
  emptyBatteryEnergyPreference,
  energyStatisticHelpUrl,
} from "../../../../data/energy";
import { getSensorDeviceClassConvertibleUnits } from "../../../../data/sensor";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { EnergySettingsBatteryDialogParams } from "./show-dialogs-energy";

const energyUnitClasses = ["energy"];
const powerUnitClasses = ["power"];

@customElement("dialog-energy-battery-settings")
export class DialogEnergyBatterySettings
  extends LitElement
  implements HassDialog<EnergySettingsBatteryDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: EnergySettingsBatteryDialogParams;

  @state() private _source?: BatterySourceTypeEnergyPreference;

  @state() private _energy_units?: string[];

  @state() private _power_units?: string[];

  @state() private _error?: string;

  private _excludeList?: string[];

  private _excludeListPower?: string[];

  public async showDialog(
    params: EnergySettingsBatteryDialogParams
  ): Promise<void> {
    this._params = params;
    this._source = params.source
      ? { ...params.source }
      : emptyBatteryEnergyPreference();
    this._energy_units = (
      await getSensorDeviceClassConvertibleUnits(this.hass, "energy")
    ).units;
    this._power_units = (
      await getSensorDeviceClassConvertibleUnits(this.hass, "power")
    ).units;
    const allSources: string[] = [];
    this._params.battery_sources.forEach((entry) => {
      allSources.push(entry.stat_energy_from);
      allSources.push(entry.stat_energy_to);
    });
    this._excludeList = allSources.filter(
      (id) =>
        id !== this._source?.stat_energy_from &&
        id !== this._source?.stat_energy_to
    );
    const allPowerSources: string[] = [];
    this._params.battery_sources.forEach((entry) => {
      if (entry.stat_power_from) allPowerSources.push(entry.stat_power_from);
      if (entry.stat_power_to) allPowerSources.push(entry.stat_power_to);
    });
    this._excludeListPower = allPowerSources.filter(
      (id) =>
        id !== this._source?.stat_power_from &&
        id !== this._source?.stat_power_to
    );
  }

  public closeDialog() {
    this._params = undefined;
    this._source = undefined;
    this._error = undefined;
    this._excludeList = undefined;
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
            .path=${mdiBatteryHigh}
            style="--mdc-icon-size: 32px;"
          ></ha-svg-icon>
          ${this.hass.localize("ui.panel.config.energy.battery.dialog.header")}`}
        @closed=${this.closeDialog}
      >
        ${this._error ? html`<p class="error">${this._error}</p>` : ""}

        <ha-statistic-picker
          .hass=${this.hass}
          .helpMissingEntityUrl=${energyStatisticHelpUrl}
          .includeUnitClass=${energyUnitClasses}
          .value=${this._source.stat_energy_to}
          .label=${this.hass.localize(
            "ui.panel.config.energy.battery.dialog.energy_into_battery"
          )}
          .excludeStatistics=${[
            ...(this._excludeList || []),
            this._source.stat_energy_from,
          ]}
          @value-changed=${this._statisticToChanged}
          .helper=${this.hass.localize(
            "ui.panel.config.energy.battery.dialog.entity_para",
            { unit: this._energy_units?.join(", ") || "" }
          )}
          dialogInitialFocus
        ></ha-statistic-picker>

        <ha-statistic-picker
          .hass=${this.hass}
          .helpMissingEntityUrl=${energyStatisticHelpUrl}
          .includeUnitClass=${energyUnitClasses}
          .value=${this._source.stat_energy_from}
          .label=${this.hass.localize(
            "ui.panel.config.energy.battery.dialog.energy_out_of_battery"
          )}
          .excludeStatistics=${[
            ...(this._excludeList || []),
            this._source.stat_energy_to,
          ]}
          @value-changed=${this._statisticFromChanged}
          .helper=${this.hass.localize(
            "ui.panel.config.energy.battery.dialog.entity_para",
            { unit: this._energy_units?.join(", ") || "" }
          )}
        ></ha-statistic-picker>

        <ha-statistic-picker
          .hass=${this.hass}
          .includeUnitClass=${powerUnitClasses}
          .value=${this._source.stat_power_to}
          .label=${this.hass.localize(
            "ui.panel.config.energy.battery.dialog.power_into_battery"
          )}
          .excludeStatistics=${this._excludeListPower}
          @value-changed=${this._powerToChanged}
          .helper=${this.hass.localize(
            "ui.panel.config.energy.battery.dialog.entity_para",
            { unit: this._power_units?.join(", ") || "" }
          )}
        ></ha-statistic-picker>

        <ha-statistic-picker
          .hass=${this.hass}
          .includeUnitClass=${powerUnitClasses}
          .value=${this._source.stat_power_from}
          .label=${this.hass.localize(
            "ui.panel.config.energy.battery.dialog.power_out_of_battery"
          )}
          .excludeStatistics=${this._excludeListPower}
          @value-changed=${this._powerFromChanged}
          .helper=${this.hass.localize(
            "ui.panel.config.energy.battery.dialog.entity_para",
            { unit: this._power_units?.join(", ") || "" }
          )}
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
          .disabled=${!this._source.stat_energy_from ||
          !this._source.stat_energy_to}
          slot="primaryAction"
        >
          ${this.hass.localize("ui.common.save")}
        </ha-button>
      </ha-dialog>
    `;
  }

  private _statisticToChanged(ev: CustomEvent<{ value: string }>) {
    this._source = { ...this._source!, stat_energy_to: ev.detail.value };
  }

  private _statisticFromChanged(ev: CustomEvent<{ value: string }>) {
    this._source = { ...this._source!, stat_energy_from: ev.detail.value };
  }

  private _powerToChanged(ev: CustomEvent<{ value: string }>) {
    this._source = { ...this._source!, stat_power_to: ev.detail.value };
  }

  private _powerFromChanged(ev: CustomEvent<{ value: string }>) {
    this._source = { ...this._source!, stat_power_from: ev.detail.value };
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
      haStyle,
      haStyleDialog,
      css`
        ha-dialog {
          --mdc-dialog-max-width: 430px;
        }
        ha-statistic-picker {
          display: block;
          margin-bottom: var(--ha-space-4);
        }
        ha-statistic-picker:last-of-type {
          margin-bottom: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-energy-battery-settings": DialogEnergyBatterySettings;
  }
}
