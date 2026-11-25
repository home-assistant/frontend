import type { ContextType } from "@lit/context";
import { mdiFilterVariantRemove, mdiTextureBox } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { createRef, ref } from "lit/directives/ref";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { consume } from "../common/decorators/consume";
import { transform } from "../common/decorators/transform";
import { getDeviceAreaId } from "../common/entity/context/get_device_context";
import {
  FilterPanelController,
  filterPanelStyles,
} from "../common/controllers/filter-panel-controller";
import { fireEvent } from "../common/dom/fire_event";
import { computeRTL } from "../common/util/compute_rtl";
import { deepEqual } from "../common/util/deep-equal";
import type { AreaRegistryEntry } from "../data/area/area_registry";
import type { FloorAreasFilterValue } from "../data/data_table_filters";
import {
  floorAreaLookups,
  floorSelection,
  toggleFloorArea,
} from "../data/data_table_filters";
import {
  apiContext,
  areasContext,
  devicesContext,
  floorsContext,
  fullEntitiesContext,
  internationalizationContext,
  statesContext,
} from "../data/context";
import { getFloorAreaLookup } from "../data/floor_registry";
import type { RelatedResult } from "../data/search";
import { findRelated } from "../data/search";
import "./ha-expansion-panel";
import "./ha-floor-icon";
import "./ha-icon";
import "./ha-icon-button";
import "./ha-svg-icon";
import "./ha-tree-indicator";
import "./item/ha-list-item-base";
import "./item/ha-list-item-option";
import type { HaListItemOption } from "./item/ha-list-item-option";
import "./list/ha-list-selectable";
import type { HaListSelectable } from "./list/ha-list-selectable";

@customElement("ha-filter-floor-areas")
export class HaFilterFloorAreas extends LitElement {
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

  @consume({ context: devicesContext, subscribe: true })
  @state()
  private _devices!: ContextType<typeof devicesContext>;

  @consume({ context: fullEntitiesContext, subscribe: true })
  @state()
  private _entities?: ContextType<typeof fullEntitiesContext>;

  // Only a state being added or removed can change the state-only entities,
  // so plain state updates keep the previous set and don't rerender
  @state()
  @consume({ context: statesContext, subscribe: true })
  @transform<ContextType<typeof statesContext>, Set<string>>({
    transformer: function (this: HaFilterFloorAreas, states) {
      const ids = new Set(Object.keys(states));
      return deepEqual(ids, this._stateIds) ? this._stateIds : ids;
    },
  })
  private _stateIds?: Set<string>;

  @property({ attribute: false }) public value?: FloorAreasFilterValue;

  @property() public type?: keyof RelatedResult;

  @property({ type: Boolean, attribute: "include-disabled-entities" })
  public includeDisabledEntities = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, reflect: true }) public expanded = false;

  @query("ha-list-selectable") private _list?: HaListSelectable;

  private _content = createRef<HTMLElement>();

  private _panel = new FilterPanelController(this, this._content);

  private _relatedRequestId = 0;

  public connectedCallback() {
    super.connectedCallback();
    // The config pages are cached, so an item may have been edited while this
    // filter was not on screen
    if (
      this.hasUpdated &&
      this.value &&
      (this.value.areas?.length ||
        this.value.floors?.length ||
        this.value.no_area)
    ) {
      this._findRelated();
    }
  }

  public willUpdate(properties: PropertyValues) {
    super.willUpdate(properties);

    if (
      (properties.has("value") &&
        !deepEqual(this.value, properties.get("value"))) ||
      // Items without an area are worked out from the registries
      (this.value?.no_area &&
        (properties.has("_devices") ||
          properties.has("_entities") ||
          (this.type !== "device" && properties.has("_stateIds")))) ||
      // Whether a floor is picked whole depends on which areas it has
      ((!!this.value?.floors?.length || !!this.value?.areas?.length) &&
        (properties.has("_areasReg") || properties.has("_floorsReg")))
    ) {
      this._findRelated();
    }
  }

  protected render() {
    const areas = this._areas(this._areasReg, this._floorsReg);
    const groupOtherAreas =
      !!areas.floors.length && !!areas.unassisgnedAreas.length;
    const count =
      (this.value?.areas?.length || 0) +
      (this.value?.floors?.length || 0) +
      (this.value?.no_area ? 1 : 0);

    return html`
      <ha-expansion-panel
        left-chevron
        .expanded=${this.expanded}
        @expanded-changed=${this._expandedChanged}
      >
        <div slot="header" class="header">
          ${this._i18n.localize("ui.panel.config.areas.caption")}
          ${
            count
              ? html`<div class="badge">${count}</div>
                  <ha-icon-button
                    .path=${mdiFilterVariantRemove}
                    .label=${this._i18n.localize(
                      "ui.components.subpage-data-table.clear_filter"
                    )}
                    @click=${this._clearFilter}
                    @keydown=${this._handleClearFilterKeydown}
                  ></ha-icon-button>`
              : nothing
          }
        </div>
      </ha-expansion-panel>
      ${
        this._panel.showContent
          ? html`
              <div class="content" ${ref(this._content)}>
                <ha-list-selectable
                  multi
                  @ha-list-item-selected=${this._handleAdded}
                  @ha-list-item-deselected=${this._handleRemoved}
                  aria-label=${this._i18n.localize("ui.panel.config.areas.caption")}
                >
                  <ha-list-item-option
                    appearance="checkbox"
                    selection-position="end"
                    .value=${"no_area"}
                    .type=${"no_area"}
                    .selected=${this.value?.no_area || false}
                  >
                    <span slot="headline">
                      ${this._i18n.localize("ui.components.area-picker.no_area")}
                    </span>
                  </ha-list-item-option>
                  ${repeat(
                    areas?.floors || [],
                    (floor) => floor.floor_id,
                    (floor) => {
                      const selection = floorSelection(
                        this.value,
                        floor.floor_id,
                        floor.areas.map((area) => area.area_id)
                      );
                      return html`
                        <ha-list-item-option
                          appearance="checkbox"
                          selection-position="end"
                          .value=${floor.floor_id}
                          .type=${"floors"}
                          .selected=${selection === "all"}
                          .indeterminate=${selection === "some"}
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
                      `;
                    }
                  )}
                  ${
                    groupOtherAreas
                      ? html`<ha-list-item-base role="presentation">
                          <ha-svg-icon
                            slot="start"
                            .path=${mdiTextureBox}
                          ></ha-svg-icon>
                          <span slot="headline">
                            ${this._i18n.localize(
                              "ui.panel.config.areas.picker.other_areas"
                            )}
                          </span>
                        </ha-list-item-base>`
                      : nothing
                  }
                  ${repeat(
                    areas.unassisgnedAreas,
                    (area, index) =>
                      `${area.area_id}${index === areas.unassisgnedAreas.length - 1 ? "___last" : ""}`,
                    (area, index) =>
                      this._renderArea(
                        area,
                        index === areas.unassisgnedAreas.length - 1,
                        groupOtherAreas
                      )
                  )}
                </ha-list-selectable>
              </div>
            `
          : nothing
      }
    `;
  }

  private _renderArea(
    area: AreaRegistryEntry,
    last = false,
    nested = !!area.floor_id
  ) {
    return html`
      <ha-list-item-option
        appearance="checkbox"
        selection-position="end"
        .value=${area.area_id}
        .selected=${
          this.value?.areas?.includes(area.area_id) ||
          (!!area.floor_id && !!this.value?.floors?.includes(area.floor_id))
        }
        .type=${"areas"}
        class=${classMap({
          rtl: computeRTL(
            this._i18n.language,
            this._i18n.translationMetadata.translations
          ),
          floor: nested,
        })}
      >
        ${
          nested
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
    this._handleToggled(ev, true);
  }

  private _handleRemoved(ev: CustomEvent<number>) {
    this._handleToggled(ev, false);
  }

  private _handleToggled(ev: CustomEvent<number>, selected: boolean) {
    const item = (ev.currentTarget as HaListSelectable).items[ev.detail] as
      (HaListItemOption & { type: string; value: string }) | undefined;

    if (!item) {
      return;
    }

    if (item.type === "no_area") {
      this.value = { ...this.value, no_area: selected };
      return;
    }

    this.value = toggleFloorArea(
      this.value,
      this._floorAreaIds(this._areasReg, this._floorsReg),
      item.type as "floors" | "areas",
      item.value,
      selected
    );
  }

  // The area ids of each floor, by floor id
  private _floorAreaIds = memoizeOne(
    (
      areaReg: ContextType<typeof areasContext>,
      floorReg: ContextType<typeof floorsContext>
    ): Record<string, string[]> =>
      Object.fromEntries(
        this._areas(areaReg, floorReg).floors.map((floor) => [
          floor.floor_id,
          floor.areas.map((area) => area.area_id),
        ])
      )
  );

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
    const requestId = ++this._relatedRequestId;

    if (
      !this.value ||
      (!this.value.areas?.length &&
        !this.value.floors?.length &&
        !this.value.no_area)
    ) {
      this.value = {};
      fireEvent(this, "data-table-filter-changed", {
        value: {},
        items: undefined,
      });
      return;
    }

    const type = this.type;
    const value = this.value;
    const lookups = floorAreaLookups(
      value,
      this._floorAreaIds(this._areasReg, this._floorsReg)
    );
    const search = (itemType: "area" | "floor", ids: string[]) =>
      Promise.all(
        ids.map(
          async (id) =>
            (
              await findRelated(
                this._api,
                itemType,
                id,
                this.includeDisabledEntities
              )
            )[type!] ?? []
        )
      );
    const [areas, floors] = type
      ? await Promise.all([
          search("area", lookups.areas),
          search("floor", lookups.floors),
        ])
      : [[], []];

    // The value changed while this lookup ran
    if (requestId !== this._relatedRequestId) {
      return;
    }

    const items = new Set<string>([
      ...(value.no_area ? this._itemsWithoutArea() : []),
      ...areas.flat(),
      ...floors.flat(),
    ]);

    fireEvent(this, "data-table-filter-changed", {
      value: this.value,
      items: this.type ? items : undefined,
    });
  }

  private _itemsWithoutArea(): string[] {
    if (this.type === "device") {
      return Object.values(this._devices)
        .filter((device) => !getDeviceAreaId(device, this._devices))
        .map((device) => device.id);
    }
    // Matches the area column of each table: the entities and helpers tables
    // give an entity without its own area the area of its device, the
    // automations, scripts and scenes tables only show the entity's own area
    const useDeviceArea = this.type === "entity";
    const entities = this._entities || [];
    const items = entities
      .filter(
        (entity) =>
          (this.includeDisabledEntities || !entity.disabled_by) &&
          !entity.area_id &&
          !(
            useDeviceArea &&
            entity.device_id &&
            this._devices[entity.device_id]?.area_id
          )
      )
      .map((entity) => entity.entity_id);
    // Entities without a registry entry can't have an area
    const registered = new Set(entities.map((entity) => entity.entity_id));
    for (const entityId of this._stateIds || []) {
      if (!registered.has(entityId)) {
        items.push(entityId);
      }
    }
    return items;
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
      filterPanelStyles,
      css`
        /* Only the list's own container scrolls, not the list as well */
        ha-list-selectable {
          display: flex;
          flex: 1;
          min-height: 0;
        }
        ha-list-selectable::part(base) {
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
