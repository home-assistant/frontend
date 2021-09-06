import { mdiSolarPower } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-dialog";
import {
  emptySolarEnergyPreference,
  SolarSourceTypeEnergyPreference,
} from "../../../../data/energy";
import { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import { EnergySettingsSolarDialogParams } from "./show-dialogs-energy";
import "@material/mwc-button/mwc-button";
import "../../../../components/entity/ha-statistic-picker";
import "../../../../components/ha-radio";
import "../../../../components/ha-checkbox";
import type { HaCheckbox } from "../../../../components/ha-checkbox";
import "../../../../components/ha-formfield";
import type { HaRadio } from "../../../../components/ha-radio";
import { showConfigFlowDialog } from "../../../../dialogs/config-flow/show-dialog-config-flow";
import { ConfigEntry, getConfigEntries } from "../../../../data/config_entries";
import { brandsUrl } from "../../../../util/brands-url";

const energyUnits = ["kWh"];

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

  @state() private _error?: string;

  public async showDialog(
    params: EnergySettingsSolarDialogParams
  ): Promise<void> {
    this._params = params;
    this._fetchSolarForecastConfigEntries();
    this._source = params.source
      ? { ...params.source }
      : (this._source = emptySolarEnergyPreference());
    this._forecast = this._source.config_entry_solar_forecast !== null;
  }

  public closeDialog(): void {
    this._params = undefined;
    this._source = undefined;
    this._error = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._params || !this._source) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        .heading=${html`<ha-svg-icon
            .path=${mdiSolarPower}
            style="--mdc-icon-size: 32px;"
          ></ha-svg-icon>
          Configure solar panels`}
        @closed=${this.closeDialog}
      >
        ${this._error ? html`<p class="error">${this._error}</p>` : ""}

        <ha-statistic-picker
          .hass=${this.hass}
          .includeUnitOfMeasurement=${energyUnits}
          .value=${this._source.stat_energy_from}
          .label=${`Solar production energy (kWh)`}
          entities-only
          @value-changed=${this._statisticChanged}
        ></ha-statistic-picker>

        <h3>Solar production forecast</h3>
        <p>
          Adding solar production forecast information will allow you to quickly
          see your expected production for today.
        </p>

        <ha-formfield label="Don't forecast production">
          <ha-radio
            value="false"
            name="forecast"
            .checked=${!this._forecast}
            @change=${this._handleForecastChanged}
          ></ha-radio>
        </ha-formfield>
        <ha-formfield label="Forecast Production">
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
                (entry) => html`<ha-formfield
                  .label=${html`<div
                    style="display: flex; align-items: center;"
                  >
                    <img
                      referrerpolicy="no-referrer"
                      style="height: 24px; margin-right: 16px;"
                      src=${brandsUrl({
                        domain: entry.domain,
                        type: "icon",
                        darkOptimized: this.hass.selectedTheme?.dark,
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
                Add forecast
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
    this._configEntries = (await getConfigEntries(this.hass)).filter((entry) =>
      domains.includes(entry.domain)
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
    } catch (e) {
      this._error = e.message;
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
