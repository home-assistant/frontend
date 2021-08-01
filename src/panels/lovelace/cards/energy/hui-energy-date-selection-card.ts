import {
  startOfWeek,
  endOfWeek,
  startOfToday,
  endOfToday,
  startOfYesterday,
  endOfYesterday,
  addDays,
} from "date-fns";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../components/chart/ha-chart-base";
import "../../../../components/ha-card";
import "../../../../components/ha-date-range-picker";
import type { DateRangePickerRanges } from "../../../../components/ha-date-range-picker";
import { EnergyData, getEnergyDataCollection } from "../../../../data/energy";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import { HomeAssistant } from "../../../../types";
import { LovelaceCard } from "../../types";
import { EnergyDevicesGraphCardConfig } from "../types";

@customElement("hui-energy-date-selection-card")
export class HuiEnergyDateSelectionCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergyDevicesGraphCardConfig;

  @state() private _ranges?: DateRangePickerRanges;

  @state() _startDate?: Date;

  @state() _endDate?: Date;

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      getEnergyDataCollection(this.hass).subscribe((data) =>
        this._updateDates(data)
      ),
    ];
  }

  public willUpdate() {
    if (!this.hasUpdated) {
      const today = new Date();
      const weekStart = startOfWeek(today);
      const weekEnd = endOfWeek(today);

      this._ranges = {
        [this.hass.localize("ui.components.date-range-picker.ranges.today")]: [
          startOfToday(),
          endOfToday(),
        ],
        [this.hass.localize(
          "ui.components.date-range-picker.ranges.yesterday"
        )]: [startOfYesterday(), endOfYesterday()],
        [this.hass.localize(
          "ui.components.date-range-picker.ranges.this_week"
        )]: [weekStart, weekEnd],
        [this.hass.localize(
          "ui.components.date-range-picker.ranges.last_week"
        )]: [addDays(weekStart, -7), addDays(weekEnd, -7)],
      };
    }
  }

  public getCardSize(): Promise<number> | number {
    return 1;
  }

  public setConfig(config: EnergyDevicesGraphCardConfig): void {
    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config || !this._startDate) {
      return html``;
    }

    return html`
      <ha-date-range-picker
        .hass=${this.hass}
        .startDate=${this._startDate}
        .endDate=${this._endDate!}
        .ranges=${this._ranges}
        @change=${this._dateRangeChanged}
      ></ha-date-range-picker>
    `;
  }

  private _updateDates(energyData: EnergyData): void {
    this._startDate = energyData.start;
    this._endDate = energyData.end || endOfToday();
  }

  private _dateRangeChanged(ev: CustomEvent): void {
    if (
      ev.detail.startDate.getTime() === this._startDate!.getTime() &&
      ev.detail.endDate.getTime() === this._endDate!.getTime()
    ) {
      return;
    }
    const energyCollection = getEnergyDataCollection(this.hass);
    energyCollection.setPeriod(ev.detail.startDate, ev.detail.endDate);
    energyCollection.refresh();
  }

  static get styles(): CSSResultGroup {
    return css``;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-date-selection-card": HuiEnergyDateSelectionCard;
  }
}
