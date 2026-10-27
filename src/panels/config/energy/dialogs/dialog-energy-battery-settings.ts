import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import "../../../../components/entity/ha-statistic-picker";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-footer";
import "../../../../components/input/ha-input";
import type {
  BatterySourceTypeEnergyPreference,
  PowerConfig,
} from "../../../../data/energy";
import {
  computeEnergyLabel,
  emptyBatteryEnergyPreference,
  energyStatisticHelpUrl,
} from "../../../../data/energy";
import {
  getStatisticLabel,
  getStatisticMetadata,
  isExternalStatistic,
} from "../../../../data/recorder";
import { getSensorDeviceClassConvertibleUnits } from "../../../../data/sensor";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { DirtyStateProviderMixin } from "../../../../mixins/dirty-state-provider-mixin";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import type { PowerIntegral } from "./energy-integral";
import { confirmIntegrals, pendingPowerIntegrals } from "./energy-integral";
import "./ha-energy-power-config";
import {
  buildPowerExcludeList,
  getInitialPowerConfig,
  getPowerHelperEntityId,
  getPowerTypeFromConfig,
  isPowerConfigValid,
  type PowerType,
} from "./power-config";
import type { EnergySettingsBatteryDialogParams } from "./show-dialogs-energy";
import type { HaInput } from "../../../../components/input/ha-input";

interface BatteryFormState {
  source: BatterySourceTypeEnergyPreference;
  powerType: PowerType;
  powerConfig: PowerConfig;
}

const energyUnitClasses = ["energy"];
const socStatisticsUnits = ["%"];
const socDeviceClass = "battery";

@customElement("dialog-energy-battery-settings")
export class DialogEnergyBatterySettings
  extends DirtyStateProviderMixin<BatteryFormState>()(LitElement)
  implements HassDialog<EnergySettingsBatteryDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: EnergySettingsBatteryDialogParams;

  @state() private _open = false;

  @state() private _source?: BatterySourceTypeEnergyPreference;

  @state() private _powerType: PowerType = "none";

  @state() private _powerConfig: PowerConfig = {};

  @state() private _energy_units?: string[];

  @state() private _error?: string;

  @state() private _saving = false;

  private _excludeList?: string[];

  private _excludeListPower?: string[];

  public async showDialog(
    params: EnergySettingsBatteryDialogParams
  ): Promise<void> {
    this._params = params;
    this._error = undefined;
    this._source = params.source
      ? { ...params.source }
      : emptyBatteryEnergyPreference();

    // Initialize power type and config from existing source
    this._powerType = getPowerTypeFromConfig(
      params.source?.power_config,
      params.source?.stat_rate
    );
    this._powerConfig = getInitialPowerConfig(
      params.source?.power_config,
      params.source?.stat_rate
    );

    this._energy_units = (
      await getSensorDeviceClassConvertibleUnits(this.hass, "energy")
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

    // Build power exclude list using shared helper
    this._excludeListPower = buildPowerExcludeList(
      this._params.battery_sources,
      this._powerConfig,
      params.source?.stat_rate
    );

    this._open = true;
    this._initDirtyTracking(
      { type: "deep" },
      {
        source: this._source!,
        powerType: this._powerType,
        powerConfig: this._powerConfig,
      }
    );
  }

  public closeDialog() {
    this._open = false;
    return true;
  }

  private _dialogClosed() {
    this._params = undefined;
    this._source = undefined;
    this._powerType = "none";
    this._powerConfig = {};
    this._error = undefined;
    this._excludeList = undefined;
    this._excludeListPower = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params || !this._source) {
      return nothing;
    }

    const pending = this._pendingIntegrals();
    const labelStatistic =
      this._source.stat_energy_from ||
      this._source.stat_energy_to ||
      pending[0]?.rate;

    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${this.hass.localize(
          "ui.panel.config.energy.battery.dialog.header"
        )}
        .preventScrimClose=${this.isDirtyState}
        @closed=${this._dialogClosed}
      >
        ${this._error ? html`<p class="error">${this._error}</p>` : nothing}

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
          autofocus
        ></ha-statistic-picker>

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
        ></ha-statistic-picker>

        <ha-input
          .label=${this.hass.localize(
            "ui.panel.config.energy.battery.dialog.display_name"
          )}
          type="text"
          .disabled=${!labelStatistic}
          .value=${this._source?.name || ""}
          .placeholder=${
            labelStatistic
              ? getStatisticLabel(
                  this.hass.states,
                  this.hass.formatEntityName,
                  labelStatistic,
                  this._params?.statsMetadata?.[labelStatistic]
                )
              : ""
          }
          @input=${this._nameChanged}
        >
        </ha-input>

        <ha-energy-power-config
          .hass=${this.hass}
          .powerType=${this._powerType}
          .powerConfig=${this._powerConfig}
          .excludeList=${this._excludeListPower}
          .helperEntityId=${getPowerHelperEntityId(
            this._params.source,
            this._powerConfig
          )}
          .localizeBaseKey=${"ui.panel.config.energy.battery.dialog"}
          @power-config-changed=${this._handlePowerConfigChanged}
        ></ha-energy-power-config>

        <ha-statistic-picker
          .hass=${this.hass}
          .helpMissingEntityUrl=${energyStatisticHelpUrl}
          .value=${this._source.stat_soc}
          .includeStatisticsUnitOfMeasurement=${socStatisticsUnits}
          .includeDeviceClass=${socDeviceClass}
          .label=${this.hass.localize(
            "ui.panel.config.energy.battery.dialog.state_of_charge"
          )}
          .helper=${this.hass.localize(
            "ui.panel.config.energy.battery.dialog.state_of_charge_helper"
          )}
          @value-changed=${this._statisticSocChanged}
        ></ha-statistic-picker>

        <ha-input
          .value=${
            this._source.capacity != null ? String(this._source.capacity) : ""
          }
          .label=${this.hass.localize(
            "ui.panel.config.energy.battery.dialog.capacity"
          )}
          .hint=${this.hass.localize(
            "ui.panel.config.energy.battery.dialog.capacity_helper"
          )}
          type="number"
          step="any"
          min="0"
          @input=${this._capacityChanged}
        >
          <span slot="end">kWh</span>
        </ha-input>

        <ha-dialog-footer slot="footer">
          <ha-button
            appearance="plain"
            @click=${this.closeDialog}
            slot="secondaryAction"
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            @click=${this._save}
            .disabled=${
              this._saving ||
              !this._isValid(pending) ||
              (!!this._params?.source && !this.isDirtyState)
            }
            .loading=${this._saving}
            slot="primaryAction"
          >
            ${this.hass.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _isValid(pending: PowerIntegral[]): boolean {
    // Energy fields are always required, but power sensors can provide them
    const isProvided = (energy: PowerIntegral["energy"]) =>
      !!this._source?.[energy] ||
      pending.some((item) => item.energy === energy);
    if (!isProvided("stat_energy_from") || !isProvided("stat_energy_to")) {
      return false;
    }

    // Check power config validity
    return isPowerConfigValid(this._powerType, this._powerConfig);
  }

  private async _updateMetadata(statId: string) {
    if (
      statId &&
      isExternalStatistic(statId) &&
      this._params?.statsMetadata &&
      !(statId in this._params.statsMetadata)
    ) {
      const [metadata] = await getStatisticMetadata(this.hass.callWS, [statId]);
      if (metadata) {
        this._params.statsMetadata[statId] = metadata;
        this.requestUpdate("_params");
      }
    }
  }

  private _statisticToChanged(ev: ValueChangedEvent<string>) {
    this._source = { ...this._source!, stat_energy_to: ev.detail.value };
    this._updateMetadata(ev.detail.value);
    this._updateFormDirtyState();
  }

  private _statisticFromChanged(ev: ValueChangedEvent<string>) {
    this._source = { ...this._source!, stat_energy_from: ev.detail.value };
    this._updateMetadata(ev.detail.value);
    this._updateFormDirtyState();
  }

  private _nameChanged(ev: InputEvent) {
    this._source = {
      ...this._source!,
      name: (ev.target as HaInput).value,
    };
    if (!this._source.name) {
      delete this._source.name;
    }
    this._updateFormDirtyState();
  }

  private _handlePowerConfigChanged(
    ev: HASSDomEvent<HASSDomEvents["power-config-changed"]>
  ) {
    this._powerType = ev.detail.powerType;
    this._powerConfig = ev.detail.powerConfig;
    this._updateFormDirtyState();
  }

  private _statisticSocChanged(ev: ValueChangedEvent<string>) {
    this._source = {
      ...this._source!,
      stat_soc: ev.detail.value || undefined,
    };
    this._updateFormDirtyState();
  }

  private _updateFormDirtyState(): void {
    this._updateDirtyState({
      source: this._source!,
      powerType: this._powerType,
      powerConfig: this._powerConfig,
    });
  }

  private _capacityChanged(ev: InputEvent) {
    const rawValue = (ev.target as HaInput).value;
    const value = rawValue ? parseFloat(rawValue) : NaN;
    this._source = {
      ...this._source!,
      capacity: Number.isFinite(value) && value > 0 ? value : undefined,
    };
    if (this._source.capacity === undefined) {
      delete this._source.capacity;
    }
    this._updateFormDirtyState();
  }

  private _pendingIntegrals(): PowerIntegral[] {
    if (!this._source || !this._energy_units) {
      return [];
    }
    return pendingPowerIntegrals(
      this.hass.states,
      this._source,
      this._powerType,
      this._powerConfig,
      this._energy_units
    );
  }

  private async _save() {
    const params = this._params!;
    this._error = undefined;
    this._saving = true;
    try {
      const pending = this._pendingIntegrals();
      if (pending.length) {
        const sensors = await this._energyFromPower(pending);
        if (!sensors) {
          return;
        }
        const updated = { ...this._source! };
        pending.forEach(({ energy }, index) => {
          updated[energy] = sensors[index];
        });
        this._source = updated;
        this._updateFormDirtyState();
      }

      const source: BatterySourceTypeEnergyPreference = {
        type: "battery",
        stat_energy_from: this._source!.stat_energy_from,
        stat_energy_to: this._source!.stat_energy_to,
      };
      if (this._source?.name) {
        source.name = this._source.name;
      }

      // Only include power_config if a power type is selected
      if (this._powerType !== "none") {
        source.power_config = { ...this._powerConfig };
      }

      if (this._source!.stat_soc) {
        source.stat_soc = this._source!.stat_soc;
      }

      if (this._source!.capacity != null) {
        source.capacity = this._source!.capacity;
      }

      await params.saveCallback(source);
      this._markDirtyStateClean();
      this.closeDialog();
    } catch (err: any) {
      this._error = err.message;
    } finally {
      this._saving = false;
    }
  }

  private _energyFromPower(
    pending: PowerIntegral[]
  ): Promise<string[] | undefined> {
    return confirmIntegrals(this, this.hass, {
      deviceClass: "energy",
      requests: pending.map(({ energy, rate, units }) => ({
        rate,
        units,
        name: this.hass.localize(
          energy === "stat_energy_from"
            ? "ui.panel.config.energy.battery.dialog.discharged_energy_name"
            : "ui.panel.config.energy.battery.dialog.charged_energy_name",
          {
            name: computeEnergyLabel(
              this.hass.states,
              this.hass.formatEntityName,
              rate,
              this._params?.statsMetadata?.[rate],
              this._source?.name
            ),
          }
        ),
      })),
      intro: this.hass.localize(
        "ui.panel.config.energy.battery.dialog.energy_sensors_needed"
      ),
      exclude: this._excludeList,
      statsMetadata: this._params?.statsMetadata,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-statistic-picker,
        ha-energy-power-config {
          display: block;
          margin-bottom: var(--ha-space-4);
        }
        ha-input {
          margin-bottom: var(--ha-space-4);
          --ha-input-padding-bottom: 0;
        }
        ha-input:last-of-type {
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
