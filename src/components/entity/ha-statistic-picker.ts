import { mdiChartLine, mdiHelpCircle, mdiShape } from "@mdi/js";
import type { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import type { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, query } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../common/array/ensure-array";
import { fireEvent } from "../../common/dom/fire_event";
import { computeAreaName } from "../../common/entity/compute_area_name";
import { computeDeviceName } from "../../common/entity/compute_device_name";
import { computeEntityName } from "../../common/entity/compute_entity_name";
import { computeStateName } from "../../common/entity/compute_state_name";
import { getEntityContext } from "../../common/entity/context/get_entity_context";
import { computeRTL } from "../../common/util/compute_rtl";
import { domainToName } from "../../data/integration";
import {
  getStatisticIds,
  getStatisticLabel,
  type StatisticsMetaData,
} from "../../data/recorder";
import type { HomeAssistant, ValueChangedEvent } from "../../types";
import { documentationUrl } from "../../util/documentation-url";
import "../ha-combo-box-item";
import "../ha-generic-picker";
import type { HaGenericPicker } from "../ha-generic-picker";
import "../ha-icon-button";
import "../ha-input-helper-text";
import type { PickerComboBoxItem } from "../ha-picker-combo-box";
import type { PickerValueRenderer } from "../ha-picker-field";
import "../ha-svg-icon";
import "./state-badge";

const TYPE_ORDER = ["entity", "external", "no_state"] as StatisticItemType[];

const MISSING_ID = "___missing-entity___";

type StatisticItemType = "entity" | "external" | "no_state";

interface StatisticComboBoxItem extends PickerComboBoxItem {
  statistic_id?: string;
  stateObj?: HassEntity;
  type?: StatisticItemType;
}

@customElement("ha-statistic-picker")
export class HaStatisticPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  // eslint-disable-next-line lit/no-native-attributes
  @property({ type: Boolean }) public autofocus = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property() public label?: string;

  @property() public value?: string;

  @property() public helper?: string;

  @property() public placeholder?: string;

  @property({ attribute: "statistic-types" })
  public statisticTypes?: "mean" | "sum";

  @property({ type: Boolean, attribute: "allow-custom-entity" })
  public allowCustomEntity;

  @property({ attribute: false, type: Array })
  public statisticIds?: StatisticsMetaData[];

  @property({ attribute: false }) public helpMissingEntityUrl =
    "/more-info/statistics/";

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

  @property({ attribute: "hide-clear-icon", type: Boolean })
  public hideClearIcon = false;

  @query("ha-generic-picker") private _picker?: HaGenericPicker;

  public willUpdate(changedProps: PropertyValues) {
    if (
      (!this.hasUpdated && !this.statisticIds) ||
      changedProps.has("statisticTypes")
    ) {
      this._getStatisticIds();
    }
  }

  private async _getStatisticIds() {
    this.statisticIds = await getStatisticIds(this.hass, this.statisticTypes);
  }

  private _getItems = () =>
    this._getStatisticsItems(
      this.hass,
      this.statisticIds,
      this.includeStatisticsUnitOfMeasurement,
      this.includeUnitClass,
      this.includeDeviceClass,
      this.entitiesOnly,
      this.excludeStatistics,
      this.value
    );

  private _getAdditionalItems(): StatisticComboBoxItem[] {
    return [
      {
        id: MISSING_ID,
        primary: this.hass.localize(
          "ui.components.statistic-picker.missing_entity"
        ),
        icon_path: mdiHelpCircle,
      },
    ];
  }

  private _getStatisticsItems = memoizeOne(
    (
      hass: HomeAssistant,
      statisticIds?: StatisticsMetaData[],
      includeStatisticsUnitOfMeasurement?: string | string[],
      includeUnitClass?: string | string[],
      includeDeviceClass?: string | string[],
      entitiesOnly?: boolean,
      excludeStatistics?: string[],
      value?: string
    ): StatisticComboBoxItem[] => {
      if (!statisticIds) {
        return [];
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

      const isRTL = computeRTL(this.hass);

      const output: StatisticComboBoxItem[] = [];

      statisticIds.forEach((meta) => {
        if (
          excludeStatistics &&
          meta.statistic_id !== value &&
          excludeStatistics.includes(meta.statistic_id)
        ) {
          return;
        }
        const stateObj = this.hass.states[meta.statistic_id];

        if (!stateObj) {
          if (!entitiesOnly) {
            const id = meta.statistic_id;
            const label = getStatisticLabel(this.hass, meta.statistic_id, meta);
            const type =
              meta.statistic_id.includes(":") &&
              !meta.statistic_id.includes(".")
                ? "external"
                : "no_state";

            const sortingPrefix = `${TYPE_ORDER.indexOf(type)}`;
            if (type === "no_state") {
              output.push({
                id,
                primary: label,
                secondary: this.hass.localize(
                  "ui.components.statistic-picker.no_state"
                ),
                type,
                sorting_label: [sortingPrefix, label].join("_"),
                search_labels: [label, id],
                icon_path: mdiShape,
              });
            } else if (type === "external") {
              const domain = id.split(":")[0];
              const domainName = domainToName(this.hass.localize, domain);
              output.push({
                id,
                statistic_id: id,
                primary: label,
                secondary: domainName,
                type,
                sorting_label: [sortingPrefix, label].join("_"),
                search_labels: [label, domainName, id],
                icon_path: mdiChartLine,
              });
            }
          }
          return;
        }
        const id = meta.statistic_id;

        const { area, device } = getEntityContext(stateObj, hass);

        const friendlyName = computeStateName(stateObj); // Keep this for search
        const entityName = computeEntityName(stateObj, hass);
        const deviceName = device ? computeDeviceName(device) : undefined;
        const areaName = area ? computeAreaName(area) : undefined;

        const primary = entityName || deviceName || id;
        const secondary = [areaName, entityName ? deviceName : undefined]
          .filter(Boolean)
          .join(isRTL ? " ◂ " : " ▸ ");

        const sortingPrefix = `${TYPE_ORDER.indexOf("entity")}`;
        output.push({
          id,
          statistic_id: id,
          primary,
          secondary,
          stateObj: stateObj,
          type: "entity",
          sorting_label: [sortingPrefix, deviceName, entityName].join("_"),
          search_labels: [
            entityName,
            deviceName,
            areaName,
            friendlyName,
            id,
          ].filter(Boolean) as string[],
        });
      });

      return output;
    }
  );

  private _statisticMetaData = memoizeOne(
    (statisticId: string, statisticIds: StatisticsMetaData[]) => {
      if (!statisticIds) {
        return undefined;
      }
      return statisticIds.find(
        (statistic) => statistic.statistic_id === statisticId
      );
    }
  );

  private _valueRenderer: PickerValueRenderer = (value) => {
    const statisticId = value;

    const item = this._computeItem(statisticId);

    return html`
      ${item.stateObj
        ? html`
            <state-badge
              .hass=${this.hass}
              .stateObj=${item.stateObj}
              slot="start"
            ></state-badge>
          `
        : item.icon_path
          ? html`
              <ha-svg-icon slot="start" .path=${item.icon_path}></ha-svg-icon>
            `
          : nothing}
      <span slot="headline">${item.primary}</span>
      ${item.secondary
        ? html`<span slot="supporting-text">${item.secondary}</span>`
        : nothing}
    `;
  };

  private _computeItem(statisticId: string): StatisticComboBoxItem {
    const stateObj = this.hass.states[statisticId];

    if (stateObj) {
      const { area, device } = getEntityContext(stateObj, this.hass);

      const entityName = computeEntityName(stateObj, this.hass);
      const deviceName = device ? computeDeviceName(device) : undefined;
      const areaName = area ? computeAreaName(area) : undefined;

      const isRTL = computeRTL(this.hass);

      const primary = entityName || deviceName || statisticId;
      const secondary = [areaName, entityName ? deviceName : undefined]
        .filter(Boolean)
        .join(isRTL ? " ◂ " : " ▸ ");
      const friendlyName = computeStateName(stateObj); // Keep this for search

      const sortingPrefix = `${TYPE_ORDER.indexOf("entity")}`;
      return {
        id: statisticId,
        statistic_id: statisticId,
        primary,
        secondary,
        stateObj: stateObj,
        type: "entity",
        sorting_label: [sortingPrefix, deviceName, entityName].join("_"),
        search_labels: [
          entityName,
          deviceName,
          areaName,
          friendlyName,
          statisticId,
        ].filter(Boolean) as string[],
      };
    }

    const statistic = this.statisticIds
      ? this._statisticMetaData(statisticId, this.statisticIds)
      : undefined;

    if (statistic) {
      const type =
        statisticId.includes(":") && !statisticId.includes(".")
          ? "external"
          : "no_state";

      if (type === "external") {
        const sortingPrefix = `${TYPE_ORDER.indexOf("external")}`;
        const label = getStatisticLabel(this.hass, statisticId, statistic);
        const domain = statisticId.split(":")[0];
        const domainName = domainToName(this.hass.localize, domain);

        return {
          id: statisticId,
          statistic_id: statisticId,
          primary: label,
          secondary: domainName,
          type: "external",
          sorting_label: [sortingPrefix, label].join("_"),
          search_labels: [label, domainName, statisticId],
          icon_path: mdiChartLine,
        };
      }
    }

    const sortingPrefix = `${TYPE_ORDER.indexOf("external")}`;
    const label = getStatisticLabel(this.hass, statisticId, statistic);

    return {
      id: statisticId,
      primary: label,
      secondary: this.hass.localize("ui.components.statistic-picker.no_state"),
      type: "no_state",
      sorting_label: [sortingPrefix, label].join("_"),
      search_labels: [label, statisticId],
      icon_path: mdiShape,
    };
  }

  private _rowRenderer: ComboBoxLitRenderer<StatisticComboBoxItem> = (
    item,
    { index }
  ) => {
    const showEntityId = this.hass.userData?.showEntityIdPicker;
    return html`
      <ha-combo-box-item type="button" compact .borderTop=${index !== 0}>
        ${item.icon_path
          ? html`
              <ha-svg-icon
                style="margin: 0 4px"
                slot="start"
                .path=${item.icon_path}
              ></ha-svg-icon>
            `
          : item.stateObj
            ? html`
                <state-badge
                  slot="start"
                  .stateObj=${item.stateObj}
                  .hass=${this.hass}
                ></state-badge>
              `
            : nothing}
        <span slot="headline">${item.primary} </span>
        ${item.secondary || item.type
          ? html`<span slot="supporting-text"
              >${item.secondary} - ${item.type}</span
            >`
          : nothing}
        ${item.statistic_id && showEntityId
          ? html`<span slot="supporting-text" class="code">
              ${item.statistic_id}
            </span>`
          : nothing}
      </ha-combo-box-item>
    `;
  };

  protected render() {
    const placeholder =
      this.placeholder ??
      this.hass.localize("ui.components.statistic-picker.placeholder");
    const notFoundLabel = this.hass.localize(
      "ui.components.statistic-picker.no_match"
    );

    return html`
      <ha-generic-picker
        .hass=${this.hass}
        .autofocus=${this.autofocus}
        .allowCustomValue=${this.allowCustomEntity}
        .label=${this.label}
        .notFoundLabel=${notFoundLabel}
        .placeholder=${placeholder}
        .value=${this.value}
        .rowRenderer=${this._rowRenderer}
        .getItems=${this._getItems}
        .getAdditionalItems=${this._getAdditionalItems}
        .hideClearIcon=${this.hideClearIcon}
        .valueRenderer=${this._valueRenderer}
        @value-changed=${this._valueChanged}
      >
      </ha-generic-picker>
    `;
  }

  private _valueChanged(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();
    const value = ev.detail.value;

    if (value === MISSING_ID) {
      window.open(
        documentationUrl(this.hass, this.helpMissingEntityUrl),
        "_blank"
      );
      return;
    }

    this.value = value;
    fireEvent(this, "value-changed", { value });
  }

  public async open() {
    await this.updateComplete;
    await this._picker?.open();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-statistic-picker": HaStatisticPicker;
  }
}
