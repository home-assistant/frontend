import { consume, type ContextType } from "@lit/context";
import { mdiFilterVariantRemove, mdiTextureBox } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import { fireEvent } from "../common/dom/fire_event";
import { computeRTL } from "../common/util/compute_rtl";
import { deepEqual } from "../common/util/deep-equal";
import type { LocalizeFunc } from "../common/translations/localize";
import {
  apiContext,
  areasContext,
  floorsContext,
  internationalizationContext,
} from "../data/context";
import { getFloorAreaLookup } from "../data/floor_registry";
import type { RelatedResult } from "../data/search";
import { findRelated } from "../data/search";
import { haStyleScrollbar } from "../resources/styles";
import "./ha-expansion-panel";
import "./ha-floor-icon";
import "./ha-icon";
import "./ha-icon-button";
import "./ha-svg-icon";
import "./ha-tree-indicator";
import "./item/ha-list-item-option";
import type { HaListItemOption } from "./item/ha-list-item-option";
import "./list/ha-list-selectable";
import type { HaListSelectable } from "./list/ha-list-selectable";

@customElement("ha-filter-floor-areas")
export class HaFilterFloorAreas extends LitElement {
  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @consume({ context: areasContext, subscribe: true })
  @state()
  private _areasReg!: ContextType<typeof areasContext>;

  @consume({ context: floorsContext, subscribe: true })
  @state()
  private _floorsReg!: ContextType<typeof floorsContext>;

  @consume({ context: internationalizationContext, subscribe: true })
  @state()
  private _i18n!: ContextType<typeof internationalizationContext>;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @property({ attribute: false }) public value?: {
    floors?: string[];
    areas?: string[];
  };

  @property() public type?: keyof RelatedResult;

  @property({ type: Boolean, attribute: "include-disabled-entities" })
  public includeDisabledEntities = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, reflect: true }) public expanded = false;

  @state() private _shouldRender = false;

  @query("ha-list-selectable") private _list?: HaListSelectable;

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
    const areas = this._areas(this._areasReg, this._floorsReg);

    return html`
      <ha-expansion-panel
        left-chevron
        .expanded=${this.expanded}
        @expanded-will-change=${this._expandedWillChange}
        @expanded-changed=${this._expandedChanged}
      >
        <div slot="header" class="header">
          ${this._localize("ui.panel.config.areas.caption")}
          ${
            this.value?.areas?.length || this.value?.floors?.length
              ? html`<div class="badge">
                    ${
                      (this.value?.areas?.length || 0) +
                      (this.value?.floors?.length || 0)
                    }
                  </div>
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
            ? html`
                <ha-list-selectable
                  class="ha-scrollbar"
                  multi
                  @ha-list-item-selected=${this._handleAdded}
                  @ha-list-item-deselected=${this._handleRemoved}
                  aria-label=${this._localize("ui.panel.config.areas.caption")}
                >
                  ${repeat(
                    areas?.floors || [],
                    (floor) => floor.floor_id,
                    (floor) => html`
                      <ha-list-item-option
                        appearance="checkbox"
                        selection-position="end"
                        .value=${floor.floor_id}
                        .type=${"floors"}
                        .selected=${
                          this.value?.floors?.includes(floor.floor_id) || false
                        }
                      >
                        <ha-floor-icon
                          slot="start"
                          .floor=${floor}
                        ></ha-floor-icon>
                        <span slot="headline">${floor.name} </span>
                      </ha-list-item-option>
                      ${repeat(
                        floor.areas,
                        (area, index) =>
                          `${area.area_id}${index === floor.areas.length - 1 ? "___last" : ""}`,
                        (area, index) =>
                          this._renderArea(
                            area,
                            index === floor.areas.length - 1
                          )
                      )}
                    `
                  )}
                  ${repeat(
                    areas?.unassisgnedAreas,
                    (area) => area.area_id,
                    (area) => this._renderArea(area)
                  )}
                </ha-list-selectable>
              `
            : nothing
        }
      </ha-expansion-panel>
    `;
  }

  private _renderArea(area, last = false) {
    const hasFloor = !!area.floor_id;

    return html`
      <ha-list-item-option
        appearance="checkbox"
        selection-position="end"
        .value=${area.area_id}
        .selected=${this.value?.areas?.includes(area.area_id) || false}
        .type=${"areas"}
        class=${classMap({
          rtl: computeRTL(
            this._i18n.language,
            this._i18n.translationMetadata.translations
          ),
          floor: hasFloor,
        })}
      >
        ${
          hasFloor
            ? html`<ha-tree-indicator
                slot="start"
                .end=${last}
              ></ha-tree-indicator>`
            : nothing
        }
        ${
          area.icon
            ? html`<ha-icon slot="start" .icon=${area.icon}></ha-icon>`
            : html`<ha-svg-icon
                slot="start"
                .path=${mdiTextureBox}
              ></ha-svg-icon>`
        }
        <span slot="headline">${area.name}</span>
      </ha-list-item-option>
    `;
  }

  private _handleAdded(ev: CustomEvent<number>) {
    if (!this.value) {
      this.value = {};
    }

    const addedItem = (ev.currentTarget as HaListSelectable).items[
      ev.detail
    ] as HaListItemOption & { type: string; value: string };

    if (!addedItem) {
      return;
    }

    this.value = {
      ...this.value,
      [addedItem.type]: [
        ...(this.value[addedItem.type] || []),
        addedItem.value,
      ],
    };
  }

  private _handleRemoved(ev: CustomEvent<number>) {
    if (!this.value) {
      return;
    }

    const removedItem = (ev.currentTarget as HaListSelectable).items[
      ev.detail
    ] as HaListItemOption & { type: string; value: string };

    if (!removedItem) {
      return;
    }

    this.value = {
      ...this.value,
      [removedItem.type]: this.value![removedItem.type].filter(
        (val) => val !== removedItem.value
      ),
    };
  }

  protected updated(changed: PropertyValues<this>) {
    if (changed.has("expanded") && this.expanded) {
      setTimeout(() => {
        if (!this.expanded) return;
        this._list!.style.height = `${this.clientHeight - 49}px`;
      }, 300);
    }
  }

  private _expandedWillChange(ev) {
    this._shouldRender = ev.detail.expanded;
  }

  private _expandedChanged(ev) {
    this.expanded = ev.detail.expanded;
  }

  private _areas = memoizeOne(
    (
      areaReg: ContextType<typeof areasContext>,
      floorReg: ContextType<typeof floorsContext>
    ) => {
      const areas = Object.values(areaReg);
      const floors = Object.values(floorReg);
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
      this.value = {};
      fireEvent(this, "data-table-filter-changed", {
        value: {},
        items: undefined,
      });
      return;
    }

    if (this.value.areas) {
      for (const areaId of this.value.areas) {
        if (this.type) {
          relatedPromises.push(
            findRelated(this._api, "area", areaId, this.includeDisabledEntities)
          );
        }
      }
    }

    if (this.value.floors) {
      for (const floorId of this.value.floors) {
        if (this.type) {
          relatedPromises.push(
            findRelated(
              this._api,
              "floor",
              floorId,
              this.includeDisabledEntities
            )
          );
        }
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
      value: this.value,
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
    this._list?.clearSelection();
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
        .floor::part(base) {
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
          opacity: 0.6;
        }
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
