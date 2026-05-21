import { mdiPlus } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/entity/ha-statistic-picker";
import "../../../../components/ha-button";
import "../../../../components/ha-checkbox";
import type { HaCheckbox } from "../../../../components/ha-checkbox";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-svg-icon";
import "../../../../components/radio/ha-radio-group";
import "../../../../components/input/ha-input";
import type { HaRadioGroup } from "../../../../components/radio/ha-radio-group";
import "../../../../components/radio/ha-radio-option";
import type { ConfigEntry } from "../../../../data/config_entries";
import { getConfigEntries } from "../../../../data/config_entries";
import type { SolarSourceTypeEnergyPreference } from "../../../../data/energy";
import {
  emptySolarEnergyPreference,
  energyStatisticHelpUrl,
} from "../../../../data/energy";
import { getSensorDeviceClassConvertibleUnits } from "../../../../data/sensor";
import { showConfigFlowDialog } from "../../../../dialogs/config-flow/show-dialog-config-flow";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import { brandsUrl } from "../../../../util/brands-url";
import type { EnergySettingsSolarDialogParams } from "./show-dialogs-energy";
import {
  getStatisticLabel,
  getStatisticMetadata,
  isExternalStatistic,
} from "../../../../data/recorder";
import type { HaInput } from "../../../../components/input/ha-input";

const energyUnitClasses = ["energy"];
const powerUnitClasses = ["power"];

@customElement("dialog-energy-solar-settings")
export class DialogEnergySolarSettings
  extends LitElement
  implements HassDialog<EnergySettingsSolarDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: EnergySettingsSolarDialogParams;

  @state() private _open = false;

  @state() private _source?: SolarSourceTypeEnergyPreference;

  @state() private _configEntries?: ConfigEntry[];

  @state() private _forecast?: boolean;

  @state() private _energy_units?: string[];

  @state() private _power_units?: string[];

  @state() private _error?: string;

  private _excludeList?: string[];

  private _excludeListPower?: string[];

  public async showDialog(
    params: EnergySettingsSolarDialogParams
  ): Promise<void> {
    this._params = params;
    this._fetchSolarForecastConfigEntries();
    this._source = params.source
      ? { ...params.source }
      : emptySolarEnergyPreference();
    this._forecast = this._source.config_entry_solar_forecast !== null;
    this._energy_units = (
      await getSensorDeviceClassConvertibleUnits(this.hass, "energy")
    ).units;
    this._power_units = (
      await getSensorDeviceClassConvertibleUnits(this.hass, "power")
    ).units;
    this._excludeList = this._params.solar_sources
      .map((entry) => entry.stat_energy_from)
      .filter((id) => id !== this._source?.stat_energy_from);
    this._excludeListPower = this._params.solar_sources
      .map((entry) => entry.stat_rate)
      .filter((id) => id && id !== this._source?.stat_rate) as string[];

    this._open = true;
  }

  public closeDialog() {
    this._open = false;
    return true;
  }

  private _dialogClosed() {
    this._params = undefined;
    this._source = undefined;
    this._error = undefined;
    this._excludeList = undefined;
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
          "ui.panel.config.energy.solar.dialog.header"
        )}
        prevent-scrim-close
        @closed=${this._dialogClosed}
      >
        ${this._error ? html`<p class="error">${this._error}</p>` : ""}

        <ha-statistic-picker
          .hass=${this.hass}
          .helpMissingEntityUrl=${energyStatisticHelpUrl}
          .includeUnitClass=${energyUnitClasses}
          .value=${this._source.stat_energy_from}
          .label=${this.hass.localize(
            "ui.panel.config.energy.solar.dialog.solar_production_energy"
          )}
          .excludeStatistics=${this._excludeList}
          @value-changed=${this._statisticChanged}
          .helper=${this.hass.localize(
            "ui.panel.config.energy.solar.dialog.entity_para",
            { unit: this._energy_units?.join(", ") || "" }
          )}
          autofocus
        ></ha-statistic-picker>

        <ha-input
          .label=${this.hass.localize(
            "ui.panel.config.energy.solar.dialog.display_name"
          )}
          type="text"
          .disabled=${!this._source?.stat_energy_from}
          .value=${this._source?.name || ""}
          .placeholder=${this._source?.stat_energy_from
            ? getStatisticLabel(
                this.hass,
                this._source.stat_energy_from,
                this._params?.statsMetadata?.[this._source.stat_energy_from]
              )
            : ""}
          @input=${this._nameChanged}
        >
        </ha-input>

        <ha-statistic-picker
          .hass=${this.hass}
          .includeUnitClass=${powerUnitClasses}
          .value=${this._source.stat_rate}
          .label=${this.hass.localize(
            "ui.panel.config.energy.solar.dialog.solar_production_power"
          )}
          .excludeStatistics=${this._excludeListPower}
          @value-changed=${this._powerStatisticChanged}
          .helper=${this.hass.localize(
            "ui.panel.config.energy.solar.dialog.entity_para",
            { unit: this._power_units?.join(", ") || "" }
          )}
        ></ha-statistic-picker>

        <h3>
          ${this.hass.localize(
            "ui.panel.config.energy.solar.dialog.solar_production_forecast"
          )}
        </h3>
        <p>
          ${this.hass.localize(
            "ui.panel.config.energy.solar.dialog.solar_production_forecast_description"
          )}
        </p>

        <ha-radio-group
          .value=${this._forecast ? "true" : "false"}
          name="forecast"
          @change=${this._handleForecastChanged}
        >
          <ha-radio-option value="false">
            ${this.hass.localize(
              "ui.panel.config.energy.solar.dialog.dont_forecast_production"
            )}
          </ha-radio-option>
          <ha-radio-option value="true">
            ${this.hass.localize(
              "ui.panel.config.energy.solar.dialog.forecast_production"
            )}
          </ha-radio-option>
        </ha-radio-group>
        ${this._forecast
          ? html`<div class="forecast-options">
              ${this._configEntries?.map(
                (entry) =>
                  html`<ha-checkbox
                    .entry=${entry}
                    @change=${this._forecastCheckChanged}
                    .checked=${!!this._source?.config_entry_solar_forecast?.includes(
                      entry.entry_id
                    )}
                  >
                    <div style="display: flex; align-items: center;">
                      <img
                        alt=""
                        crossorigin="anonymous"
                        referrerpolicy="no-referrer"
                        style="height: 24px; margin-right: 16px; margin-inline-end: 16px; margin-inline-start: initial;"
                        src=${brandsUrl(
                          {
                            domain: entry.domain,
                            type: "icon",
                            darkOptimized: this.hass.themes?.darkMode,
                          },
                          this.hass.auth.data.hassUrl
                        )}
                      />${entry.title}
                    </div>
                  </ha-checkbox>`
              )}
              <ha-button
                appearance="filled"
                size="small"
                @click=${this._addForecast}
              >
                <ha-svg-icon .path=${mdiPlus} slot="start"></ha-svg-icon>
                ${this.hass.localize(
                  "ui.panel.config.energy.solar.dialog.add_forecast"
                )}
              </ha-button>
            </div>`
          : ""}

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
            .disabled=${!this._source.stat_energy_from}
            slot="primaryAction"
          >
            ${this.hass.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private async _fetchSolarForecastConfigEntries() {
    const domains = this._params!.info.solar_forecast_domains;
    this._configEntries =
      domains.length === 0
        ? []
        : domains.length === 1
          ? await getConfigEntries(this.hass, {
              type: ["service"],
              domain: domains[0],
            })
          : (await getConfigEntries(this.hass, { type: ["service"] })).filter(
              (entry) => domains.includes(entry.domain)
            );
  }

  private _handleForecastChanged(ev: Event) {
    this._forecast = (ev.currentTarget as HaRadioGroup).value === "true";
  }

  private _forecastCheckChanged(ev) {
    const input = ev.currentTarget as HaCheckbox;
    const entry = (input as any).entry as ConfigEntry;
    const checked = input.checked;
    if (checked) {
      if (this._source!.config_entry_solar_forecast === null) {
        this._source!.config_entry_solar_forecast = [];
      }
      this._source!.config_entry_solar_forecast.push(entry.entry_id);
    } else {
      this._source!.config_entry_solar_forecast!.splice(
        this._source!.config_entry_solar_forecast!.indexOf(entry.entry_id),
        1
      );
    }
  }

  private _addForecast() {
    showConfigFlowDialog(this, {
      startFlowHandler: "forecast_solar",
      dialogClosedCallback: (params) => {
        if (params.entryId) {
          if (this._source!.config_entry_solar_forecast === null) {
            this._source!.config_entry_solar_forecast = [];
          }
          this._source!.config_entry_solar_forecast.push(params.entryId);
          this._fetchSolarForecastConfigEntries();
        }
      },
    });
  }

  private async _statisticChanged(ev: ValueChangedEvent<string>) {
    this._source = { ...this._source!, stat_energy_from: ev.detail.value };
    if (
      ev.detail.value &&
      isExternalStatistic(ev.detail.value) &&
      this._params?.statsMetadata &&
      !(ev.detail.value in this._params.statsMetadata)
    ) {
      const [metadata] = await getStatisticMetadata(this.hass, [
        ev.detail.value,
      ]);
      if (metadata) {
        this._params.statsMetadata[ev.detail.value] = metadata;
        this.requestUpdate("_params");
      }
    }
  }

  private _powerStatisticChanged(ev: ValueChangedEvent<string>) {
    this._source = { ...this._source!, stat_rate: ev.detail.value };
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

  private async _save() {
    try {
      if (!this._forecast) {
        this._source!.config_entry_solar_forecast = null;
      }
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
        ha-statistic-picker {
          display: block;
          margin-bottom: var(--ha-space-4);
        }
        img {
          height: 24px;
          margin-right: 16px;
          margin-inline-end: 16px;
          margin-inline-start: initial;
        }
        ha-statistic-picker {
          width: 100%;
        }
        ha-radio-group {
          margin-bottom: var(--ha-space-3);
        }
        .forecast-options {
          display: flex;
          flex-direction: column;
          min-width: 0;
          gap: var(--ha-space-2);
          margin-inline-start: var(--ha-space-3);
        }
        .forecast-options ha-button {
          margin-top: var(--ha-space-4);
          width: fit-content;
        }
        .forecast-options ha-checkbox {
          justify-content: center;
          min-height: 40px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-energy-solar-settings": DialogEnergySolarSettings;
  }
}
