import "@material/mwc-menu/mwc-menu-surface";
import { mdiFilterVariantRemove, mdiTextureBox } from "@mdi/js";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { computeRTL } from "../common/util/compute_rtl";
import {
  FloorRegistryEntry,
  getFloorAreaLookup,
  subscribeFloorRegistry,
} from "../data/floor_registry";
import { RelatedResult, findRelated } from "../data/search";
import { SubscribeMixin } from "../mixins/subscribe-mixin";
import { haStyleScrollbar } from "../resources/styles";
import type { HomeAssistant } from "../types";
import "./ha-check-list-item";
import "./ha-floor-icon";
import "./ha-icon";
import "./ha-svg-icon";
import "./ha-tree-indicator";

@customElement("ha-filter-floor-areas")
export class HaFilterFloorAreas extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value?: {
    floors?: string[];
    areas?: string[];
  };

  @property() public type?: keyof RelatedResult;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, reflect: true }) public expanded = false;

  @state() private _shouldRender = false;

  @state() private _floors?: FloorRegistryEntry[];

  public willUpdate(properties: PropertyValues) {
    super.willUpdate(properties);

    if (!this.hasUpdated) {
      if (this.value?.floors?.length || this.value?.areas?.length) {
        this._findRelated();
      }
    }
  }

  protected render() {
    const areas = this._areas(this.hass.areas, this._floors);

    return html`
      <ha-expansion-panel
        leftChevron
        .expanded=${this.expanded}
        @expanded-will-change=${this._expandedWillChange}
        @expanded-changed=${this._expandedChanged}
      >
        <div slot="header" class="header">
          ${this.hass.localize("ui.panel.config.areas.caption")}
          ${this.value?.areas?.length || this.value?.floors?.length
            ? html`<div class="badge">
                  ${(this.value?.areas?.length || 0) +
                  (this.value?.floors?.length || 0)}
                </div>
                <ha-icon-button
                  .path=${mdiFilterVariantRemove}
                  @click=${this._clearFilter}
                ></ha-icon-button>`
            : nothing}
        </div>
        ${this._shouldRender
          ? html`
              <mwc-list class="ha-scrollbar">
                ${repeat(
                  areas?.floors || [],
                  (floor) => floor.floor_id,
                  (floor) => html`
                    <ha-check-list-item
                      .value=${floor.floor_id}
                      .type=${"floors"}
                      .selected=${this.value?.floors?.includes(
                        floor.floor_id
                      ) || false}
                      graphic="icon"
                      @request-selected=${this._handleItemClick}
                    >
                      <ha-floor-icon
                        slot="graphic"
                        .floor=${floor}
                      ></ha-floor-icon>
                      ${floor.name}
                    </ha-check-list-item>
                    ${repeat(
                      floor.areas,
                      (area, index) =>
                        `${area.area_id}${index === floor.areas.length - 1 ? "___last" : ""}`,
                      (area, index) =>
                        this._renderArea(area, index === floor.areas.length - 1)
                    )}
                  `
                )}
                ${repeat(
                  areas?.unassisgnedAreas,
                  (area) => area.area_id,
                  (area) => this._renderArea(area)
                )}
              </mwc-list>
            `
          : nothing}
      </ha-expansion-panel>
    `;
  }

  private _renderArea(area, last: boolean = false) {
    const hasFloor = !!area.floor_id;
    return html`
      <ha-check-list-item
        .value=${area.area_id}
        .selected=${this.value?.areas?.includes(area.area_id) || false}
        .type=${"areas"}
        graphic="icon"
        @request-selected=${this._handleItemClick}
        class=${classMap({
          rtl: computeRTL(this.hass),
          floor: hasFloor,
        })}
      >
        ${hasFloor
          ? html`
              <ha-tree-indicator
                .end=${last}
                slot="graphic"
              ></ha-tree-indicator>
            `
          : nothing}
        ${area.icon
          ? html`<ha-icon slot="graphic" .icon=${area.icon}></ha-icon>`
          : html`<ha-svg-icon
              slot="graphic"
              .path=${mdiTextureBox}
            ></ha-svg-icon>`}
        ${area.name}
      </ha-check-list-item>
    `;
  }

  private _handleItemClick(ev) {
    ev.stopPropagation();

    const listItem = ev.currentTarget;
    const type = listItem?.type;
    const value = listItem?.value;

    if (ev.detail.selected === listItem.selected || !value) {
      return;
    }

    if (this.value?.[type]?.includes(value)) {
      this.value = {
        ...this.value,
        [type]: this.value[type].filter((val) => val !== value),
      };
    } else {
      if (!this.value) {
        this.value = {};
      }
      this.value = {
        ...this.value,
        [type]: [...(this.value[type] || []), value],
      };
    }

    listItem.selected = this.value[type]?.includes(value);

    this._findRelated();
  }

  protected hassSubscribe(): (UnsubscribeFunc | Promise<UnsubscribeFunc>)[] {
    return [
      subscribeFloorRegistry(this.hass.connection, (floors) => {
        this._floors = floors;
      }),
    ];
  }

  protected updated(changed) {
    if (changed.has("expanded") && this.expanded) {
      setTimeout(() => {
        if (!this.expanded) return;
        this.renderRoot.querySelector("mwc-list")!.style.height =
          `${this.clientHeight - 49}px`;
      }, 300);
    }
  }

  protected firstUpdated() {
    this._findRelated();
  }

  private _expandedWillChange(ev) {
    this._shouldRender = ev.detail.expanded;
  }

  private _expandedChanged(ev) {
    this.expanded = ev.detail.expanded;
  }

  private _areas = memoizeOne(
    (areaReg: HomeAssistant["areas"], floors?: FloorRegistryEntry[]) => {
      const areas = Object.values(areaReg);

      const floorAreaLookup = getFloorAreaLookup(areas);

      const unassisgnedAreas = areas.filter(
        (area) => !area.floor_id || !floorAreaLookup[area.floor_id]
      );
      return {
        floors: floors?.map((floor) => ({
          ...floor,
          areas: floorAreaLookup[floor.floor_id] || [],
        })),
        unassisgnedAreas: unassisgnedAreas,
      };
    }
  );

  private async _findRelated() {
    const relatedPromises: Promise<RelatedResult>[] = [];

    if (
      !this.value ||
      (!this.value.areas?.length && !this.value.floors?.length)
    ) {
      fireEvent(this, "data-table-filter-changed", {
        value: {},
        items: undefined,
      });
      return;
    }

    if (this.value.areas) {
      for (const areaId of this.value.areas) {
        if (this.type) {
          relatedPromises.push(findRelated(this.hass, "area", areaId));
        }
      }
    }

    if (this.value.floors) {
      for (const floorId of this.value.floors) {
        if (this.type) {
          relatedPromises.push(findRelated(this.hass, "floor", floorId));
        }
      }
    }

    const results = await Promise.all(relatedPromises);
    const items: Set<string> = new Set();
    for (const result of results) {
      if (result[this.type!]) {
        result[this.type!]!.forEach((item) => items.add(item));
      }
    }

    fireEvent(this, "data-table-filter-changed", {
      value: this.value,
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
          --ha-card-border-radius: 0;
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
          border-radius: 50%;
          font-weight: 400;
          font-size: 11px;
          background-color: var(--primary-color);
          line-height: 16px;
          text-align: center;
          padding: 0px 2px;
          color: var(--text-primary-color);
        }
        ha-check-list-item {
          --mdc-list-item-graphic-margin: 16px;
        }
        .floor {
          padding-left: 48px;
          padding-inline-start: 48px;
          padding-inline-end: 16px;
        }
        ha-tree-indicator {
          width: 56px;
          position: absolute;
          top: 0px;
          left: 0px;
        }
        .rtl ha-tree-indicator {
          right: 0px;
          left: initial;
          transform: scaleX(-1);
        }
        .subdir {
          margin-inline-end: 8px;
          opacity: .6;
        }
        .
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-filter-floor-areas": HaFilterFloorAreas;
  }
  interface HASSDomEvents {
    "data-table-filter-changed": { value: any; items: Set<string> | undefined };
  }
}
