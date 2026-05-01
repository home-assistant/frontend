import { differenceInDays, endOfDay } from "date-fns";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { formatDate } from "../../../../common/datetime/format_date";
import type { EnergyData } from "../../../../data/energy";
import {
  CompareMode,
  getEnergyDataCollection,
  validateEnergyCollectionKey,
} from "../../../../data/energy";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard } from "../../types";
import type { EnergyCardBaseConfig } from "../types";
import { hasConfigChanged } from "../../common/has-changed";
import "../../../../components/ha-alert";
import { fireEvent } from "../../../../common/dom/fire_event";
import { buttonLinkStyle } from "../../../../resources/styles";

@customElement("hui-energy-compare-card")
export class HuiEnergyCompareCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  public static async getConfigElement() {
    await import("../../editor/config-elements/hui-energy-graph-card-editor");
    return document.createElement("hui-energy-graph-card-editor");
  }

  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergyCardBaseConfig;

  public static getStubConfig(
    _hass: HomeAssistant,
    _entities: string[],
    _entitiesFill: string[]
  ): EnergyCardBaseConfig {
    return {
      type: "energy-compare",
    };
  }

  @state() private _start?: Date;

  @state() private _end?: Date;

  @state() private _startCompare?: Date;

  @state() private _endCompare?: Date;

  @state() private _compareMode?: CompareMode;

  // eslint-disable-next-line lit/no-native-attributes
  @property({ type: Boolean, reflect: true }) hidden = true;

  @property({ attribute: false }) public preview = false;

  // Energy compare card cannot tolerate being removed from the DOM by hui-card,
  // as it calculates its own visibility and needs an active collection
  // subscription to do so.
  connectedWhileHidden = true;

  public getCardSize(): Promise<number> | number {
    return 1;
  }

  public setConfig(config: EnergyCardBaseConfig): void {
    if (config.collection_key) {
      validateEnergyCollectionKey(config.collection_key);
    }
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

  protected shouldUpdate(changedProps: PropertyValues<this>): boolean {
    return (
      hasConfigChanged(this, changedProps) ||
      changedProps.has("preview") ||
      changedProps.size > 1 ||
      !changedProps.has("hass")
    );
  }

  protected update(changedProps: PropertyValues<this>): void {
    super.update(changedProps);

    if (changedProps.has("preview")) {
      this._checkVisibility();
    }
  }

  protected render() {
    if (this.preview) {
      return html`
        <ha-alert>
          ${this.hass.localize(
            "ui.panel.lovelace.cards.energy.energy_compare.info",
            {
              start: html`<b
                >${formatDate(
                  new Date(),
                  this.hass.locale,
                  this.hass.config
                )}</b
              >`,
              end: html`<b
                  >${formatDate(
                    new Date(),
                    this.hass.locale,
                    this.hass.config
                  )}</b
                >
                <span
                  >(${this.hass.localize(
                    "ui.panel.lovelace.cards.energy.energy_compare.compare_preview"
                  )})</span
                >`,
            }
          )}
        </ha-alert>
      `;
    }

    if (!this._startCompare || !this._endCompare) {
      return nothing;
    }

    const dayDifference = differenceInDays(
      this._endCompare,
      this._startCompare
    );

    return html`
      <ha-alert
        dismissable
        .localize=${this.hass.localize}
        @alert-dismissed-clicked=${this._stopCompare}
      >
        ${this.hass.localize(
          "ui.panel.lovelace.cards.energy.energy_compare.info",
          {
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
              >
              <button class="link" @click=${this._changeCompareMode}>
                (${this._compareMode === CompareMode.PREVIOUS
                  ? this.hass.localize(
                      "ui.panel.lovelace.cards.energy.energy_compare.compare_previous_year"
                    )
                  : this.hass.localize(
                      "ui.panel.lovelace.cards.energy.energy_compare.compare_previous_period"
                    )})
              </button>`,
          }
        )}
      </ha-alert>
    `;
  }

  private _changeCompareMode() {
    const collection = getEnergyDataCollection(this.hass, {
      key: this._config!.collection_key,
    });
    collection.setCompare(
      this._compareMode === CompareMode.PREVIOUS
        ? CompareMode.YOY
        : CompareMode.PREVIOUS
    );
    collection.refresh();
  }

  private _update(data: EnergyData): void {
    this._start = data.start;
    this._end = data.end;
    this._startCompare = data.startCompare;
    this._endCompare = data.endCompare;
    this._compareMode = data.compareMode;
    this._checkVisibility();
  }

  private _checkVisibility() {
    const oldHidden = this.hidden;
    this.hidden = !this._startCompare && !this.preview;
    if (oldHidden !== this.hidden) {
      fireEvent(this, "card-visibility-changed");
    }
  }

  private _stopCompare(): void {
    const energyCollection = getEnergyDataCollection(this.hass, {
      key: this._config!.collection_key,
    });
    energyCollection.setCompare(CompareMode.NONE);
    energyCollection.refresh();
  }

  static styles = [buttonLinkStyle];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-compare-card": HuiEnergyCompareCard;
  }
}
