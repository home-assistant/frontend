import "@material/mwc-button/mwc-button";
import { mdiSolarPower } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/entity/ha-statistic-picker";
import "../../../../components/ha-checkbox";
import type { HaCheckbox } from "../../../../components/ha-checkbox";
import "../../../../components/ha-dialog";
import "../../../../components/ha-formfield";
import "../../../../components/ha-radio";
import type { HaRadio } from "../../../../components/ha-radio";
import { ConfigEntry, getConfigEntries } from "../../../../data/config_entries";
import {
  emptySolarEnergyPreference,
  SolarSourceTypeEnergyPreference,
  energyStatisticHelpUrl,
} from "../../../../data/energy";
import { getSensorDeviceClassConvertibleUnits } from "../../../../data/sensor";
import { showConfigFlowDialog } from "../../../../dialogs/config-flow/show-dialog-config-flow";
import { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import { brandsUrl } from "../../../../util/brands-url";
import { EnergySettingsSolarDialogParams } from "./show-dialogs-energy";

const energyUnitClasses = ["energy"];

@customElement("dialog-energy-solar-settings")
export class DialogEnergySolarSettings
  extends LitElement
  implements HassDialog<EnergySettingsSolarDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: EnergySettingsSolarDialogParams;

  @state() private _source?: SolarSourceTypeEnergyPreference;

  @state() private _configEntries?: ConfigEntry[];

  @state() private _forecast?: boolean;

  @state() private _energy_units?: string[];

  @state() private _error?: string;

  private _excludeList?: string[];

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
    this._excludeList = this._params.solar_sources
      .map((entry) => entry.stat_energy_from)
      .filter((id) => id !== this._source?.stat_energy_from);
  }

  public closeDialog(): void {
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

    const pickableUnit = this._energy_units?.join(", ") || "";

    return html`
      <ha-dialog
        open
        .heading=${html`<ha-svg-icon
            .path=${mdiSolarPower}
            style="--mdc-icon-size: 32px;"
          ></ha-svg-icon>
          ${this.hass.localize("ui.panel.config.energy.solar.dialog.header")}`}
        @closed=${this.closeDialog}
      >
        ${this._error ? html`<p class="error">${this._error}</p>` : ""}
        <div>
          ${this.hass.localize(
            "ui.panel.config.energy.solar.dialog.entity_para",
            { unit: pickableUnit }
          )}
        </div>

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
          dialogInitialFocus
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

        <ha-formfield
          label=${this.hass.localize(
            "ui.panel.config.energy.solar.dialog.dont_forecast_production"
          )}
        >
          <ha-radio
            value="false"
            name="forecast"
            .checked=${!this._forecast}
            @change=${this._handleForecastChanged}
          ></ha-radio>
        </ha-formfield>
        <ha-formfield
          label=${this.hass.localize(
            "ui.panel.config.energy.solar.dialog.forecast_production"
          )}
        >
          <ha-radio
            value="true"
            name="forecast"
            .checked=${this._forecast}
            @change=${this._handleForecastChanged}
          ></ha-radio>
        </ha-formfield>
        ${this._forecast
          ? html`<div class="forecast-options">
              ${this._configEntries?.map(
                (entry) =>
                  html`<ha-formfield
                    .label=${html`<div
                      style="display: flex; align-items: center;"
                    >
                      <img
                        alt=""
                        crossorigin="anonymous"
                        referrerpolicy="no-referrer"
                        style="height: 24px; margin-right: 16px;"
                        src=${brandsUrl({
                          domain: entry.domain,
                          type: "icon",
                          darkOptimized: this.hass.themes?.darkMode,
                        })}
                      />${entry.title}
                    </div>`}
                  >
                    <ha-checkbox
                      .entry=${entry}
                      @change=${this._forecastCheckChanged}
                      .checked=${this._source?.config_entry_solar_forecast?.includes(
                        entry.entry_id
                      )}
                    >
                    </ha-checkbox>
                  </ha-formfield>`
              )}
              <mwc-button @click=${this._addForecast}>
                ${this.hass.localize(
                  "ui.panel.config.energy.solar.dialog.add_forecast"
                )}
              </mwc-button>
            </div>`
          : ""}

        <mwc-button @click=${this.closeDialog} slot="secondaryAction">
          ${this.hass.localize("ui.common.cancel")}
        </mwc-button>
        <mwc-button
          @click=${this._save}
          .disabled=${!this._source.stat_energy_from}
          slot="primaryAction"
        >
          ${this.hass.localize("ui.common.save")}
        </mwc-button>
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

  private _handleForecastChanged(ev: CustomEvent) {
    const input = ev.currentTarget as HaRadio;
    this._forecast = input.value === "true";
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

  private _statisticChanged(ev: CustomEvent<{ value: string }>) {
    this._source = { ...this._source!, stat_energy_from: ev.detail.value };
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
        ha-dialog {
          --mdc-dialog-max-width: 430px;
        }
        img {
          height: 24px;
          margin-right: 16px;
        }
        ha-formfield {
          display: block;
        }
        ha-statistic-picker {
          width: 100%;
        }
        .forecast-options {
          padding-left: 32px;
        }
        .forecast-options mwc-button {
          padding-left: 8px;
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
