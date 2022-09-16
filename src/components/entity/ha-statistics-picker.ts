import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import type { PolymerChangedEvent } from "../../polymer-types";
import type { HomeAssistant } from "../../types";
import "./ha-statistic-picker";

@customElement("ha-statistics-picker")
class HaStatisticsPicker extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Array }) public value?: string[];

  @property({ type: Array }) public statisticIds?: string[];

  @property({ attribute: "statistic-types" })
  public statisticTypes?: "mean" | "sum";

  @property({ attribute: "picked-statistic-label" })
  public pickedStatisticLabel?: string;

  @property({ attribute: "pick-statistic-label" })
  public pickStatisticLabel?: string;

  /**
   * Show only statistics natively stored with these units of measurements.
   * @attr include-statistics-unit-of-measurement
   */
  @property({
    attribute: "include-statistics-unit-of-measurement",
  })
  public includeStatisticsUnitOfMeasurement?: string[] | string;

  /**
   * Show only statistics displayed with these units of measurements.
   * @attr include-display-unit-of-measurement
   */
  @property({ attribute: "include-display-unit-of-measurement" })
  public includeDisplayUnitOfMeasurement?: string[] | string;

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

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }

    const ignoreRestriction =
      this.ignoreRestrictionsOnFirstStatistic &&
      this._currentStatistics.length <= 1;

    const includeDisplayUnitCurrent = ignoreRestriction
      ? undefined
      : this.includeDisplayUnitOfMeasurement;
    const includeStatisticsUnitCurrent = ignoreRestriction
      ? undefined
      : this.includeStatisticsUnitOfMeasurement;
    const includeStatisticTypesCurrent = ignoreRestriction
      ? undefined
      : this.statisticTypes;

    return html`
      ${this._currentStatistics.map(
        (statisticId) => html`
          <div>
            <ha-statistic-picker
              .curValue=${statisticId}
              .hass=${this.hass}
              .includeDisplayUnitOfMeasurement=${includeDisplayUnitCurrent}
              .includeStatisticsUnitOfMeasurement=${includeStatisticsUnitCurrent}
              .value=${statisticId}
              .statisticTypes=${includeStatisticTypesCurrent}
              .statisticIds=${this.statisticIds}
              .label=${this.pickedStatisticLabel}
              @value-changed=${this._statisticChanged}
            ></ha-statistic-picker>
          </div>
        `
      )}
      <div>
        <ha-statistic-picker
          .hass=${this.hass}
          .includeDisplayUnitOfMeasurement=${this
            .includeDisplayUnitOfMeasurement}
          .includeStatisticsUnitOfMeasurement=${this
            .includeStatisticsUnitOfMeasurement}
          .statisticTypes=${this.statisticTypes}
          .statisticIds=${this.statisticIds}
          .label=${this.pickStatisticLabel}
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

  private _statisticChanged(event: PolymerChangedEvent<string>) {
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

  private async _addStatistic(event: PolymerChangedEvent<string>) {
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

  static get styles(): CSSResultGroup {
    return css`
      :host {
        width: 200px;
        display: block;
      }
      ha-statistic-picker {
        display: block;
        width: 100%;
        margin-top: 8px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-statistics-picker": HaStatisticsPicker;
  }
}
