import { html, LitElement, TemplateResult } from "lit";
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

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }

    return html`
      ${this._currentStatistics.map(
        (statisticId) => html`
          <div>
            <ha-statistic-picker
              .curValue=${statisticId}
              .hass=${this.hass}
              .value=${statisticId}
              .statisticTypes=${this.statisticTypes}
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
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-statistics-picker": HaStatisticsPicker;
  }
}
