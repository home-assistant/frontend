import "@material/mwc-button";
import "@polymer/paper-input/paper-input";
import type { PaperInputElement } from "@polymer/paper-input/paper-input";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { EnergyPreferences, saveEnergyPreferences } from "../../data/energy";
import { HomeAssistant } from "../../types";
import "../../components/entity/ha-entities-picker";

const sensorDomain = ["sensor"];
const energyUnits = ["kWh"];
const powerUnits = ["W", "kW"];

@customElement("ha-energy-settings")
export class EnergySettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public preferences: Partial<EnergyPreferences> = {};

  @state() private _error?: string;

  protected render(): TemplateResult {
    return html`
      ${this._error ? html`<div class="error">${this._error}</div>` : ""}
      <ha-entity-picker
        id="stat_house_energy_meter"
        .hass=${this.hass}
        .includeDomains=${sensorDomain}
        .includeUnitOfMeasurement=${energyUnits}
        .value=${this.preferences?.stat_house_energy_meter}
        .label=${this.hass.localize(
          "ui.panel.energy.settings.stat_house_energy_meter"
        )}
        @value-changed=${this._valueChanged}
      ></ha-entity-picker>
      <p>schedule_tariff: schedule_tariff: null; // todo</p>
      <h3>Solar</h3>
      <ha-entity-picker
        id="stat_solar_generatation"
        .hass=${this.hass}
        .includeDomains=${sensorDomain}
        .includeUnitOfMeasurement=${powerUnits}
        .value=${this.preferences?.stat_solar_generatation}
        .label=${this.hass.localize(
          "ui.panel.energy.settings.stat_solar_generatation"
        )}
        @value-changed=${this._valueChanged}
      ></ha-entity-picker>
      <ha-entity-picker
        id="stat_solar_return_to_grid"
        .hass=${this.hass}
        .includeDomains=${sensorDomain}
        .includeUnitOfMeasurement=${powerUnits}
        .value=${this.preferences?.stat_solar_return_to_grid}
        .label=${this.hass.localize(
          "ui.panel.energy.settings.stat_solar_return_to_grid"
        )}
        @value-changed=${this._valueChanged}
      ></ha-entity-picker>
      <ha-entity-picker
        id="stat_solar_predicted_generation"
        .hass=${this.hass}
        .includeDomains=${sensorDomain}
        .includeUnitOfMeasurement=${powerUnits}
        .value=${this.preferences?.stat_solar_predicted_generation}
        .label=${this.hass.localize(
          "ui.panel.energy.settings.stat_solar_predicted_generation"
        )}
        @value-changed=${this._valueChanged}
      ></ha-entity-picker>
      <h3>Individual devices</h3>
      ${this.hass.localize("ui.panel.energy.settings.stat_device_consumption")}
      <ha-entities-picker
        id="stat_device_consumption"
        .hass=${this.hass}
        .includeDomains=${sensorDomain}
        .includeUnitOfMeasurement=${energyUnits}
        .value=${this.preferences?.stat_device_consumption}
        .pickedEntityLabel=${this.hass.localize(
          "ui.panel.energy.settings.selected_stat_device_consumption"
        )}
        .pickEntityLabel=${this.hass.localize(
          "ui.panel.energy.settings.add_stat_device_consumption"
        )}
        @value-changed=${this._valueChanged}
      >
      </ha-entities-picker>
      <h3>Costs</h3>
      <paper-input
        id="cost_kwh_low_tariff"
        type="number"
        .value=${this.preferences?.cost_kwh_low_tariff}
        .label=${this.hass.localize(
          "ui.panel.energy.settings.cost_kwh_low_tariff"
        )}
        @value-changed=${this._valueChanged}
      ></paper-input>
      <paper-input
        id="cost_kwh_normal_tariff"
        type="number"
        .value=${this.preferences?.cost_kwh_normal_tariff}
        .label=${this.hass.localize(
          "ui.panel.energy.settings.cost_kwh_normal_tariff"
        )}
        @value-changed=${this._valueChanged}
      ></paper-input>
      <paper-input
        id="cost_grid_management_day"
        type="number"
        .value=${this.preferences?.cost_grid_management_day}
        .label=${this.hass.localize(
          "ui.panel.energy.settings.cost_grid_management_day"
        )}
        @value-changed=${this._valueChanged}
      ></paper-input>
      <paper-input
        id="cost_delivery_cost_day"
        type="number"
        .value=${this.preferences?.cost_delivery_cost_day}
        .label=${this.hass.localize(
          "ui.panel.energy.settings.cost_delivery_cost_day"
        )}
        @value-changed=${this._valueChanged}
      ></paper-input>
      <paper-input
        id="cost_discount_energy_tax_day"
        type="number"
        .value=${this.preferences?.cost_discount_energy_tax_day}
        .label=${this.hass.localize(
          "ui.panel.energy.settings.cost_discount_energy_tax_day"
        )}
        @value-changed=${this._valueChanged}
      ></paper-input>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();

    const target = ev.target! as HTMLElement;
    const id = target.id;

    let value: string[] | string | number | undefined | null = ev.detail.value;

    if (value === "") {
      value = null;
    }

    if (value !== null && (target as PaperInputElement).type === "number") {
      value = Number(value);
    }

    if (this.preferences[id] === value) {
      return;
    }
    this.preferences = { ...this.preferences, [id]: value };
    fireEvent(this, "value-changed", { value: this.preferences });
  }

  public async savePreferences() {
    if (!this.preferences) {
      return;
    }
    try {
      await saveEnergyPreferences(this.hass, this.preferences);
    } catch (err) {
      this._error = `Failed to save config: ${err.message}`;
      throw err;
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      .error {
        color: var(--error-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-energy-settings": EnergySettings;
  }
}
