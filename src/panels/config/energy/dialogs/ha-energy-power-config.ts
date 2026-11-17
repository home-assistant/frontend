import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../../../../common/decorators/consume";
import { consumeLocalize } from "../../../../common/decorators/consume-context-entry";
import { fireEvent } from "../../../../common/dom/fire_event";
import type {
  LocalizeFunc,
  LocalizeKeys,
} from "../../../../common/translations/localize";
import "../../../../components/entity/ha-statistic-picker";
import "../../../../components/ha-select";
import type { HaSelectSelectEvent } from "../../../../components/ha-select";
import { apiContext } from "../../../../data/context";
import type { PowerConfig } from "../../../../data/energy";
import { getSensorDeviceClassConvertibleUnits } from "../../../../data/sensor";
import { buttonLinkStyle } from "../../../../resources/styles";
import type { HomeAssistantApi, ValueChangedEvent } from "../../../../types";
import type { PowerType } from "./power-config";

const powerUnitClasses = ["power"];

declare global {
  interface HASSDomEvents {
    "power-config-changed": { powerType: PowerType; powerConfig: PowerConfig };
  }
}

@customElement("ha-energy-power-config")
export class HaEnergyPowerConfig extends LitElement {
  @property({ attribute: false }) public powerType: PowerType = "none";

  @property({ attribute: false }) public powerConfig: PowerConfig = {};

  @property({ attribute: false }) public excludeList?: string[];

  @property({ type: Boolean }) public disabled = false;

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

  @state() @consumeLocalize() private _localize!: LocalizeFunc;

  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @state() private _powerUnits?: string[];

  protected async firstUpdated(): Promise<void> {
    this._powerUnits = (
      await getSensorDeviceClassConvertibleUnits(this._api.callWS, "power")
    ).units;
  }

  private get _requiredError(): string {
    return this._localize("ui.common.error_required");
  }

  protected render(): TemplateResult {
    const helperSensorNote = this._localize(
      `${this.localizeBaseKey}.helper_sensor_note` as LocalizeKeys
    );
    return html`
      <ha-select
        .label=${this._localize(
          `${this.localizeBaseKey}.sensor_type` as LocalizeKeys
        )}
        .helper=${this._localize(
          `${this.localizeBaseKey}.sensor_type_para` as LocalizeKeys
        )}
        .value=${this.powerType}
        .options=${[
          {
            value: "none",
            label: this._localize(
              `${this.localizeBaseKey}.type_none` as LocalizeKeys
            ),
          },
          {
            value: "standard",
            label: this._localize(
              `${this.localizeBaseKey}.type_standard` as LocalizeKeys
            ),
          },
          {
            value: "inverted",
            label: this._localize(
              `${this.localizeBaseKey}.type_inverted` as LocalizeKeys
            ),
            secondary: helperSensorNote,
          },
          {
            value: "two_sensors",
            label: this._localize(
              `${this.localizeBaseKey}.type_two_sensors` as LocalizeKeys
            ),
            secondary: helperSensorNote,
          },
        ]}
        .disabled=${this.disabled}
        @selected=${this._handlePowerTypeChanged}
      ></ha-select>
      ${
        this.powerType === "standard"
          ? html`
              <ha-statistic-picker
                .disabled=${this.disabled}
                .includeUnitClass=${powerUnitClasses}
                .value=${this.powerConfig.stat_rate}
                .label=${this._localize(
                  `${this.localizeBaseKey}.power` as LocalizeKeys
                )}
                .excludeStatistics=${this.excludeList}
                @value-changed=${this._standardPowerChanged}
                .helper=${this._localize(
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
                .disabled=${this.disabled}
                .includeUnitClass=${powerUnitClasses}
                .value=${this.powerConfig.stat_rate_inverted}
                .label=${this._localize(
                  `${this.localizeBaseKey}.power` as LocalizeKeys
                )}
                .excludeStatistics=${this.excludeList}
                @value-changed=${this._invertedPowerChanged}
                .helper=${this._localize(
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
                .disabled=${this.disabled}
                .includeUnitClass=${powerUnitClasses}
                .value=${this.powerConfig.stat_rate_from}
                .label=${this._localize(
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
                .disabled=${this.disabled}
                .includeUnitClass=${powerUnitClasses}
                .value=${this.powerConfig.stat_rate_to}
                .label=${this._localize(
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

  private _renderHelperSensorInUse() {
    if (!this.helperEntityId) {
      return nothing;
    }
    return html`
      <p class="helper-sensor-in-use">
        ${this._localize(
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

  private _handlePowerTypeChanged(ev: HaSelectSelectEvent) {
    const newPowerType = ev.detail.value as PowerType;
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
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-4);
      }
      ha-select,
      ha-statistic-picker {
        display: block;
      }
      .helper-sensor-in-use {
        margin: 0;
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
