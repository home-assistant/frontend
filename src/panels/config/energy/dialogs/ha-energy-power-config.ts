import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeKeys } from "../../../../common/translations/localize";
import "../../../../components/entity/ha-statistic-picker";
import "../../../../components/radio/ha-radio-group";
import type { HaRadioGroup } from "../../../../components/radio/ha-radio-group";
import "../../../../components/radio/ha-radio-option";
import type { PowerConfig } from "../../../../data/energy";
import { getSensorDeviceClassConvertibleUnits } from "../../../../data/sensor";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import type { PowerType } from "./power-config";

const powerUnitClasses = ["power"];

declare global {
  interface HASSDomEvents {
    "power-config-changed": { powerType: PowerType; powerConfig: PowerConfig };
  }
}

@customElement("ha-energy-power-config")
export class HaEnergyPowerConfig extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public powerType: PowerType = "none";

  @property({ attribute: false }) public powerConfig: PowerConfig = {};

  @property({ attribute: false }) public excludeList?: string[];

  /**
   * Base key for localization lookups.
   * Should include keys for: sensor_type, type_none, type_standard, type_inverted,
   * type_two_sensors, power, power_helper, type_inverted_description, power_from, power_to
   */
  @property({ attribute: false }) public localizeBaseKey =
    "ui.panel.config.energy.battery.dialog";

  @state() private _powerUnits?: string[];

  protected async willUpdate(
    changedProps: PropertyValues<this>
  ): Promise<void> {
    super.willUpdate(changedProps);

    if (changedProps.has("hass") && !this._powerUnits) {
      this._powerUnits = (
        await getSensorDeviceClassConvertibleUnits(this.hass, "power")
      ).units;
    }
  }

  protected render(): TemplateResult {
    return html`
      <p class="power-section-label">
        ${this.hass.localize(
          `${this.localizeBaseKey}.sensor_type` as LocalizeKeys
        )}
      </p>
      <p class="power-section-description">
        ${this.hass.localize(
          `${this.localizeBaseKey}.sensor_type_para` as LocalizeKeys
        )}
      </p>

      <ha-radio-group
        .value=${this.powerType}
        name="powerType"
        @change=${this._handlePowerTypeChanged}
      >
        <ha-radio-option value="none">
          ${this.hass.localize(
            `${this.localizeBaseKey}.type_none` as LocalizeKeys
          )}
        </ha-radio-option>
        <ha-radio-option value="standard">
          ${this.hass.localize(
            `${this.localizeBaseKey}.type_standard` as LocalizeKeys
          )}
        </ha-radio-option>
        <ha-radio-option value="inverted">
          ${this.hass.localize(
            `${this.localizeBaseKey}.type_inverted` as LocalizeKeys
          )}
        </ha-radio-option>
        <ha-radio-option value="two_sensors">
          ${this.hass.localize(
            `${this.localizeBaseKey}.type_two_sensors` as LocalizeKeys
          )}
        </ha-radio-option>
      </ha-radio-group>

      ${
        this.powerType === "standard"
          ? html`
              <ha-statistic-picker
                .hass=${this.hass}
                .includeUnitClass=${powerUnitClasses}
                .value=${this.powerConfig.stat_rate}
                .label=${this.hass.localize(
                  `${this.localizeBaseKey}.power` as LocalizeKeys
                )}
                .excludeStatistics=${this.excludeList}
                @value-changed=${this._standardPowerChanged}
                .helper=${this.hass.localize(
                  `${this.localizeBaseKey}.power_helper` as LocalizeKeys,
                  { unit: this._powerUnits?.join(", ") || "" }
                )}
              ></ha-statistic-picker>
            `
          : nothing
      }
      ${
        this.powerType === "inverted"
          ? html`
              <ha-statistic-picker
                .hass=${this.hass}
                .includeUnitClass=${powerUnitClasses}
                .value=${this.powerConfig.stat_rate_inverted}
                .label=${this.hass.localize(
                  `${this.localizeBaseKey}.power` as LocalizeKeys
                )}
                .excludeStatistics=${this.excludeList}
                @value-changed=${this._invertedPowerChanged}
                .helper=${this.hass.localize(
                  `${this.localizeBaseKey}.type_inverted_description` as LocalizeKeys
                )}
              ></ha-statistic-picker>
            `
          : nothing
      }
      ${
        this.powerType === "two_sensors"
          ? html`
              <ha-statistic-picker
                .hass=${this.hass}
                .includeUnitClass=${powerUnitClasses}
                .value=${this.powerConfig.stat_rate_from}
                .label=${this.hass.localize(
                  `${this.localizeBaseKey}.power_from` as LocalizeKeys
                )}
                .excludeStatistics=${[
                  ...(this.excludeList || []),
                  this.powerConfig.stat_rate_to,
                ].filter((id): id is string => Boolean(id))}
                @value-changed=${this._fromPowerChanged}
              ></ha-statistic-picker>
              <ha-statistic-picker
                .hass=${this.hass}
                .includeUnitClass=${powerUnitClasses}
                .value=${this.powerConfig.stat_rate_to}
                .label=${this.hass.localize(
                  `${this.localizeBaseKey}.power_to` as LocalizeKeys
                )}
                .excludeStatistics=${[
                  ...(this.excludeList || []),
                  this.powerConfig.stat_rate_from,
                ].filter((id): id is string => Boolean(id))}
                @value-changed=${this._toPowerChanged}
              ></ha-statistic-picker>
            `
          : nothing
      }
    `;
  }

  private _handlePowerTypeChanged(ev: Event) {
    const newPowerType = (ev.currentTarget as HaRadioGroup).value as PowerType;
    // Clear power config when switching types
    fireEvent(this, "power-config-changed", {
      powerType: newPowerType,
      powerConfig: {},
    });
  }

  private _standardPowerChanged(ev: ValueChangedEvent<string>) {
    fireEvent(this, "power-config-changed", {
      powerType: this.powerType,
      powerConfig: { stat_rate: ev.detail.value },
    });
  }

  private _invertedPowerChanged(ev: ValueChangedEvent<string>) {
    fireEvent(this, "power-config-changed", {
      powerType: this.powerType,
      powerConfig: { stat_rate_inverted: ev.detail.value },
    });
  }

  private _fromPowerChanged(ev: ValueChangedEvent<string>) {
    fireEvent(this, "power-config-changed", {
      powerType: this.powerType,
      powerConfig: {
        ...this.powerConfig,
        stat_rate_from: ev.detail.value,
      },
    });
  }

  private _toPowerChanged(ev: ValueChangedEvent<string>) {
    fireEvent(this, "power-config-changed", {
      powerType: this.powerType,
      powerConfig: {
        ...this.powerConfig,
        stat_rate_to: ev.detail.value,
      },
    });
  }

  static readonly styles: CSSResultGroup = css`
    ha-statistic-picker {
      display: block;
      margin-bottom: var(--ha-space-4);
    }
    ha-statistic-picker:last-of-type {
      margin-bottom: 0;
    }
    ha-radio-group {
      margin-bottom: var(--ha-space-4);
    }
    .power-section-label {
      margin-top: var(--ha-space-4);
      margin-bottom: var(--ha-space-2);
    }
    .power-section-description {
      margin-top: 0;
      margin-bottom: var(--ha-space-2);
      color: var(--secondary-text-color);
      font-size: 0.875em;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-energy-power-config": HaEnergyPowerConfig;
  }
}
