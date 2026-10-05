import { differenceInDays, endOfDay } from "date-fns";
import type { HassConfig } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { formatDate } from "../../../../common/datetime/format_date";
import { consume } from "../../../../common/decorators/consume";
import { transform } from "../../../../common/decorators/transform";
import {
  configContext,
  internationalizationContext,
} from "../../../../data/context";
import type { EnergyData } from "../../../../data/energy";
import {
  CompareMode,
  validateEnergyCollectionKey,
} from "../../../../data/energy";
import { EnergyCollectionController } from "../../../../data/energy-collection-controller";
import type {
  HomeAssistant,
  HomeAssistantConfig,
  HomeAssistantInternationalization,
} from "../../../../types";
import type { LovelaceCard } from "../../types";
import type { EnergyCardBaseConfig } from "../types";
import "../../../../components/ha-alert";
import { fireEvent } from "../../../../common/dom/fire_event";
import { buttonLinkStyle } from "../../../../resources/styles";

@customElement("hui-energy-compare-card")
export class HuiEnergyCompareCard extends LitElement implements LovelaceCard {
  public static async getConfigElement() {
    await import("../../editor/config-elements/hui-energy-graph-card-editor");
    return document.createElement("hui-energy-graph-card-editor");
  }

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

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: HomeAssistantInternationalization;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, HassConfig>({
    transformer: ({ config }) => config,
  })
  private _hassConfig!: HassConfig;

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

  private _energyCollection = new EnergyCollectionController(this, {
    config: () => this._config,
    onData: (data) => this._update(data),
  });

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
          ${this._i18n.localize(
            "ui.panel.lovelace.cards.energy.energy_compare.info",
            {
              start: html`<b
                >${formatDate(new Date(), this._i18n.locale, this._hassConfig)}</b
              >`,
              end: html`<b
                  >${formatDate(new Date(), this._i18n.locale, this._hassConfig)}</b
                >
                <span
                  >(${this._i18n.localize(
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
      <ha-alert dismissable @alert-dismissed-clicked=${this._stopCompare}>
        ${this._i18n.localize(
          "ui.panel.lovelace.cards.energy.energy_compare.info",
          {
            start: html`<b
              >${formatDate(this._start!, this._i18n.locale, this._hassConfig)}${
                dayDifference > 0
                  ? ` -
          ${formatDate(
            this._end || endOfDay(new Date()),
            this._i18n.locale,
            this._hassConfig
          )}`
                  : ""
              }</b
            >`,
            end: html`<b
                >${formatDate(
                  this._startCompare,
                  this._i18n.locale,
                  this._hassConfig
                )}${
                  dayDifference > 0
                    ? ` -
          ${formatDate(this._endCompare, this._i18n.locale, this._hassConfig)}`
                    : ""
                }</b
              >
              <button class="link" @click=${this._changeCompareMode}>
                (${
                  this._compareMode === CompareMode.PREVIOUS
                    ? this._i18n.localize(
                        "ui.panel.lovelace.cards.energy.energy_compare.compare_previous_year"
                      )
                    : this._i18n.localize(
                        "ui.panel.lovelace.cards.energy.energy_compare.compare_previous_period"
                      )
                })
              </button>`,
          }
        )}
      </ha-alert>
    `;
  }

  private _changeCompareMode() {
    const collection = this._energyCollection.collection;
    if (!collection) {
      return;
    }
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
    const energyCollection = this._energyCollection.collection;
    if (!energyCollection) {
      return;
    }
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
