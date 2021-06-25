import "@material/mwc-button";
import "@polymer/paper-input/paper-input";
import type { PaperInputElement } from "@polymer/paper-input/paper-input";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import {
  emptyHomeConsumptionEnergyPreference,
  emptyProductionEnergyPreference,
  EnergyPreferences,
  HomeConsumptionEnergyPreference,
  ProductionEnergyPreference,
  saveEnergyPreferences,
} from "../../data/energy";
import { HomeAssistant } from "../../types";
import "../../components/entity/ha-statistics-picker";
import { getStatisticIds } from "../../data/history";

@customElement("ha-energy-settings")
export class EnergySettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public preferences!: EnergyPreferences;

  @state() private _error?: string;

  @state() private _statisticIds?: string[];

  public willUpdate() {
    if (!this.hasUpdated) {
      this._getStatisticIds();
    }
  }

  protected render(): TemplateResult {
    if (!this._statisticIds) {
      return html``;
    }
    const homeConsumption: HomeConsumptionEnergyPreference = this.preferences
      .home_consumption.length
      ? this.preferences.home_consumption[0]
      : emptyHomeConsumptionEnergyPreference();
    const production: ProductionEnergyPreference = this.preferences.production
      .length
      ? this.preferences.production[0]
      : emptyProductionEnergyPreference();

    /*
      TODO
      - Change `stat_consumption` from a stat picker to an entity picker
        and store as both entity_consumption and stat_consumption.
      - Allow picking entity energy price
      - Energy cards could potentially use https://github.com/Christian24/webcomponents-di
        to access shared energy data/preferences?
    */

    return html`
      ${this._error ? html`<div class="error">${this._error}</div>` : ""}
      <ha-statistic-picker
        .key=${"home_consumption"}
        id="stat_consumption"
        .hass=${this.hass}
        .statisticIds=${this._statisticIds}
        .value=${homeConsumption.stat_consumption}
        .label=${this.hass.localize(
          "ui.panel.energy.settings.home_consumption.stat_consumption"
        )}
        @value-changed=${this._valueChanged}
      ></ha-statistic-picker>
      <ha-statistic-picker
        .key=${"home_consumption"}
        id="stat_cost"
        .hass=${this.hass}
        .statisticIds=${this._statisticIds}
        .value=${homeConsumption.stat_cost}
        .label=${this.hass.localize(
          "ui.panel.energy.settings.home_consumption.stat_cost"
        )}
        @value-changed=${this._valueChanged}
      ></ha-statistic-picker>

      <h3>Solar</h3>
      <ha-statistic-picker
        .key=${"production"}
        id="stat_production"
        .hass=${this.hass}
        .statisticIds=${this._statisticIds}
        .value=${production.stat_production}
        .label=${this.hass.localize(
          "ui.panel.energy.settings.production.stat_production"
        )}
        @value-changed=${this._valueChanged}
      ></ha-statistic-picker>
      <ha-statistic-picker
        .key=${"production"}
        id="stat_return_to_grid"
        .hass=${this.hass}
        .statisticIds=${this._statisticIds}
        .value=${production.stat_return_to_grid}
        .label=${this.hass.localize(
          "ui.panel.energy.settings.production.stat_return_to_grid"
        )}
        @value-changed=${this._valueChanged}
      ></ha-statistic-picker>
      <ha-statistic-picker
        .key=${"production"}
        id="stat_predicted_production"
        .hass=${this.hass}
        .statisticIds=${this._statisticIds}
        .value=${production.stat_predicted_production}
        .label=${this.hass.localize(
          "ui.panel.energy.settings.production.stat_predicted_production"
        )}
        @value-changed=${this._valueChanged}
      ></ha-statistic-picker>

      <h3>Individual devices</h3>
      ${this.hass.localize(
        "ui.panel.energy.settings.device_consumption.description"
      )}
      <ha-statistics-picker
        .key=${"device_consumption"}
        id="stat_device_consumption"
        .hass=${this.hass}
        .value=${this.preferences.device_consumption.map(
          (pref) => pref.stat_consumption
        )}
        .statisticIds=${this._statisticIds}
        .pickedStatisticLabel=${this.hass.localize(
          "ui.panel.energy.settings.device_consumption.selected_stat"
        )}
        .pickStatisticLabel=${this.hass.localize(
          "ui.panel.energy.settings.device_consumption.add_stat"
        )}
        @value-changed=${this._valueChanged}
      >
      </ha-statistics-picker>
    `;
  }

  private async _getStatisticIds() {
    this._statisticIds = await getStatisticIds(this.hass);
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();

    const target = ev.target! as HTMLElement;
    const key = (target as any).key as
      | "production"
      | "home_consumption"
      | "device_consumption";
    const id = target.id;

    let value: string[] | string | number | undefined | null = ev.detail.value;

    if (value === "") {
      value = null;
    }

    if (value !== null && (target as PaperInputElement).type === "number") {
      value = Number(value);
    }

    const preferences = { ...this.preferences };

    if (key === "home_consumption") {
      if (preferences[key].length === 0) {
        preferences[key].push(emptyHomeConsumptionEnergyPreference());
      }
      preferences[key][0] = {
        ...preferences[key][0],
        [id]: value,
      };
      if (id === "stat_cost") {
        // TODO can we automatically set the currency based on the unit?
      }
    } else if (key === "production") {
      if (preferences[key].length === 0) {
        preferences[key].push(emptyProductionEnergyPreference());
      }
      preferences[key][0] = {
        ...preferences[key][0],
        [id]: value,
      };
    } else if (key === "device_consumption") {
      preferences[key] = (value as string[]).map((stat) => ({
        stat_consumption: stat,
      }));
    }

    this.preferences = preferences;

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
