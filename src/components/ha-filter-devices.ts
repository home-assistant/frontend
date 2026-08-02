import { consume, type ContextType } from "@lit/context";
import { mdiFilterVariantRemove } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import { fireEvent } from "../common/dom/fire_event";
import { computeDeviceNameDisplay } from "../common/entity/compute_device_name";
import { stringCompare } from "../common/string/compare";
import type { LocalizeFunc } from "../common/translations/localize";
import { deepEqual } from "../common/util/deep-equal";
import {
  apiContext,
  devicesContext,
  internationalizationContext,
  statesContext,
} from "../data/context";
import type { RelatedResult } from "../data/search";
import { findRelated } from "../data/search";
import "./ha-expansion-panel";
import "./input/ha-input-search";
import type { HaInputSearch } from "./input/ha-input-search";
import "./item/ha-list-item-option";
import "./list/ha-list-selectable-virtualized";
import type { HaListSelectableVirtualized } from "./list/ha-list-selectable-virtualized";
import type { HaListVirtualizedItem } from "./list/ha-list-virtualized";

interface HaFilterDevicesItem extends HaListVirtualizedItem {
  name: string;
}

@customElement("ha-filter-devices")
export class HaFilterDevices extends LitElement {
  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @consume({ context: statesContext, subscribe: true })
  @state()
  private _states!: ContextType<typeof statesContext>;

  @consume({ context: devicesContext, subscribe: true })
  @state()
  private _devicesReg!: ContextType<typeof devicesContext>;

  @consume({ context: internationalizationContext, subscribe: true })
  @state()
  private _i18n!: ContextType<typeof internationalizationContext>;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @property({ attribute: false }) public value?: string[];

  @property() public type?: keyof RelatedResult;

  @property({ type: Boolean, attribute: "include-disabled-entities" })
  public includeDisabledEntities = false;

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

  protected updated(changed: PropertyValues<this>) {
    if (changed.has("expanded") && this.expanded) {
      setTimeout(() => {
        if (!this.expanded || !this._listElement) {
          return;
        }
        this._listElement.style.height = `${this.clientHeight - 49 - 4 - 38}px`;
        // 49px - height of a header + 1px
        // 4px - padding-top of the search-input
        // 38px - height of the search input
      }, 300);
    }
  }

  protected render() {
    return html`
      <ha-expansion-panel
        left-chevron
        .expanded=${this.expanded}
        @expanded-will-change=${this._expandedWillChange}
        @expanded-changed=${this._expandedChanged}
      >
        <div slot="header" class="header">
          ${this._localize("ui.panel.config.devices.caption")}
          ${
            this.value?.length
              ? html`<div class="badge">${this.value?.length}</div>
                  <ha-icon-button
                    .path=${mdiFilterVariantRemove}
                    @click=${this._clearFilter}
                    @keydown=${this._handleClearFilterKeydown}
                  ></ha-icon-button>`
              : nothing
          }
        </div>
        ${
          this._shouldRender
            ? html`<ha-input-search
                  appearance="outlined"
                  .value=${this._filter}
                  @input=${this._handleSearchChange}
                  @keydown=${this._handleSearchKeydown}
                >
                </ha-input-search>
                <ha-list-selectable-virtualized
                  multi
                  .rows=${this._devices(
                    this._devicesReg,
                    this._filter || "",
                    this._localize,
                    this._states,
                    this._i18n.locale.language
                  )}
                  .rowRenderer=${this._renderItem}
                  @ha-list-item-selected=${this._handleAdded}
                  @ha-list-item-deselected=${this._handleRemoved}
                ></ha-list-selectable-virtualized>`
            : nothing
        }
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
          <span slot="headline">${item.name}</span>
        </ha-list-item-option>`;

  private _handleAdded(ev: CustomEvent<number>) {
    this.value = [
      ...(this.value ?? []),
      this._devices(
        this._devicesReg,
        this._filter || "",
        this._localize,
        this._states,
        this._i18n.locale.language
      )[ev.detail].id,
    ];
  }

  private _handleRemoved(ev: CustomEvent<number>) {
    const id = this._devices(
      this._devicesReg,
      this._filter || "",
      this._localize,
      this._states,
      this._i18n.locale.language
    )[ev.detail].id;
    this.value = (this.value ?? []).filter((deviceId) => deviceId !== id);
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
      devices: ContextType<typeof devicesContext>,
      filter: string,
      localize: LocalizeFunc,
      states: ContextType<typeof statesContext>,
      language: string | undefined
    ): HaFilterDevicesItem[] => {
      const values = Object.values(devices);
      return values
        .map((device) => ({
          id: device.id,
          interactive: true,
          name: computeDeviceNameDisplay(device, localize, states),
        }))
        .filter(
          ({ name }) =>
            !filter || name.toLowerCase().includes(filter.toLowerCase())
        )
        .sort((a, b) => stringCompare(a.name, b.name, language));
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
        relatedPromises.push(
          findRelated(
            this._api,
            "device",
            deviceId,
            this.includeDisabledEntities
          )
        );
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

  private _handleClearFilterKeydown(ev: KeyboardEvent) {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.stopPropagation();
      this._clearFilter(ev);
    }
  }

  private _clearFilter(ev) {
    ev.preventDefault();
    this.value = undefined;
    fireEvent(this, "data-table-filter-changed", {
      value: undefined,
      items: undefined,
    });
    this._listElement?.clearSelection();
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
