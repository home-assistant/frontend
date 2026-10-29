import type { PropertyValues } from "lit";
import { LitElement } from "lit";
import { property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { formatNumber } from "../../../../common/number/format_number";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard, LovelaceGridOptions } from "../../types";
import type { WeatherPageCardConfig } from "../types";

/**
 * Weather page cards only show data they have. A card without data hides
 * itself, so it takes no space in the grid. It stays connected, so it can
 * show up again when data arrives.
 */
export const syncWeatherCardVisibility = (card: LitElement): void => {
  const hidden = !card.shadowRoot?.querySelector("ha-card");
  if (card.hidden !== hidden) {
    card.hidden = hidden;
    fireEvent(card, "card-visibility-changed", { value: !hidden });
  }
};

export abstract class WeatherPageCardBase<
  T extends WeatherPageCardConfig = WeatherPageCardConfig,
>
  extends LitElement
  implements LovelaceCard
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() protected _config?: T;

  public connectedWhileHidden = true;

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    syncWeatherCardVisibility(this);
  }

  public setConfig(config: T): void {
    if (!Array.isArray(config.entities)) {
      throw new Error("Entities must be a list of weather entities");
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): LovelaceGridOptions {
    return { columns: 6, rows: "auto", min_columns: 3 };
  }

  /** A whole number with a degree sign, as weather apps show temperatures. */
  protected _degrees(value: number): string {
    return `${formatNumber(Math.round(value), this.hass!.locale)}°`;
  }
}
