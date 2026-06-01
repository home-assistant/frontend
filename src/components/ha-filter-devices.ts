import { mdiFilterVariantRemove } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { computeDeviceNameDisplay } from "../common/entity/compute_device_name";
import { stringCompare } from "../common/string/compare";
import { deepEqual } from "../common/util/deep-equal";
import type { RelatedResult } from "../data/search";
import { findRelated } from "../data/search";
import type { HomeAssistant } from "../types";
import "./ha-expansion-panel";
import "./input/ha-input-search";
import type { HaInputSearch } from "./input/ha-input-search";
import "./item/ha-list-item-option";
import "./list/ha-list-selectable-virtualized";
import type { HaListSelectableVirtualized } from "./list/ha-list-selectable-virtualized";
import type { HaListVirtualizedItem } from "./list/ha-list-virtualized";
import type { HaListValueChangedDetail } from "./list/types";

interface HaFilterDevicesItem extends HaListVirtualizedItem {
  name: string;
}

@customElement("ha-filter-devices")
export class HaFilterDevices extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value?: string[];

  @property() public type?: keyof RelatedResult;

  @property({ type: Boolean, reflect: true }) public expanded = false;

  @property({ type: Boolean }) public narrow = false;

  @state() private _shouldRender = false;

  @state() private _filter?: string;

  @query("ha-list-selectable-virtualized")
  private _listElement?: HaListSelectableVirtualized;

  public willUpdate(properties: PropertyValues<this>) {
    super.willUpdate(properties);

    if (
      properties.has("value") &&
      !deepEqual(this.value, properties.get("value"))
    ) {
      this._findRelated();
    }
  }

  protected render() {
    return html`
      <ha-expansion-panel
        left-chevron
        flexcontent
        .expanded=${this.expanded}
        @expanded-will-change=${this._expandedWillChange}
        @expanded-changed=${this._expandedChanged}
      >
        <div slot="header" class="header">
          ${this.hass.localize("ui.panel.config.devices.caption")}
          ${this.value?.length
            ? html`<div class="badge">${this.value?.length}</div>
                <ha-icon-button
                  .path=${mdiFilterVariantRemove}
                  @click=${this._clearFilter}
                ></ha-icon-button>`
            : nothing}
        </div>
        ${this._shouldRender
          ? html`<ha-input-search
                appearance="outlined"
                .value=${this._filter}
                @input=${this._handleSearchChange}
                @keydown=${this._handleSearchKeydown}
              >
              </ha-input-search>
              <ha-list-selectable-virtualized
                multi
                .rows=${this._devices(this.hass.devices, this._filter || "")}
                .value=${this.value}
                .rowRenderer=${this._renderItem}
                @ha-list-value-changed=${this._handleListChanged}
              ></ha-list-selectable-virtualized>`
          : nothing}
      </ha-expansion-panel>
    `;
  }

  private _renderItem = (item?: HaFilterDevicesItem) =>
    !item
      ? nothing
      : html`<ha-list-item-option
          style="width: 100%;"
          appearance="checkbox"
          selection-position="end"
          .value=${item.id}
          .selected=${this.value?.includes(item.id) ?? false}
        >
          <span slot="headline">${item.name}_${item.id}</span>
        </ha-list-item-option>`;

  private _handleListChanged(ev: CustomEvent<HaListValueChangedDetail>) {
    this.value = ev.detail.value;
  }

  private _expandedWillChange(ev) {
    this._shouldRender = ev.detail.expanded;
  }

  private _expandedChanged(ev) {
    this.expanded = ev.detail.expanded;
  }

  private _handleSearchChange(ev: InputEvent) {
    const target = ev.target as HaInputSearch;
    this._filter = target.value ?? "";
  }

  private _handleSearchKeydown(ev: KeyboardEvent) {
    if (ev.key === "ArrowDown" && this._listElement) {
      ev.preventDefault();
      this._listElement.focus();
    }
  }

  private _devices = memoizeOne(
    (
      devices: HomeAssistant["devices"],
      filter: string
    ): HaFilterDevicesItem[] => {
      const values = Object.values(devices);
      return values
        .map((device) => ({
          id: device.id,
          interactive: true,
          name: computeDeviceNameDisplay(
            device,
            this.hass.localize,
            this.hass.states
          ),
        }))
        .filter(
          ({ name }) =>
            !filter || name.toLowerCase().includes(filter.toLowerCase())
        )
        .sort((a, b) =>
          stringCompare(a.name, b.name, this.hass.locale.language)
        );
    }
  );

  private async _findRelated() {
    const relatedPromises: Promise<RelatedResult>[] = [];

    if (!this.value?.length) {
      this.value = [];
      fireEvent(this, "data-table-filter-changed", {
        value: [],
        items: undefined,
      });
      return;
    }

    const value: string[] = [];

    for (const deviceId of this.value) {
      value.push(deviceId);
      if (this.type) {
        relatedPromises.push(findRelated(this.hass, "device", deviceId));
      }
    }
    const results = await Promise.all(relatedPromises);
    const items = new Set<string>();
    for (const result of results) {
      if (result[this.type!]) {
        result[this.type!]!.forEach((item) => items.add(item));
      }
    }

    fireEvent(this, "data-table-filter-changed", {
      value,
      items: this.type ? items : undefined,
    });
  }

  private _clearFilter(ev) {
    ev.preventDefault();
    this.value = undefined;
    fireEvent(this, "data-table-filter-changed", {
      value: undefined,
      items: undefined,
    });
  }

  static styles = css`
    :host {
      border-bottom: 1px solid var(--divider-color);
    }
    :host([expanded]) {
      flex: 1;
      height: 0;
      display: flex;
      flex-direction: column;
    }

    ha-expansion-panel {
      --ha-card-border-radius: var(--ha-border-radius-square);
      --expansion-panel-content-padding: 0;
    }
    :host([expanded]) ha-expansion-panel {
      flex: 1;
      min-height: 0;
    }
    ha-list-selectable-virtualized {
      flex: 1;
      min-height: 0;
    }
    .header {
      display: flex;
      align-items: center;
    }
    .header ha-icon-button {
      margin-inline-start: auto;
      margin-inline-end: 8px;
    }
    .badge {
      display: inline-block;
      margin-left: 8px;
      margin-inline-start: 8px;
      margin-inline-end: 0;
      min-width: 16px;
      box-sizing: border-box;
      border-radius: var(--ha-border-radius-circle);
      font-size: var(--ha-font-size-xs);
      font-weight: var(--ha-font-weight-normal);
      background-color: var(--primary-color);
      line-height: var(--ha-line-height-normal);
      text-align: center;
      padding: 0px 2px;
      color: var(--text-primary-color);
    }
    ha-input-search {
      display: block;
      padding: var(--ha-space-1) var(--ha-space-2) 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-filter-devices": HaFilterDevices;
  }
}
