import { mdiChartLine } from "@mdi/js";
import type { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import Fuse from "fuse.js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../common/array/ensure-array";
import { fireEvent } from "../../common/dom/fire_event";
import { computeAreaName } from "../../common/entity/compute_area_name";
import { computeDeviceName } from "../../common/entity/compute_device_name";
import { computeEntityName } from "../../common/entity/compute_entity_name";
import { computeStateName } from "../../common/entity/compute_state_name";
import { getEntityContext } from "../../common/entity/context/get_entity_context";
import { caseInsensitiveStringCompare } from "../../common/string/compare";
import { computeRTL } from "../../common/util/compute_rtl";
import { domainToName } from "../../data/integration";
import type { StatisticsMetaData } from "../../data/recorder";
import { getStatisticIds, getStatisticLabel } from "../../data/recorder";
import { HaFuse } from "../../resources/fuse";
import type { HomeAssistant, ValueChangedEvent } from "../../types";
import "../ha-combo-box";
import type { HaComboBox } from "../ha-combo-box";
import "../ha-combo-box-item";
import "../ha-svg-icon";
import "./state-badge";

type StatisticItemType = "entity" | "external" | "no_state";

interface StatisticItem {
  id: string;
  label: "";
  primary: string;
  secondary?: string;
  show_entity_id?: boolean;
  entity_name?: string;
  area_name?: string;
  device_name?: string;
  friendly_name?: string;
  sorting_label?: string;
  state?: HassEntity;
  type?: StatisticItemType;
  iconPath?: string;
}

const TYPE_ORDER = ["entity", "external", "no_state"] as StatisticItemType[];

const ENTITY_ID_STYLE = styleMap({
  fontFamily: "var(--code-font-family, monospace)",
  fontSize: "11px",
});

@customElement("ha-statistic-combo-box")
export class HaStatisticComboBox extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public label?: string;

  @property() public value?: string;

  @property({ attribute: "statistic-types" })
  public statisticTypes?: "mean" | "sum";

  @property({ type: Boolean, attribute: "allow-custom-entity" })
  public allowCustomEntity;

  @property({ attribute: false, type: Array })
  public statisticIds?: StatisticsMetaData[];

  @property({ type: Boolean }) public disabled = false;

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

  @property({ attribute: false }) public helpMissingEntityUrl =
    "/more-info/statistics/";

  @state() private _opened = false;

  @query("ha-combo-box", true) public comboBox!: HaComboBox;

  private _initialItems = false;

  private _items: StatisticItem[] = [];

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    this.hass.loadBackendTranslation("title");
  }

  private _rowRenderer: ComboBoxLitRenderer<StatisticItem> = (
    item,
    { index }
  ) => html`
    <ha-combo-box-item type="button" compact .borderTop=${index !== 0}>
      ${!item.state
        ? html`<ha-svg-icon
            style="margin: 0 4px"
            slot="start"
            .path=${item.iconPath}
          ></ha-svg-icon>`
        : html`
            <state-badge
              slot="start"
              .stateObj=${item.state}
              .hass=${this.hass}
            ></state-badge>
          `}

      <span slot="headline">${item.primary} </span>
      ${item.secondary
        ? html`<span slot="supporting-text">${item.secondary}</span>`
        : nothing}
      ${item.id && item.show_entity_id
        ? html`
            <span slot="supporting-text" style=${ENTITY_ID_STYLE}>
              ${item.id}
            </span>
          `
        : nothing}
    </ha-combo-box-item>
  `;

  private _getItems = memoizeOne(
    (
      _opened: boolean,
      hass: this["hass"],
      statisticIds: StatisticsMetaData[],
      includeStatisticsUnitOfMeasurement?: string | string[],
      includeUnitClass?: string | string[],
      includeDeviceClass?: string | string[],
      entitiesOnly?: boolean,
      excludeStatistics?: string[],
      value?: string
    ): StatisticItem[] => {
      if (!statisticIds.length) {
        return [
          {
            id: "",
            label: "",
            primary: this.hass.localize(
              "ui.components.statistic-picker.no_statistics"
            ),
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

      const isRTL = computeRTL(this.hass);

      const output: StatisticItem[] = [];
      statisticIds.forEach((meta) => {
        if (
          excludeStatistics &&
          meta.statistic_id !== value &&
          excludeStatistics.includes(meta.statistic_id)
        ) {
          return;
        }
        const entityState = this.hass.states[meta.statistic_id];
        if (!entityState) {
          if (!entitiesOnly) {
            const id = meta.statistic_id;
            const label = getStatisticLabel(this.hass, meta.statistic_id, meta);
            const type =
              meta.statistic_id.includes(":") &&
              !meta.statistic_id.includes(".")
                ? "external"
                : "no_state";

            if (type === "no_state") {
              output.push({
                id,
                primary: label,
                secondary: this.hass.localize(
                  "ui.components.statistic-picker.no_state"
                ),
                label: "",
                type,
                sorting_label: label,
              });
            } else if (type === "external") {
              const domain = id.split(":")[0];
              const domainName = domainToName(this.hass.localize, domain);
              output.push({
                id,
                primary: label,
                secondary: domainName,
                label: "",
                type,
                sorting_label: label,
                iconPath: mdiChartLine,
              });
            }
          }
          return;
        }
        const id = meta.statistic_id;

        const { area, device } = getEntityContext(entityState, hass);

        const friendlyName = computeStateName(entityState); // Keep this for search
        const entityName = computeEntityName(entityState, hass);
        const deviceName = device ? computeDeviceName(device) : undefined;
        const areaName = area ? computeAreaName(area) : undefined;

        const primary = entityName || deviceName || id;
        const secondary = [areaName, entityName ? deviceName : undefined]
          .filter(Boolean)
          .join(isRTL ? " ◂ " : " ▸ ");

        output.push({
          id,
          primary,
          secondary,
          label: "",
          state: entityState,
          type: "entity",
          sorting_label: [deviceName, entityName].join("_"),
          entity_name: entityName || deviceName,
          area_name: areaName,
          device_name: deviceName,
          friendly_name: friendlyName,
          show_entity_id: hass.userData?.showEntityIdPicker,
        });
      });

      if (!output.length) {
        return [
          {
            id: "",
            primary: this.hass.localize(
              "ui.components.statistic-picker.no_match"
            ),
            label: "",
          },
        ];
      }

      if (output.length > 1) {
        output.sort((a, b) => {
          const aPrefix = TYPE_ORDER.indexOf(a.type || "no_state");
          const bPrefix = TYPE_ORDER.indexOf(b.type || "no_state");

          return caseInsensitiveStringCompare(
            `${aPrefix}_${a.sorting_label || ""}`,
            `${bPrefix}_${b.sorting_label || ""}`,
            this.hass.locale.language
          );
        });
      }

      output.push({
        id: "__missing",
        primary: this.hass.localize(
          "ui.components.statistic-picker.missing_entity"
        ),
        label: "",
      });

      return output;
    }
  );

  public async open() {
    await this.updateComplete;
    await this.comboBox?.open();
  }

  public async focus() {
    await this.updateComplete;
    await this.comboBox?.focus();
  }

  protected shouldUpdate(changedProps: PropertyValues) {
    if (
      changedProps.has("value") ||
      changedProps.has("label") ||
      changedProps.has("disabled")
    ) {
      return true;
    }
    return !(!changedProps.has("_opened") && this._opened);
  }

  public willUpdate(changedProps: PropertyValues) {
    if (
      (!this.hasUpdated && !this.statisticIds) ||
      changedProps.has("statisticTypes")
    ) {
      this._getStatisticIds();
    }

    if (
      this.statisticIds &&
      (!this._initialItems || (changedProps.has("_opened") && this._opened))
    ) {
      this._items = this._getItems(
        this._opened,
        this.hass,
        this.statisticIds!,
        this.includeStatisticsUnitOfMeasurement,
        this.includeUnitClass,
        this.includeDeviceClass,
        this.entitiesOnly,
        this.excludeStatistics,
        this.value
      );
      if (this._initialItems) {
        this.comboBox.filteredItems = this._items;
      }
      this._initialItems = true;
    }
  }

  protected render(): TemplateResult | typeof nothing {
    if (this._items.length === 0) {
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
        .filteredItems=${this._items}
        item-value-path="id"
        item-id-path="id"
        item-label-path="label"
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

  private _fuseIndex = memoizeOne((states: StatisticItem[]) =>
    Fuse.createIndex(
      [
        "entity_name",
        "device_name",
        "area_name",
        "friendly_name", // for backwards compatibility
        "id", // for technical search
      ],
      states
    )
  );

  private _filterChanged(ev: CustomEvent): void {
    if (!this._opened) return;

    const target = ev.target as HaComboBox;
    const filterString = ev.detail.value.trim().toLowerCase() as string;

    const index = this._fuseIndex(this._items);
    const fuse = new HaFuse(this._items, {}, index);

    const results = fuse.multiTermsSearch(filterString);

    if (results) {
      target.filteredItems = results.map((result) => result.item);
    } else {
      target.filteredItems = this._items;
    }
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
    "ha-statistic-combo-box": HaStatisticComboBox;
  }
}
