import { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing, PropertyValues, TemplateResult } from "lit";
import { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../common/array/ensure-array";
import { fireEvent } from "../../common/dom/fire_event";
import { stringCompare } from "../../common/string/compare";
import {
  getStatisticIds,
  getStatisticLabel,
  StatisticsMetaData,
} from "../../data/recorder";
import { ValueChangedEvent, HomeAssistant } from "../../types";
import { documentationUrl } from "../../util/documentation-url";
import "../ha-combo-box";
import type { HaComboBox } from "../ha-combo-box";
import "../ha-svg-icon";
import "./state-badge";
import {
  fuzzyFilterSort,
  ScorableTextItem,
} from "../../common/string/filter/sequence-matching";

interface StatisticItem extends ScorableTextItem {
  id: string;
  name: string;
  state?: HassEntity;
}

@customElement("ha-statistic-picker")
export class HaStatisticPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public label?: string;

  @property() public value?: string;

  @property({ attribute: "statistic-types" })
  public statisticTypes?: "mean" | "sum";

  @property({ type: Boolean, attribute: "allow-custom-entity" })
  public allowCustomEntity;

  @property({ type: Array }) public statisticIds?: StatisticsMetaData[];

  @property({ type: Boolean }) public disabled?: boolean;

  /**
   * Show only statistics natively stored with these units of measurements.
   * @type {Array}
   * @attr include-statistics-unit-of-measurement
   */
  @property({
    type: Array,
    attribute: "include-statistics-unit-of-measurement",
  })
  public includeStatisticsUnitOfMeasurement?: string | string[];

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
   * Show only statistics on entities.
   * @type {Boolean}
   * @attr entities-only
   */
  @property({ type: Boolean, attribute: "entities-only" })
  public entitiesOnly = false;

  /**
   * List of statistics to be excluded.
   * @type {Array}
   * @attr exclude-statistics
   */
  @property({ type: Array, attribute: "exclude-statistics" })
  public excludeStatistics?: string[];

  @property() public helpMissingEntityUrl = "/more-info/statistics/";

  @state() private _opened?: boolean;

  @query("ha-combo-box", true) public comboBox!: HaComboBox;

  private _init = false;

  private _statistics: StatisticItem[] = [];

  @state() private _filteredItems?: StatisticItem[] = undefined;

  private _rowRenderer: ComboBoxLitRenderer<StatisticItem> = (item) =>
    html`<mwc-list-item graphic="avatar" twoline>
      ${item.state
        ? html`<state-badge
            slot="graphic"
            .stateObj=${item.state}
          ></state-badge>`
        : ""}
      <span>${item.name}</span>
      <span slot="secondary"
        >${item.id === "" || item.id === "__missing"
          ? html`<a
              target="_blank"
              rel="noopener noreferrer"
              href=${documentationUrl(this.hass, this.helpMissingEntityUrl)}
              >${this.hass.localize(
                "ui.components.statistic-picker.learn_more"
              )}</a
            >`
          : item.id}</span
      >
    </mwc-list-item>`;

  private _getStatistics = memoizeOne(
    (
      statisticIds: StatisticsMetaData[],
      includeStatisticsUnitOfMeasurement?: string | string[],
      includeUnitClass?: string | string[],
      includeDeviceClass?: string | string[],
      entitiesOnly?: boolean,
      excludeStatistics?: string[]
    ): StatisticItem[] => {
      if (!statisticIds.length) {
        return [
          {
            id: "",
            name: this.hass.localize(
              "ui.components.statistic-picker.no_statistics"
            ),
            strings: [],
          },
        ];
      }

      if (includeStatisticsUnitOfMeasurement) {
        const includeUnits: (string | null)[] = ensureArray(
          includeStatisticsUnitOfMeasurement
        );
        statisticIds = statisticIds.filter((meta) =>
          includeUnits.includes(meta.statistics_unit_of_measurement)
        );
      }
      if (includeUnitClass) {
        const includeUnitClasses: (string | null)[] =
          ensureArray(includeUnitClass);
        statisticIds = statisticIds.filter((meta) =>
          includeUnitClasses.includes(meta.unit_class)
        );
      }
      if (includeDeviceClass) {
        const includeDeviceClasses: (string | null)[] =
          ensureArray(includeDeviceClass);
        statisticIds = statisticIds.filter((meta) => {
          const stateObj = this.hass.states[meta.statistic_id];
          if (!stateObj) {
            return true;
          }
          return includeDeviceClasses.includes(
            stateObj.attributes.device_class || ""
          );
        });
      }

      const output: StatisticItem[] = [];
      statisticIds.forEach((meta) => {
        if (
          excludeStatistics &&
          excludeStatistics.includes(meta.statistic_id)
        ) {
          return;
        }
        const entityState = this.hass.states[meta.statistic_id];
        if (!entityState) {
          if (!entitiesOnly) {
            const id = meta.statistic_id;
            const name = getStatisticLabel(this.hass, meta.statistic_id, meta);
            output.push({
              id,
              name,
              strings: [id, name],
            });
          }
          return;
        }
        const id = meta.statistic_id;
        const name = getStatisticLabel(this.hass, meta.statistic_id, meta);
        output.push({
          id,
          name,
          state: entityState,
          strings: [id, name],
        });
      });

      if (!output.length) {
        return [
          {
            id: "",
            name: this.hass.localize("ui.components.statistic-picker.no_match"),
            strings: [],
          },
        ];
      }

      if (output.length > 1) {
        output.sort((a, b) =>
          stringCompare(a.name || "", b.name || "", this.hass.locale.language)
        );
      }

      output.push({
        id: "__missing",
        name: this.hass.localize(
          "ui.components.statistic-picker.missing_entity"
        ),
        strings: [],
      });

      return output;
    }
  );

  public open() {
    this.comboBox?.open();
  }

  public focus() {
    this.comboBox?.focus();
  }

  public willUpdate(changedProps: PropertyValues) {
    if (
      (!this.hasUpdated && !this.statisticIds) ||
      changedProps.has("statisticTypes")
    ) {
      this._getStatisticIds();
    }
    if (
      (!this._init && this.statisticIds) ||
      (changedProps.has("_opened") && this._opened)
    ) {
      this._init = true;
      if (this.hasUpdated) {
        this._statistics = this._getStatistics(
          this.statisticIds!,
          this.includeStatisticsUnitOfMeasurement,
          this.includeUnitClass,
          this.includeDeviceClass,
          this.entitiesOnly,
          this.excludeStatistics
        );
      } else {
        this.updateComplete.then(() => {
          this._statistics = this._getStatistics(
            this.statisticIds!,
            this.includeStatisticsUnitOfMeasurement,
            this.includeUnitClass,
            this.includeDeviceClass,
            this.entitiesOnly,
            this.excludeStatistics
          );
        });
      }
    }
  }

  protected render(): TemplateResult | typeof nothing {
    if (this._statistics.length === 0) {
      return nothing;
    }

    return html`
      <ha-combo-box
        .hass=${this.hass}
        .label=${this.label === undefined && this.hass
          ? this.hass.localize("ui.components.statistic-picker.statistic")
          : this.label}
        .value=${this._value}
        .renderer=${this._rowRenderer}
        .disabled=${this.disabled}
        .allowCustomValue=${this.allowCustomEntity}
        .items=${this._statistics}
        .filteredItems=${this._filteredItems ?? this._statistics}
        item-value-path="id"
        item-id-path="id"
        item-label-path="name"
        @opened-changed=${this._openedChanged}
        @value-changed=${this._statisticChanged}
        @filter-changed=${this._filterChanged}
      ></ha-combo-box>
    `;
  }

  private async _getStatisticIds() {
    this.statisticIds = await getStatisticIds(this.hass, this.statisticTypes);
  }

  private get _value() {
    return this.value || "";
  }

  private _statisticChanged(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();
    let newValue = ev.detail.value;
    if (newValue === "__missing") {
      newValue = "";
    }

    if (newValue !== this._value) {
      this._setValue(newValue);
    }
  }

  private _openedChanged(ev: ValueChangedEvent<boolean>) {
    this._opened = ev.detail.value;
  }

  private _filterChanged(ev: CustomEvent): void {
    const filterString = ev.detail.value.toLowerCase();
    this._filteredItems = filterString.length
      ? fuzzyFilterSort<StatisticItem>(filterString, this._statistics)
      : undefined;
  }

  private _setValue(value: string) {
    this.value = value;
    setTimeout(() => {
      fireEvent(this, "value-changed", { value });
      fireEvent(this, "change");
    }, 0);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-statistic-picker": HaStatisticPicker;
  }
}
