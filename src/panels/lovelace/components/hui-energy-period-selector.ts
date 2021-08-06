import { mdiChevronLeft, mdiChevronRight } from "@mdi/js";
import { endOfToday, addDays, endOfDay, isToday, startOfToday } from "date-fns";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { formatDate } from "../../../common/datetime/format_date";
import { EnergyData, getEnergyDataCollection } from "../../../data/energy";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { HomeAssistant } from "../../../types";
import "@material/mwc-icon-button/mwc-icon-button";
import "../../../components/ha-svg-icon";
import "@material/mwc-button/mwc-button";

@customElement("hui-energy-period-selector")
export class HuiEnergyPeriodSelector extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public collectionKey?: string;

  @state() _startDate?: Date;

  @state() _endDate?: Date;

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      getEnergyDataCollection(this.hass, {
        key: this.collectionKey,
      }).subscribe((data) => this._updateDates(data)),
    ];
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._startDate) {
      return html``;
    }

    return html`
      <div class="row">
        <div class="label">
          ${formatDate(this._startDate, this.hass.locale)}
        </div>

        <mwc-icon-button label="Previous Day" @click=${this._pickPreviousDay}>
          <ha-svg-icon .path=${mdiChevronLeft}></ha-svg-icon>
        </mwc-icon-button>
        <mwc-icon-button label="Next Day" @click=${this._pickNextDay}>
          <ha-svg-icon .path=${mdiChevronRight}></ha-svg-icon>
        </mwc-icon-button>

        <mwc-button
          dense
          outlined
          .disabled=${isToday(this._startDate)}
          @click=${this._pickToday}
          >Today</mwc-button
        >
      </div>
    `;
  }

  private _pickToday() {
    this._setDate(startOfToday());
  }

  private _pickPreviousDay() {
    this._setDate(addDays(this._startDate!, -1));
  }

  private _pickNextDay() {
    this._setDate(addDays(this._startDate!, +1));
  }

  private _setDate(startDate: Date) {
    const endDate = endOfDay(startDate);
    const energyCollection = getEnergyDataCollection(this.hass, {
      key: this.collectionKey,
    });
    energyCollection.setPeriod(startDate, endDate);
    energyCollection.refresh();
  }

  private _updateDates(energyData: EnergyData): void {
    this._startDate = energyData.start;
    this._endDate = energyData.end || endOfToday();
  }

  static get styles(): CSSResultGroup {
    return css`
      .row {
        display: flex;
        align-items: center;
        justify-content: flex-end;
      }
      .label {
        padding: 0 8px;
        text-align: center;
        font-size: 20px;
      }
      mwc-icon-button {
        --mdc-icon-button-size: 28px;
      }
      mwc-button {
        padding-left: 8px;
        --mdc-theme-primary: currentColor;
        --mdc-button-outline-color: currentColor;

        --mdc-button-disabled-outline-color: var(--disabled-text-color);
        --mdc-button-disabled-ink-color: var(--disabled-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-period-selector": HuiEnergyPeriodSelector;
  }
}
