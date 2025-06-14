import { differenceInDays, endOfDay } from "date-fns";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { formatDate } from "../../../../common/datetime/format_date";
import type { EnergyData } from "../../../../data/energy";
import { getEnergyDataCollection } from "../../../../data/energy";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard } from "../../types";
import type { EnergyCardBaseConfig } from "../types";
import { hasConfigChanged } from "../../common/has-changed";
import "../../../../components/ha-alert";
import { fireEvent } from "../../../../common/dom/fire_event";

@customElement("hui-energy-compare-card")
export class HuiEnergyCompareCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergyCardBaseConfig;

  @state() private _start?: Date;

  @state() private _end?: Date;

  @state() private _startCompare?: Date;

  @state() private _endCompare?: Date;

  // eslint-disable-next-line lit/no-native-attributes
  @property({ type: Boolean, reflect: true }) hidden = true;

  // Energy compare card cannot tolerate being removed from the DOM by hui-card,
  // as it calculates its own visibility and needs an active collection
  // subscription to do so.
  connectedWhileHidden = true;

  public getCardSize(): Promise<number> | number {
    return 1;
  }

  public setConfig(config: EnergyCardBaseConfig): void {
    this._config = config;
  }

  protected hassSubscribeRequiredHostProps = ["_config"];

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      getEnergyDataCollection(this.hass, {
        key: this._config!.collection_key,
      }).subscribe((data) => this._update(data)),
    ];
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return (
      hasConfigChanged(this, changedProps) ||
      changedProps.size > 1 ||
      !changedProps.has("hass")
    );
  }

  protected render() {
    if (!this._startCompare || !this._endCompare) {
      return nothing;
    }

    const dayDifference = differenceInDays(
      this._endCompare,
      this._startCompare
    );

    return html`
      <ha-alert dismissable @alert-dismissed-clicked=${this._stopCompare}>
        ${this.hass.localize("ui.panel.energy.compare.info", {
          start: html`<b
            >${formatDate(
              this._start!,
              this.hass.locale,
              this.hass.config
            )}${dayDifference > 0
              ? ` -
          ${formatDate(
            this._end || endOfDay(new Date()),
            this.hass.locale,
            this.hass.config
          )}`
              : ""}</b
          >`,
          end: html`<b
            >${formatDate(
              this._startCompare,
              this.hass.locale,
              this.hass.config
            )}${dayDifference > 0
              ? ` -
          ${formatDate(this._endCompare, this.hass.locale, this.hass.config)}`
              : ""}</b
          >`,
        })}
      </ha-alert>
    `;
  }

  private _update(data: EnergyData): void {
    this._start = data.start;
    this._end = data.end;
    this._startCompare = data.startCompare;
    this._endCompare = data.endCompare;
    const oldHidden = this.hidden;
    this.hidden = !this._startCompare;
    if (oldHidden !== this.hidden) {
      fireEvent(this, "card-visibility-changed");
    }
  }

  private _stopCompare(): void {
    const energyCollection = getEnergyDataCollection(this.hass, {
      key: this._config!.collection_key,
    });
    energyCollection.setCompare(false);
    energyCollection.refresh();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-compare-card": HuiEnergyCompareCard;
  }
}
