import { mdiTextureBox } from "@mdi/js";
import type { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import type { HassEntity } from "home-assistant-js-websocket";
import type { TemplateResult } from "lit";
import { LitElement, html, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { computeAreaName } from "../common/entity/compute_area_name";
import { computeFloorName } from "../common/entity/compute_floor_name";
import { computeRTL } from "../common/util/compute_rtl";
import {
  getAreasAndFloors,
  type AreaFloorValue,
  type FloorComboBoxItem,
} from "../data/area_floor";
import type { HomeAssistant, ValueChangedEvent } from "../types";
import type { HaDevicePickerDeviceFilterFunc } from "./device/ha-device-picker";
import "./ha-combo-box-item";
import "./ha-floor-icon";
import "./ha-generic-picker";
import type { HaGenericPicker } from "./ha-generic-picker";
import "./ha-icon-button";
import type { PickerValueRenderer } from "./ha-picker-field";
import "./ha-svg-icon";
import "./ha-tree-indicator";

const SEPARATOR = "________";

@customElement("ha-area-floor-picker")
export class HaAreaFloorPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public label?: string;

  @property({ attribute: false }) public value?: AreaFloorValue;

  @property() public helper?: string;

  @property() public placeholder?: string;

  @property({ type: String, attribute: "search-label" })
  public searchLabel?: string;

  /**
   * Show only areas with entities from specific domains.
   * @type {Array}
   * @attr include-domains
   */
  @property({ type: Array, attribute: "include-domains" })
  public includeDomains?: string[];

  /**
   * Show no areas with entities of these domains.
   * @type {Array}
   * @attr exclude-domains
   */
  @property({ type: Array, attribute: "exclude-domains" })
  public excludeDomains?: string[];

  /**
   * Show only areas with entities of these device classes.
   * @type {Array}
   * @attr include-device-classes
   */
  @property({ type: Array, attribute: "include-device-classes" })
  public includeDeviceClasses?: string[];

  /**
   * List of areas to be excluded.
   * @type {Array}
   * @attr exclude-areas
   */
  @property({ type: Array, attribute: "exclude-areas" })
  public excludeAreas?: string[];

  /**
   * List of floors to be excluded.
   * @type {Array}
   * @attr exclude-floors
   */
  @property({ type: Array, attribute: "exclude-floors" })
  public excludeFloors?: string[];

  @property({ attribute: false })
  public deviceFilter?: HaDevicePickerDeviceFilterFunc;

  @property({ attribute: false })
  public entityFilter?: (entity: HassEntity) => boolean;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @query("ha-generic-picker") private _picker?: HaGenericPicker;

  public async open() {
    await this.updateComplete;
    await this._picker?.open();
  }

  private _valueRenderer: PickerValueRenderer = (value: string) => {
    const item = this._parseValue(value);

    const area = item.type === "area" && this.hass.areas[value];

    if (area) {
      const areaName = computeAreaName(area);
      return html`
        ${area.icon
          ? html`<ha-icon slot="start" .icon=${area.icon}></ha-icon>`
          : html`<ha-svg-icon
              slot="start"
              .path=${mdiTextureBox}
            ></ha-svg-icon>`}
        <slot name="headline">${areaName}</slot>
      `;
    }

    const floor = item.type === "floor" && this.hass.floors[value];

    if (floor) {
      const floorName = computeFloorName(floor);
      return html`
        <ha-floor-icon slot="start" .floor=${floor}></ha-floor-icon>
        <span slot="headline">${floorName}</span>
      `;
    }

    return html`
      <ha-svg-icon slot="start" .path=${mdiTextureBox}></ha-svg-icon>
      <span slot="headline">${value}</span>
    `;
  };

  private _rowRenderer: ComboBoxLitRenderer<FloorComboBoxItem> = (
    item,
    { index },
    combobox
  ) => {
    const nextItem = combobox.filteredItems?.[index + 1];
    const isLastArea =
      !nextItem ||
      nextItem.type === "floor" ||
      (nextItem.type === "area" && !nextItem.area?.floor_id);

    const rtl = computeRTL(this.hass);

    const hasFloor = item.type === "area" && item.area?.floor_id;

    return html`
      <ha-combo-box-item
        type="button"
        style=${item.type === "area" && hasFloor
          ? "--md-list-item-leading-space: 48px;"
          : ""}
      >
        ${item.type === "area" && hasFloor
          ? html`
              <ha-tree-indicator
                style=${styleMap({
                  width: "48px",
                  position: "absolute",
                  top: "0px",
                  left: rtl ? undefined : "4px",
                  right: rtl ? "4px" : undefined,
                  transform: rtl ? "scaleX(-1)" : "",
                })}
                .end=${isLastArea}
                slot="start"
              ></ha-tree-indicator>
            `
          : nothing}
        ${item.type === "floor" && item.floor
          ? html`<ha-floor-icon
              slot="start"
              .floor=${item.floor}
            ></ha-floor-icon>`
          : item.icon
            ? html`<ha-icon slot="start" .icon=${item.icon}></ha-icon>`
            : html`<ha-svg-icon
                slot="start"
                .path=${item.icon_path || mdiTextureBox}
              ></ha-svg-icon>`}
        ${item.primary}
      </ha-combo-box-item>
    `;
  };

  private _getAreasAndFloorsMemoized = memoizeOne(getAreasAndFloors);

  private _getItems = () =>
    this._getAreasAndFloorsMemoized(
      this.hass.states,
      this.hass.floors,
      this.hass.areas,
      this.hass.devices,
      this.hass.entities,
      this._formatValue,
      this.includeDomains,
      this.excludeDomains,
      this.includeDeviceClasses,
      this.deviceFilter,
      this.entityFilter,
      this.excludeAreas,
      this.excludeFloors
    );

  private _formatValue = memoizeOne((value: AreaFloorValue): string =>
    [value.type, value.id].join(SEPARATOR)
  );

  private _parseValue = memoizeOne((value: string): AreaFloorValue => {
    const [type, id] = value.split(SEPARATOR);

    return { id, type: type as "floor" | "area" };
  });

  protected render(): TemplateResult {
    const placeholder =
      this.placeholder ?? this.hass.localize("ui.components.area-picker.area");

    const value = this.value ? this._formatValue(this.value) : undefined;

    return html`
      <ha-generic-picker
        .hass=${this.hass}
        .autofocus=${this.autofocus}
        .label=${this.label}
        .searchLabel=${this.searchLabel}
        .notFoundLabel=${this.hass.localize(
          "ui.components.area-picker.no_match"
        )}
        .placeholder=${placeholder}
        .value=${value}
        .getItems=${this._getItems}
        .valueRenderer=${this._valueRenderer}
        .rowRenderer=${this._rowRenderer}
        @value-changed=${this._valueChanged}
      >
      </ha-generic-picker>
    `;
  }

  private _valueChanged(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();
    const value = ev.detail.value;

    if (!value) {
      this._setValue(undefined);
      return;
    }

    const selected = this._parseValue(value);
    this._setValue(selected);
  }

  private _setValue(value?: AreaFloorValue) {
    this.value = value;
    fireEvent(this, "value-changed", { value });
    fireEvent(this, "change");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-area-floor-picker": HaAreaFloorPicker;
  }
}
