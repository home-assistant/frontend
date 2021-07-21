import { mdiDelete, mdiPencil, mdiSolarPower } from "@mdi/js";
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
import "../../../../components/ha-formfield";
import "../../../../components/entity/ha-entity-picker";

const energyUnits = ["kWh"];

@customElement("dialog-energy-solar-settings")
export class DialogEnergySolarSettings
  extends LitElement
  implements HassDialog<EnergySettingsSolarDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: EnergySettingsSolarDialogParams;

  @state() private _source?: SolarSourceTypeEnergyPreference;

  @state() private _error?: string;

  public async showDialog(
    params: EnergySettingsSolarDialogParams
  ): Promise<void> {
    this._params = params;
    this._source = params.source
      ? { ...params.source }
      : (this._source = emptySolarEnergyPreference());
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
    // .statisticIds=${this._statisticIds}

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
        <p>Solar production for the win! <a href="#">Learn more</a></p>

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
          We can predict how much energy your solar panels will produce, you can
          link or setup an integration that will provide this data.
        </p>

        source.config_entry_solar_forecast

        <div class="row">
          <img
            referrerpolicy="no-referrer"
            src="https://brands.home-assistant.io/forecast_solar/icon.png"
          />
          <span class="content">Forecast.Solar</span>
          <mwc-icon-button
            ><ha-svg-icon .path=${mdiPencil}></ha-svg-icon
          ></mwc-icon-button>
          <mwc-icon-button
            ><ha-svg-icon .path=${mdiDelete}></ha-svg-icon
          ></mwc-icon-button>
        </div>

        <mwc-button @click=${this.closeDialog} slot="secondaryAction">
          ${this.hass.localize("ui.common.cancel")}
        </mwc-button>
        <mwc-button @click=${this._save} slot="primaryAction">
          ${this.hass.localize("ui.common.save")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _statisticChanged(ev: CustomEvent<{ value: string }>) {
    this._source!.stat_energy_from = ev.detail.value;
  }

  private async _save() {
    try {
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
        .row {
          display: flex;
          align-items: center;
          border-top: 1px solid var(--divider-color);
          height: 48px;
          box-sizing: border-box;
        }
        .row img {
          margin-right: 16px;
        }
        .row img {
          height: 24px;
        }
        .row .content {
          flex-grow: 1;
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
