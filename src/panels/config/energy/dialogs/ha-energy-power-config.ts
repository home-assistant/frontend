import { mdiInformationOutline } from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { HASSDomCurrentTargetEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import type { LocalizeKeys } from "../../../../common/translations/localize";
import "../../../../components/entity/ha-statistic-picker";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-tooltip";
import "../../../../components/radio/ha-radio-group";
import type { HaRadioGroup } from "../../../../components/radio/ha-radio-group";
import "../../../../components/radio/ha-radio-option";
import type { PowerConfig } from "../../../../data/energy";
import { getSensorDeviceClassConvertibleUnits } from "../../../../data/sensor";
import { buttonLinkStyle } from "../../../../resources/styles";
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

  /** Entity id of the power sensor generated for the saved config, if any. */
  @property({ attribute: false }) public helperEntityId?: string;

  /**
   * Base key for localization lookups.
   * Should include keys for: sensor_type, sensor_type_para, type_none, type_standard,
   * type_inverted, type_two_sensors, power, power_helper, type_inverted_description,
   * power_from, power_to, helper_sensor_note, helper_sensor_in_use
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

  private get _requiredError(): string {
    return this.hass.localize("ui.common.error_required");
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
          ${this._renderHelperSensorNote("inverted")}
        </ha-radio-option>
        <ha-radio-option value="two_sensors">
          ${this.hass.localize(
            `${this.localizeBaseKey}.type_two_sensors` as LocalizeKeys
          )}
          ${this._renderHelperSensorNote("two_sensors")}
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
                required
                .invalid=${!this.powerConfig.stat_rate}
                .errorMessage=${this._requiredError}
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
                required
                .invalid=${!this.powerConfig.stat_rate_inverted}
                .errorMessage=${this._requiredError}
              ></ha-statistic-picker>
            `
          : nothing
      }
      ${
        // These two exclude each other, so they keep their clear button
        // (and therefore no required marker) to stay swappable.
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
                .invalid=${!this.powerConfig.stat_rate_from}
                .errorMessage=${this._requiredError}
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
                .invalid=${!this.powerConfig.stat_rate_to}
                .errorMessage=${this._requiredError}
              ></ha-statistic-picker>
            `
          : nothing
      }
      ${this._renderHelperSensorInUse()}
    `;
  }

  private _renderHelperSensorNote(powerType: PowerType) {
    const id = `helper-sensor-note-${powerType}`;
    return html`
      <ha-svg-icon
        id=${id}
        tabindex="0"
        class="note-icon"
        .path=${mdiInformationOutline}
        @click=${stopPropagation}
      ></ha-svg-icon>
      <ha-tooltip .for=${id} placement="top">
        ${this.hass.localize(
          `${this.localizeBaseKey}.helper_sensor_note` as LocalizeKeys
        )}
      </ha-tooltip>
    `;
  }

  private _renderHelperSensorInUse() {
    if (!this.helperEntityId) {
      return nothing;
    }
    return html`
      <p class="helper-sensor-in-use">
        ${this.hass.localize(
          `${this.localizeBaseKey}.helper_sensor_in_use` as LocalizeKeys,
          {
            entity: html`<button class="link" @click=${this._showHelperSensor}>
              ${this.helperEntityId}
            </button>`,
          }
        )}
      </p>
    `;
  }

  private _showHelperSensor() {
    fireEvent(this, "hass-more-info", { entityId: this.helperEntityId! });
  }

  private _handlePowerTypeChanged(ev: HASSDomCurrentTargetEvent<HaRadioGroup>) {
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

  static readonly styles: CSSResultGroup = [
    buttonLinkStyle,
    css`
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
      .note-icon {
        margin-inline-start: var(--ha-space-1);
        color: var(--secondary-text-color);
        --mdc-icon-size: 18px;
      }
      .helper-sensor-in-use {
        margin: var(--ha-space-2) 0 0 0;
        color: var(--secondary-text-color);
        font-size: 0.875em;
      }
      .helper-sensor-in-use button.link {
        color: var(--primary-color);
        /* entity ids offer no break opportunities of their own */
        overflow-wrap: anywhere;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-energy-power-config": HaEnergyPowerConfig;
  }
}
