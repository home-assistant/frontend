import { mdiTransmissionTower } from "@mdi/js";
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
  GridPowerSourceInput,
  PowerConfig,
} from "../../../../data/energy";
import { energyStatisticHelpUrl } from "../../../../data/energy";
import { getSensorDeviceClassConvertibleUnits } from "../../../../data/sensor";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import type { EnergySettingsGridPowerDialogParams } from "./show-dialogs-energy";

const powerUnitClasses = ["power"];

type SensorType = "standard" | "inverted" | "two_sensors";

@customElement("dialog-energy-grid-power-settings")
export class DialogEnergyGridPowerSettings
  extends LitElement
  implements HassDialog<EnergySettingsGridPowerDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: EnergySettingsGridPowerDialogParams;

  @state() private _sensorType: SensorType = "standard";

  @state() private _powerConfig: PowerConfig = {};

  @state() private _power_units?: string[];

  @state() private _error?: string;

  private _excludeListPower?: string[];

  public async showDialog(
    params: EnergySettingsGridPowerDialogParams
  ): Promise<void> {
    this._params = params;

    // Initialize from existing source
    if (params.source?.power_config) {
      const pc = params.source.power_config;
      this._powerConfig = { ...pc };
      if (pc.stat_rate_inverted) {
        this._sensorType = "inverted";
      } else if (pc.stat_rate_from || pc.stat_rate_to) {
        this._sensorType = "two_sensors";
      } else {
        this._sensorType = "standard";
      }
    } else if (params.source?.stat_rate) {
      // Legacy format - treat as standard
      this._sensorType = "standard";
      this._powerConfig = { stat_rate: params.source.stat_rate };
    } else {
      this._sensorType = "standard";
      this._powerConfig = {};
    }

    this._power_units = (
      await getSensorDeviceClassConvertibleUnits(this.hass, "power")
    ).units;

    // Build exclude list from all power sources
    const excludeIds: string[] = [];
    this._params.grid_source?.power?.forEach((entry) => {
      if (entry.stat_rate) excludeIds.push(entry.stat_rate);
      if (entry.power_config) {
        if (entry.power_config.stat_rate)
          excludeIds.push(entry.power_config.stat_rate);
        if (entry.power_config.stat_rate_inverted)
          excludeIds.push(entry.power_config.stat_rate_inverted);
        if (entry.power_config.stat_rate_from)
          excludeIds.push(entry.power_config.stat_rate_from);
        if (entry.power_config.stat_rate_to)
          excludeIds.push(entry.power_config.stat_rate_to);
      }
    });

    // Filter out current source's IDs
    const currentIds = [
      this._powerConfig.stat_rate,
      this._powerConfig.stat_rate_inverted,
      this._powerConfig.stat_rate_from,
      this._powerConfig.stat_rate_to,
      params.source?.stat_rate,
    ].filter(Boolean) as string[];

    this._excludeListPower = excludeIds.filter(
      (id) => !currentIds.includes(id)
    );
  }

  public closeDialog() {
    this._params = undefined;
    this._powerConfig = {};
    this._sensorType = "standard";
    this._error = undefined;
    this._excludeListPower = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
    return true;
  }

  protected render() {
    if (!this._params) {
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
        ${this._error ? html`<p class="error">${this._error}</p>` : nothing}

        <p>
          ${this.hass.localize(
            "ui.panel.config.energy.grid.power_dialog.sensor_type"
          )}
        </p>

        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.config.energy.grid.power_dialog.type_standard"
          )}
        >
          <ha-radio
            value="standard"
            name="sensorType"
            .checked=${this._sensorType === "standard"}
            @change=${this._handleSensorTypeChanged}
          ></ha-radio>
        </ha-formfield>
        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.config.energy.grid.power_dialog.type_inverted"
          )}
        >
          <ha-radio
            value="inverted"
            name="sensorType"
            .checked=${this._sensorType === "inverted"}
            @change=${this._handleSensorTypeChanged}
          ></ha-radio>
        </ha-formfield>
        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.config.energy.grid.power_dialog.type_two_sensors"
          )}
        >
          <ha-radio
            value="two_sensors"
            name="sensorType"
            .checked=${this._sensorType === "two_sensors"}
            @change=${this._handleSensorTypeChanged}
          ></ha-radio>
        </ha-formfield>

        ${this._sensorType === "standard"
          ? html`
              <ha-statistic-picker
                .hass=${this.hass}
                .helpMissingEntityUrl=${energyStatisticHelpUrl}
                .includeUnitClass=${powerUnitClasses}
                .value=${this._powerConfig.stat_rate}
                .label=${this.hass.localize(
                  "ui.panel.config.energy.grid.power_dialog.power_stat"
                )}
                .excludeStatistics=${this._excludeListPower}
                @value-changed=${this._standardStatisticChanged}
                .helper=${this.hass.localize(
                  "ui.panel.config.energy.grid.power_dialog.power_helper",
                  { unit: this._power_units?.join(", ") || "" }
                )}
                dialogInitialFocus
              ></ha-statistic-picker>
            `
          : nothing}
        ${this._sensorType === "inverted"
          ? html`
              <ha-statistic-picker
                .hass=${this.hass}
                .helpMissingEntityUrl=${energyStatisticHelpUrl}
                .includeUnitClass=${powerUnitClasses}
                .value=${this._powerConfig.stat_rate_inverted}
                .label=${this.hass.localize(
                  "ui.panel.config.energy.grid.power_dialog.power_stat"
                )}
                .excludeStatistics=${this._excludeListPower}
                @value-changed=${this._invertedStatisticChanged}
                .helper=${this.hass.localize(
                  "ui.panel.config.energy.grid.power_dialog.type_inverted_description"
                )}
                dialogInitialFocus
              ></ha-statistic-picker>
            `
          : nothing}
        ${this._sensorType === "two_sensors"
          ? html`
              <ha-statistic-picker
                .hass=${this.hass}
                .helpMissingEntityUrl=${energyStatisticHelpUrl}
                .includeUnitClass=${powerUnitClasses}
                .value=${this._powerConfig.stat_rate_from}
                .label=${this.hass.localize(
                  "ui.panel.config.energy.grid.power_dialog.power_from_grid"
                )}
                .excludeStatistics=${[
                  ...(this._excludeListPower || []),
                  this._powerConfig.stat_rate_to,
                ].filter((id): id is string => Boolean(id))}
                @value-changed=${this._fromStatisticChanged}
                dialogInitialFocus
              ></ha-statistic-picker>
              <ha-statistic-picker
                .hass=${this.hass}
                .helpMissingEntityUrl=${energyStatisticHelpUrl}
                .includeUnitClass=${powerUnitClasses}
                .value=${this._powerConfig.stat_rate_to}
                .label=${this.hass.localize(
                  "ui.panel.config.energy.grid.power_dialog.power_to_grid"
                )}
                .excludeStatistics=${[
                  ...(this._excludeListPower || []),
                  this._powerConfig.stat_rate_from,
                ].filter((id): id is string => Boolean(id))}
                @value-changed=${this._toStatisticChanged}
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
    switch (this._sensorType) {
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

  private _handleSensorTypeChanged(ev: Event) {
    const input = ev.currentTarget as HaRadio;
    this._sensorType = input.value as SensorType;
    // Clear config when switching types
    this._powerConfig = {};
  }

  private _standardStatisticChanged(ev: ValueChangedEvent<string>) {
    this._powerConfig = {
      stat_rate: ev.detail.value,
    };
  }

  private _invertedStatisticChanged(ev: ValueChangedEvent<string>) {
    this._powerConfig = {
      stat_rate_inverted: ev.detail.value,
    };
  }

  private _fromStatisticChanged(ev: ValueChangedEvent<string>) {
    this._powerConfig = {
      ...this._powerConfig,
      stat_rate_from: ev.detail.value,
    };
  }

  private _toStatisticChanged(ev: ValueChangedEvent<string>) {
    this._powerConfig = {
      ...this._powerConfig,
      stat_rate_to: ev.detail.value,
    };
  }

  private async _save() {
    try {
      const source: GridPowerSourceInput = {
        power_config: { ...this._powerConfig },
      };
      await this._params!.saveCallback(source);
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
        ha-formfield {
          display: block;
        }
        ha-statistic-picker {
          display: block;
          margin-top: var(--ha-space-4);
        }
        p {
          margin-bottom: var(--ha-space-2);
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
