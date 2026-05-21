import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
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
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import "./ha-energy-power-config";
import {
  buildPowerExcludeList,
  getInitialPowerConfig,
  getPowerTypeFromConfig,
  type HaEnergyPowerConfig,
  type PowerType,
} from "./ha-energy-power-config";
import type { EnergySettingsBatteryDialogParams } from "./show-dialogs-energy";
import type { HaInput } from "../../../../components/input/ha-input";

const energyUnitClasses = ["energy"];
const socStatisticsUnits = ["%"];
const socDeviceClass = "battery";

@customElement("dialog-energy-battery-settings")
export class DialogEnergyBatterySettings
  extends LitElement
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

  @query("ha-energy-power-config") private _powerConfigEl?: HaEnergyPowerConfig;

  private _excludeList?: string[];

  private _excludeListPower?: string[];

  public async showDialog(
    params: EnergySettingsBatteryDialogParams
  ): Promise<void> {
    this._params = params;
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

    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${this.hass.localize(
          "ui.panel.config.energy.battery.dialog.header"
        )}
        prevent-scrim-close
        @closed=${this._dialogClosed}
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
          autofocus
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

        <ha-input
          .label=${this.hass.localize(
            "ui.panel.config.energy.battery.dialog.display_name"
          )}
          type="text"
          .disabled=${!(
            this._source?.stat_energy_from || this._source?.stat_energy_to
          )}
          .value=${this._source?.name || ""}
          .placeholder=${this._source?.stat_energy_from
            ? getStatisticLabel(
                this.hass,
                this._source.stat_energy_from,
                this._params?.statsMetadata?.[this._source.stat_energy_from]
              )
            : this._source?.stat_energy_to
              ? getStatisticLabel(
                  this.hass,
                  this._source.stat_energy_to,
                  this._params?.statsMetadata?.[this._source.stat_energy_to]
                )
              : ""}
          @input=${this._nameChanged}
        >
        </ha-input>

        <ha-energy-power-config
          .hass=${this.hass}
          .powerType=${this._powerType}
          .powerConfig=${this._powerConfig}
          .excludeList=${this._excludeListPower}
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
            .disabled=${!this._isValid()}
            slot="primaryAction"
          >
            ${this.hass.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _isValid(): boolean {
    // Energy fields are always required
    if (!this._source?.stat_energy_from || !this._source?.stat_energy_to) {
      return false;
    }

    // Check power config validity
    if (this._powerConfigEl && !this._powerConfigEl.isValid()) {
      return false;
    }

    return true;
  }

  private async _updateMetadata(statId: string) {
    if (
      statId &&
      isExternalStatistic(statId) &&
      this._params?.statsMetadata &&
      !(statId in this._params.statsMetadata)
    ) {
      const [metadata] = await getStatisticMetadata(this.hass, [statId]);
      if (metadata) {
        this._params.statsMetadata[statId] = metadata;
        this.requestUpdate("_params");
      }
    }
  }

  private _statisticToChanged(ev: ValueChangedEvent<string>) {
    this._source = { ...this._source!, stat_energy_to: ev.detail.value };
    this._updateMetadata(ev.detail.value);
  }

  private _statisticFromChanged(ev: ValueChangedEvent<string>) {
    this._source = { ...this._source!, stat_energy_from: ev.detail.value };
    this._updateMetadata(ev.detail.value);
  }

  private _nameChanged(ev: InputEvent) {
    this._source = {
      ...this._source!,
      name: (ev.target as HaInput).value,
    };
    if (!this._source.name) {
      delete this._source.name;
    }
  }

  private _handlePowerConfigChanged(
    ev: CustomEvent<{ powerType: PowerType; powerConfig: PowerConfig }>
  ) {
    this._powerType = ev.detail.powerType;
    this._powerConfig = ev.detail.powerConfig;
  }

  private _statisticSocChanged(ev: ValueChangedEvent<string>) {
    this._source = {
      ...this._source!,
      stat_soc: ev.detail.value || undefined,
    };
  }

  private async _save() {
    try {
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
        ha-statistic-picker,
        ha-energy-power-config {
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
