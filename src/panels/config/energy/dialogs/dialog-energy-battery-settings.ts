import { mdiBatteryHigh } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/entity/ha-statistic-picker";
import "../../../../components/ha-dialog";
import "../../../../components/ha-button";
import "../../../../components/ha-formfield";
import "../../../../components/ha-radio";
import type { HaRadio } from "../../../../components/ha-radio";
import type {
  BatterySourceTypeEnergyPreference,
  PowerConfig,
} from "../../../../data/energy";
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

type PowerType = "none" | "standard" | "inverted" | "two_sensors";

@customElement("dialog-energy-battery-settings")
export class DialogEnergyBatterySettings
  extends LitElement
  implements HassDialog<EnergySettingsBatteryDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: EnergySettingsBatteryDialogParams;

  @state() private _source?: BatterySourceTypeEnergyPreference;

  @state() private _powerType: PowerType = "none";

  @state() private _powerConfig: PowerConfig = {};

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

    // Initialize power type from existing config
    if (params.source?.power_config) {
      const pc = params.source.power_config;
      this._powerConfig = { ...pc };
      if (pc.stat_rate_inverted) {
        this._powerType = "inverted";
      } else if (pc.stat_rate_from || pc.stat_rate_to) {
        this._powerType = "two_sensors";
      } else if (pc.stat_rate) {
        this._powerType = "standard";
      } else {
        this._powerType = "none";
      }
    } else if (params.source?.stat_rate) {
      // Legacy format - treat as standard
      this._powerType = "standard";
      this._powerConfig = { stat_rate: params.source.stat_rate };
    } else {
      this._powerType = "none";
      this._powerConfig = {};
    }

    this._energy_units = (
      await getSensorDeviceClassConvertibleUnits(this.hass, "energy")
    ).units;
    this._power_units = (
      await getSensorDeviceClassConvertibleUnits(this.hass, "power")
    ).units;

    // Build energy exclude list
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

    // Build power exclude list
    const powerIds: string[] = [];
    this._params.battery_sources.forEach((entry) => {
      if (entry.stat_rate) powerIds.push(entry.stat_rate);
      if (entry.power_config) {
        if (entry.power_config.stat_rate)
          powerIds.push(entry.power_config.stat_rate);
        if (entry.power_config.stat_rate_inverted)
          powerIds.push(entry.power_config.stat_rate_inverted);
        if (entry.power_config.stat_rate_from)
          powerIds.push(entry.power_config.stat_rate_from);
        if (entry.power_config.stat_rate_to)
          powerIds.push(entry.power_config.stat_rate_to);
      }
    });

    const currentPowerIds = [
      this._powerConfig.stat_rate,
      this._powerConfig.stat_rate_inverted,
      this._powerConfig.stat_rate_from,
      this._powerConfig.stat_rate_to,
      params.source?.stat_rate,
    ].filter(Boolean) as string[];

    this._excludeListPower = powerIds.filter(
      (id) => !currentPowerIds.includes(id)
    );
  }

  public closeDialog() {
    this._params = undefined;
    this._source = undefined;
    this._powerType = "none";
    this._powerConfig = {};
    this._error = undefined;
    this._excludeList = undefined;
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
            .path=${mdiBatteryHigh}
            style="--mdc-icon-size: 32px;"
          ></ha-svg-icon>
          ${this.hass.localize("ui.panel.config.energy.battery.dialog.header")}`}
        @closed=${this.closeDialog}
      >
        ${this._error ? html`<p class="error">${this._error}</p>` : nothing}

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
            "ui.panel.config.energy.battery.dialog.energy_helper_into",
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
            "ui.panel.config.energy.battery.dialog.energy_helper_out",
            { unit: this._energy_units?.join(", ") || "" }
          )}
        ></ha-statistic-picker>

        <p class="power-section-label">
          ${this.hass.localize(
            "ui.panel.config.energy.battery.dialog.sensor_type"
          )}
        </p>

        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.config.energy.battery.dialog.type_none"
          )}
        >
          <ha-radio
            value="none"
            name="powerType"
            .checked=${this._powerType === "none"}
            @change=${this._handlePowerTypeChanged}
          ></ha-radio>
        </ha-formfield>
        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.config.energy.battery.dialog.type_standard"
          )}
        >
          <ha-radio
            value="standard"
            name="powerType"
            .checked=${this._powerType === "standard"}
            @change=${this._handlePowerTypeChanged}
          ></ha-radio>
        </ha-formfield>
        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.config.energy.battery.dialog.type_inverted"
          )}
        >
          <ha-radio
            value="inverted"
            name="powerType"
            .checked=${this._powerType === "inverted"}
            @change=${this._handlePowerTypeChanged}
          ></ha-radio>
        </ha-formfield>
        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.config.energy.battery.dialog.type_two_sensors"
          )}
        >
          <ha-radio
            value="two_sensors"
            name="powerType"
            .checked=${this._powerType === "two_sensors"}
            @change=${this._handlePowerTypeChanged}
          ></ha-radio>
        </ha-formfield>

        ${this._powerType === "standard"
          ? html`
              <ha-statistic-picker
                .hass=${this.hass}
                .includeUnitClass=${powerUnitClasses}
                .value=${this._powerConfig.stat_rate}
                .label=${this.hass.localize(
                  "ui.panel.config.energy.battery.dialog.power"
                )}
                .excludeStatistics=${this._excludeListPower}
                @value-changed=${this._standardPowerChanged}
                .helper=${this.hass.localize(
                  "ui.panel.config.energy.battery.dialog.power_helper",
                  { unit: this._power_units?.join(", ") || "" }
                )}
              ></ha-statistic-picker>
            `
          : nothing}
        ${this._powerType === "inverted"
          ? html`
              <ha-statistic-picker
                .hass=${this.hass}
                .includeUnitClass=${powerUnitClasses}
                .value=${this._powerConfig.stat_rate_inverted}
                .label=${this.hass.localize(
                  "ui.panel.config.energy.battery.dialog.power"
                )}
                .excludeStatistics=${this._excludeListPower}
                @value-changed=${this._invertedPowerChanged}
                .helper=${this.hass.localize(
                  "ui.panel.config.energy.battery.dialog.type_inverted_description"
                )}
              ></ha-statistic-picker>
            `
          : nothing}
        ${this._powerType === "two_sensors"
          ? html`
              <ha-statistic-picker
                .hass=${this.hass}
                .includeUnitClass=${powerUnitClasses}
                .value=${this._powerConfig.stat_rate_from}
                .label=${this.hass.localize(
                  "ui.panel.config.energy.battery.dialog.power_discharge"
                )}
                .excludeStatistics=${[
                  ...(this._excludeListPower || []),
                  this._powerConfig.stat_rate_to,
                ].filter((id): id is string => Boolean(id))}
                @value-changed=${this._dischargePowerChanged}
              ></ha-statistic-picker>
              <ha-statistic-picker
                .hass=${this.hass}
                .includeUnitClass=${powerUnitClasses}
                .value=${this._powerConfig.stat_rate_to}
                .label=${this.hass.localize(
                  "ui.panel.config.energy.battery.dialog.power_charge"
                )}
                .excludeStatistics=${[
                  ...(this._excludeListPower || []),
                  this._powerConfig.stat_rate_from,
                ].filter((id): id is string => Boolean(id))}
                @value-changed=${this._chargePowerChanged}
              ></ha-statistic-picker>
            `
          : nothing}

        <ha-button
          appearance="plain"
          @click=${this.closeDialog}
          slot="primaryAction"
        >
          ${this.hass.localize("ui.common.cancel")}
        </ha-button>
        <ha-button
          @click=${this._save}
          .disabled=${!this._isValid()}
          slot="primaryAction"
        >
          ${this.hass.localize("ui.common.save")}
        </ha-button>
      </ha-dialog>
    `;
  }

  private _isValid(): boolean {
    // Energy fields are always required
    if (!this._source?.stat_energy_from || !this._source?.stat_energy_to) {
      return false;
    }

    // Power fields depend on selected type
    switch (this._powerType) {
      case "none":
        return true;
      case "standard":
        return !!this._powerConfig.stat_rate;
      case "inverted":
        return !!this._powerConfig.stat_rate_inverted;
      case "two_sensors":
        return (
          !!this._powerConfig.stat_rate_from && !!this._powerConfig.stat_rate_to
        );
      default:
        return false;
    }
  }

  private _statisticToChanged(ev: CustomEvent<{ value: string }>) {
    this._source = { ...this._source!, stat_energy_to: ev.detail.value };
  }

  private _statisticFromChanged(ev: CustomEvent<{ value: string }>) {
    this._source = { ...this._source!, stat_energy_from: ev.detail.value };
  }

  private _handlePowerTypeChanged(ev: Event) {
    const input = ev.currentTarget as HaRadio;
    this._powerType = input.value as PowerType;
    // Clear power config when switching types
    this._powerConfig = {};
  }

  private _standardPowerChanged(ev: CustomEvent<{ value: string }>) {
    this._powerConfig = {
      stat_rate: ev.detail.value,
    };
  }

  private _invertedPowerChanged(ev: CustomEvent<{ value: string }>) {
    this._powerConfig = {
      stat_rate_inverted: ev.detail.value,
    };
  }

  private _dischargePowerChanged(ev: CustomEvent<{ value: string }>) {
    this._powerConfig = {
      ...this._powerConfig,
      stat_rate_from: ev.detail.value,
    };
  }

  private _chargePowerChanged(ev: CustomEvent<{ value: string }>) {
    this._powerConfig = {
      ...this._powerConfig,
      stat_rate_to: ev.detail.value,
    };
  }

  private async _save() {
    try {
      const source: BatterySourceTypeEnergyPreference = {
        type: "battery",
        stat_energy_from: this._source!.stat_energy_from,
        stat_energy_to: this._source!.stat_energy_to,
      };

      // Only include power_config if a power type is selected
      if (this._powerType !== "none") {
        source.power_config = { ...this._powerConfig };
      }

      await this._params!.saveCallback(source);
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
        ha-formfield {
          display: block;
        }
        .power-section-label {
          margin-top: var(--ha-space-4);
          margin-bottom: var(--ha-space-2);
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
