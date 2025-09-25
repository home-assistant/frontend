import { mdiCheck, mdiTextureBox } from "@mdi/js";
import Fuse from "fuse.js";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { computeRTL } from "../../common/util/compute_rtl";
import {
  getAreasAndFloors,
  type AreaFloorValue,
  type FloorComboBoxItem,
} from "../../data/area_floor";
import { HaFuse } from "../../resources/fuse";
import { haStyleScrollbar } from "../../resources/styles";
import { loadVirtualizer } from "../../resources/virtualizer";
import type { HomeAssistant } from "../../types";
import "../ha-button";
import "../ha-combo-box-item";
import "../ha-floor-icon";
import "../ha-md-list";
import "../ha-svg-icon";
import "../ha-textfield";
import type { HaTextField } from "../ha-textfield";
import "../ha-tree-indicator";
import type { TargetType } from "./ha-target-picker-item-row";

const SEPARATOR = "________";

export type TargetTypeFloorless = Exclude<TargetType, "floor">;

@customElement("ha-target-picker-selector")
export class HaTargetPickerSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public filterTypes: TargetTypeFloorless[] =
    [];

  @state() private _searchTerm = "";

  static shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    if (!this.hasUpdated) {
      loadVirtualizer();
    }
  }

  protected render() {
    return html`
      <ha-textfield
        .label=${this.hass.localize("ui.common.search")}
        @input=${this._searchChanged}
        .value=${this._searchTerm}
      ></ha-textfield>
      <div class="filter">${this._renderFilterButtons()}</div>
      <lit-virtualizer
        scroller
        .items=${this._getItems()}
        .renderItem=${this._renderRow}
      >
      </lit-virtualizer>
    `;
  }

  private _renderFilterButtons() {
    const filter: (TargetTypeFloorless | "separator")[] = [
      "entity",
      "device",
      "area",
      "separator",
      "label",
    ];
    return filter.map((filterType) => {
      if (filterType === "separator") {
        return html`<div class="separator"></div>`;
      }

      const selected = this.filterTypes.includes(filterType);
      return html`
        <ha-button
          @click=${this._toggleFilter}
          .type=${filterType}
          size="small"
          .variant=${selected ? "brand" : "neutral"}
          appearance="filled"
        >
          ${selected
            ? html`<ha-svg-icon slot="start" .path=${mdiCheck}></ha-svg-icon>`
            : nothing}
          ${filterType.charAt(0).toUpperCase() +
          filterType.slice(1)}s</ha-button
        >
      `;
    });
  }

  private _renderRow = (item) => {
    if (!item) {
      return nothing;
    }

    if (typeof item === "string") {
      return html`<div class="title">${item}</div>`;
    }

    if (item.type === "area" || item.type === "floor") {
      return this._areaRowRenderer(item);
    }

    return nothing;
  };

  private _filterAreasAndFloors(items: FloorComboBoxItem[]) {
    const index = this._fuseIndex(items);
    const fuse = new HaFuse(items, { shouldSort: false }, index);

    const results = fuse.multiTermsSearch(this._searchTerm);
    let filteredItems = items as FloorComboBoxItem[];
    if (results) {
      filteredItems = results.map((result) => result.item);
    }

    return filteredItems;
  }

  private _getItems = () => {
    const items: (string | FloorComboBoxItem)[] = [];
    if (this.filterTypes.length === 0 || this.filterTypes.includes("area")) {
      items.push("Areas"); // title
      let areasAndFloors = getAreasAndFloors(
        this.hass.states,
        this.hass.floors,
        this.hass.areas,
        this.hass.devices,
        this.hass.entities,
        memoizeOne((value: AreaFloorValue): string =>
          [value.type, value.id].join(SEPARATOR)
        )
      );

      if (this._searchTerm) {
        areasAndFloors = this._filterAreasAndFloors(areasAndFloors);
      }

      items.push(...areasAndFloors);
    }

    return items;
  };

  private _fuseIndex = memoizeOne((states: FloorComboBoxItem[]) =>
    Fuse.createIndex(["search_labels"], states)
  );

  private _searchChanged(ev: Event) {
    const textfield = ev.target as HaTextField;
    const value = textfield.value.trim();
    this._searchTerm = value;
  }

  private _areaRowRenderer = (item) => {
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
                .end=${false}
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

  private _toggleFilter(ev: any) {
    const type = ev.target.type as TargetTypeFloorless;
    if (!type) {
      return;
    }
    const index = this.filterTypes.indexOf(type);
    if (index === -1) {
      this.filterTypes = [...this.filterTypes, type];
    } else {
      this.filterTypes = this.filterTypes.filter((t) => t !== type);
    }

    fireEvent(this, "filter-types-changed", this.filterTypes);
  }

  static styles = [
    haStyleScrollbar,
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding-top: 12px;
      }

      ha-textfield {
        padding: 0 12px;
      }

      .filter {
        display: flex;
        gap: 8px;
        padding: 0 12px;
        --ha-button-border-radius: var(--ha-border-radius-md);
      }

      .filter .separator {
        height: 32px;
        width: 0;
        border: 1px solid var(--ha-color-border-neutral-quiet);
      }

      .title {
        width: 100%;
        background-color: var(--ha-color-fill-neutral-quiet-resting);
        padding: 4px 8px;
        font-weight: var(--ha-font-weight-bold);
        color: var(--secondary-text-color);
      }

      ha-combo-box-item {
        width: 100%;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-target-picker-selector": HaTargetPickerSelector;
  }

  interface HASSDomEvents {
    "filter-types-changed": TargetTypeFloorless[];
  }
}
