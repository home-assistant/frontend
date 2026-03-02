import { mdiFilterVariantRemove } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { FILTER_NONE_OF_LISTED } from "../common/const";
import { fireEvent } from "../common/dom/fire_event";
import { computeDeviceNameDisplay } from "../common/entity/compute_device_name";
import { stringCompare } from "../common/string/compare";
import type { LocalizeKeys } from "../common/translations/localize";
import { deepEqual } from "../common/util/deep-equal";
import type { RelatedResult } from "../data/search";
import { findRelated } from "../data/search";
import { haStyleScrollbar } from "../resources/styles";
import { loadVirtualizer } from "../resources/virtualizer";
import type { HomeAssistant } from "../types";
import "./ha-check-list-item";
import "./ha-expansion-panel";
import "./ha-list";
import "./search-input-outlined";

@customElement("ha-filter-devices")
export class HaFilterDevices extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value?: string[];

  @property() public type?: keyof RelatedResult;

  @property({ type: Boolean, reflect: true }) public expanded = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public allItems = [];

  @state() private _shouldRender = false;

  @state() private _filter?: string;

  public willUpdate(properties: PropertyValues) {
    super.willUpdate(properties);

    if (!this.hasUpdated) {
      loadVirtualizer();
    }

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
          ? html`<search-input-outlined
                .hass=${this.hass}
                .filter=${this._filter}
                @value-changed=${this._handleSearchChange}
              >
              </search-input-outlined>
              <ha-list class="ha-scrollbar" multi>
                <lit-virtualizer
                  .items=${this._devices(
                    this.hass.devices,
                    this._filter || "",
                    this.value
                  )}
                  .keyFunction=${this._keyFunction}
                  .renderItem=${this._renderItem}
                  @click=${this._handleItemClick}
                >
                </lit-virtualizer>
              </ha-list>`
          : nothing}
      </ha-expansion-panel>
    `;
  }

  private _keyFunction = (device) => device?.id;

  private _renderItem = (device) =>
    !device
      ? nothing
      : typeof device === "string" && device === FILTER_NONE_OF_LISTED
        ? html`<ha-check-list-item
            .value=${FILTER_NONE_OF_LISTED}
            .selected=${this.value?.[0] === FILTER_NONE_OF_LISTED}
          >
            ${this.hass.localize(
              `ui.panel.config.devices.${FILTER_NONE_OF_LISTED}` as LocalizeKeys
            )}
          </ha-check-list-item>`
        : html`<ha-check-list-item
            .value=${device.id}
            .selected=${this.value?.includes(device.id) ?? false}
          >
            ${computeDeviceNameDisplay(device, this.hass)}
          </ha-check-list-item>`;

  private _handleItemClick(ev) {
    const listItem = ev.target.closest("ha-check-list-item");
    const value = listItem?.value;
    if (!value) {
      return;
    }
    if (value !== FILTER_NONE_OF_LISTED) {
      if (this.value?.includes(value)) {
        // deselect, remove item
        this.value = this.value?.filter((val) => val !== value);
      } else {
        // select
        if (!this.value) {
          this.value = [];
        }
        // add item
        this.value = [
          ...(this.value.filter((val) => val !== FILTER_NONE_OF_LISTED) || []),
          value,
        ];
      }
      listItem.selected = this.value?.includes(value);
    } else if (this.value?.includes(FILTER_NONE_OF_LISTED)) {
      // deselect
      this.value = [];
      listItem.selected = false;
    } else {
      // select
      this.value = [FILTER_NONE_OF_LISTED];
      listItem.selected = true;
    }
  }

  protected updated(changed) {
    if (changed.has("expanded") && this.expanded) {
      setTimeout(() => {
        if (!this.expanded) return;
        this.renderRoot.querySelector("ha-list")!.style.height =
          `${this.clientHeight - 49 - 4 - 32}px`;
        // 49px - height of a header + 1px
        // 4px - padding-top of the search-input
        // 32px - height of the search input
      }, 300);
    }
  }

  private _expandedWillChange(ev) {
    this._shouldRender = ev.detail.expanded;
  }

  private _expandedChanged(ev) {
    this.expanded = ev.detail.expanded;
  }

  private _handleSearchChange(ev: CustomEvent) {
    this._filter = ev.detail.value.toLowerCase();
  }

  private _devices = memoizeOne(
    (devices: HomeAssistant["devices"], filter: string, _value) => {
      const values = Object.values(devices);
      return [
        ...[FILTER_NONE_OF_LISTED],
        ...values
          .filter(
            (device) =>
              !filter ||
              computeDeviceNameDisplay(device, this.hass)
                .toLowerCase()
                .includes(filter)
          )
          .sort((a, b) =>
            stringCompare(
              computeDeviceNameDisplay(a, this.hass),
              computeDeviceNameDisplay(b, this.hass),
              this.hass.locale.language
            )
          ),
      ];
    }
  );

  private async _findRelated() {
    if (!this.value?.length) {
      this.value = [];
      fireEvent(this, "data-table-filter-changed", {
        value: undefined,
        items: undefined,
      });
      return;
    }

    const filterNoneOfListed = this.value[0] === FILTER_NONE_OF_LISTED;
    const value: string[] = [];
    const items = new Set<string>();
    type EntityStub = Record<string, string>;

    if (this.type === "entity") {
      // filter out by device_id
      if (filterNoneOfListed) {
        value.push(FILTER_NONE_OF_LISTED);
        // find entities w/o device_id
        Object.values(this.allItems)
          .filter((entity: EntityStub) => !entity.device_id)
          .map((entity: EntityStub) => items.add(entity.entity_id));
      } else {
        for (const deviceId of this.value) {
          value.push(deviceId);
        }
        // find entities with selected device_ids
        Object.values(this.allItems)
          .filter(
            (entity: EntityStub) =>
              entity.device_id && this.value!.includes(entity.device_id)
          )
          .map((entity: EntityStub) => items.add(entity.entity_id));
      }
    } else {
      // filter out by findRelated()
      const relatedPromises: Promise<RelatedResult>[] = [];
      let requestedDevices;
      if (filterNoneOfListed) {
        value.push(FILTER_NONE_OF_LISTED);
        // request "related" for all devices
        requestedDevices = Object.values(this.hass.devices).map(
          (device) => device.id
        );
      } else {
        // request "related" for selected devices
        requestedDevices = this.value;
      }
      for (const deviceId of requestedDevices) {
        if (!filterNoneOfListed) {
          value.push(deviceId);
        }
        if (this.type) {
          relatedPromises.push(findRelated(this.hass, "device", deviceId));
        }
      }
      const results = await Promise.all(relatedPromises);
      if (filterNoneOfListed) {
        const allRelatedToDevices: string[] = [];
        // collect "related items" for all devices
        for (const result of results) {
          if (result[this.type!]) {
            result[this.type!]!.forEach((item) =>
              allRelatedToDevices.push(item)
            );
          }
        }
        // exclude "related items" from "all items"
        this.allItems
          .filter(
            (entity: EntityStub) =>
              !allRelatedToDevices.includes(entity.entity_id)
          )
          .forEach((entity: EntityStub) => items.add(entity.entity_id));
      } else {
        // collect "related items" for selected devices
        for (const result of results) {
          if (result[this.type!]) {
            result[this.type!]!.forEach((item) => items.add(item));
          }
        }
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

  static get styles(): CSSResultGroup {
    return [
      haStyleScrollbar,
      css`
        :host {
          border-bottom: 1px solid var(--divider-color);
        }
        :host([expanded]) {
          flex: 1;
          height: 0;
        }

        ha-expansion-panel {
          --ha-card-border-radius: var(--ha-border-radius-square);
          --expansion-panel-content-padding: 0;
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
        ha-check-list-item {
          width: 100%;
        }
        search-input-outlined {
          display: block;
          padding: var(--ha-space-1) var(--ha-space-2) 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-filter-devices": HaFilterDevices;
  }
}
