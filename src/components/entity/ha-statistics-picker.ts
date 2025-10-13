import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { fireEvent } from "../../common/dom/fire_event";
import type { ValueChangedEvent, HomeAssistant } from "../../types";
import "./ha-statistic-picker";

@customElement("ha-statistics-picker")
class HaStatisticsPicker extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Array }) public value?: string[];

  @property({ attribute: false, type: Array }) public statisticIds?: string[];

  @property({ attribute: "statistic-types" })
  public statisticTypes?: "mean" | "sum";

  @property({ type: String })
  public label?: string;

  @property({ type: String })
  public placeholder?: string;

  @property({ type: Boolean, attribute: "allow-custom-entity" })
  public allowCustomEntity;

  /**
   * Show only statistics natively stored with these units of measurements.
   * @attr include-statistics-unit-of-measurement
   */
  @property({
    attribute: "include-statistics-unit-of-measurement",
  })
  public includeStatisticsUnitOfMeasurement?: string[] | string;

  /**
   * Show only statistics with these unit classes.
   * @attr include-unit-class
   */
  @property({ attribute: "include-unit-class" })
  public includeUnitClass?: string | string[];

  /**
   * Show only statistics with these device classes.
   * @attr include-device-class
   */
  @property({ attribute: "include-device-class" })
  public includeDeviceClass?: string | string[];

  /**
   * Ignore filtering of statistics type and units when only a single statistic is selected.
   * @type {boolean}
   * @attr ignore-restrictions-on-first-statistic
   */
  @property({
    type: Boolean,
    attribute: "ignore-restrictions-on-first-statistic",
  })
  public ignoreRestrictionsOnFirstStatistic = false;

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    const ignoreRestriction =
      this.ignoreRestrictionsOnFirstStatistic &&
      this._currentStatistics.length <= 1;

    const includeStatisticsUnitCurrent = ignoreRestriction
      ? undefined
      : this.includeStatisticsUnitOfMeasurement;
    const includeUnitClassCurrent = ignoreRestriction
      ? undefined
      : this.includeUnitClass;
    const includeDeviceClassCurrent = ignoreRestriction
      ? undefined
      : this.includeDeviceClass;
    const includeStatisticTypesCurrent = ignoreRestriction
      ? undefined
      : this.statisticTypes;

    return html`
      ${this.label ? html`<label>${this.label}</label>` : nothing}
      ${repeat(
        this._currentStatistics,
        (statisticId) => statisticId,
        (statisticId) => html`
          <div>
            <ha-statistic-picker
              .curValue=${statisticId}
              .hass=${this.hass}
              .includeStatisticsUnitOfMeasurement=${includeStatisticsUnitCurrent}
              .includeUnitClass=${includeUnitClassCurrent}
              .includeDeviceClass=${includeDeviceClassCurrent}
              .value=${statisticId}
              .statisticTypes=${includeStatisticTypesCurrent}
              .statisticIds=${this.statisticIds}
              .excludeStatistics=${this.value}
              .allowCustomEntity=${this.allowCustomEntity}
              @value-changed=${this._statisticChanged}
            ></ha-statistic-picker>
          </div>
        `
      )}
      <div>
        <ha-statistic-picker
          .hass=${this.hass}
          .includeStatisticsUnitOfMeasurement=${this
            .includeStatisticsUnitOfMeasurement}
          .includeUnitClass=${this.includeUnitClass}
          .includeDeviceClass=${this.includeDeviceClass}
          .statisticTypes=${this.statisticTypes}
          .statisticIds=${this.statisticIds}
          .placeholder=${this.placeholder}
          .excludeStatistics=${this.value}
          .allowCustomEntity=${this.allowCustomEntity}
          @value-changed=${this._addStatistic}
        ></ha-statistic-picker>
      </div>
    `;
  }

  private get _currentStatistics() {
    return this.value || [];
  }

  private async _updateStatistics(entities) {
    this.value = entities;

    fireEvent(this, "value-changed", {
      value: entities,
    });
  }

  private _statisticChanged(event: ValueChangedEvent<string>) {
    event.stopPropagation();
    const oldValue = (event.currentTarget as any).curValue;
    const newValue = event.detail.value;
    if (newValue === oldValue) {
      return;
    }
    const currentStatistics = this._currentStatistics;
    if (!newValue || currentStatistics.includes(newValue)) {
      this._updateStatistics(
        currentStatistics.filter((ent) => ent !== oldValue)
      );
      return;
    }
    this._updateStatistics(
      currentStatistics.map((ent) => (ent === oldValue ? newValue : ent))
    );
  }

  private async _addStatistic(event: ValueChangedEvent<string>) {
    event.stopPropagation();
    const toAdd = event.detail.value;
    if (!toAdd) {
      return;
    }
    (event.currentTarget as any).value = "";
    if (!toAdd) {
      return;
    }
    const currentEntities = this._currentStatistics;
    if (currentEntities.includes(toAdd)) {
      return;
    }

    this._updateStatistics([...currentEntities, toAdd]);
  }

  static styles = css`
    :host {
      display: block;
    }
    ha-statistic-picker {
      display: block;
      width: 100%;
      margin-top: 8px;
    }
    label {
      display: block;
      margin-bottom: 0 0 8px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-statistics-picker": HaStatisticsPicker;
  }
}
