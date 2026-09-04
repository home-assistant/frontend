import { mdiPencil, mdiPencilOff, mdiPlus } from "@mdi/js";
import type { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { shouldHandleRequestSelectedEvent } from "../../../common/mwc/handle-request-selected-event";
import { navigate } from "../../../common/navigate";
import { stringCompare } from "../../../common/string/compare";
import { slugify } from "../../../common/string/slugify";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import "../../../components/ha-list";
import "../../../components/ha-list-item";
import "../../../components/ha-svg-icon";
import "../../../components/ha-tooltip";
import "../../../components/map/ha-locations-editor";
import type {
  HaLocationsEditor,
  MarkerLocation,
} from "../../../components/map/ha-locations-editor";
import { saveCoreConfig } from "../../../data/core";
import { subscribeEntityRegistry } from "../../../data/entity/entity_registry";
import {
  subscribeEntityMapColors,
  zoneColor,
} from "../../../common/map/entity-map-colors";
import {
  contrastingZoneContent,
  zoneInitials,
  zoneMarkerStyles,
} from "../../../common/map/zone-marker";
import type {
  HomeZoneMutableParams,
  Zone,
  ZoneMutableParams,
} from "../../../data/zone";
import {
  createZone,
  deleteZone,
  fetchZones,
  updateZone,
} from "../../../data/zone";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-tabs-subpage";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import type { HomeAssistant, Route } from "../../../types";
import "../ha-config-section";
import { configSections } from "../config-sections";
import { showHomeZoneDetailDialog } from "./show-dialog-home-zone-detail";
import { showZoneDetailDialog } from "./show-dialog-zone-detail";

interface PendingEdit {
  latitude?: number;
  longitude?: number;
  radius?: number;
}

// How close the saved value must come to a pending one to count as saved
const PENDING_TOLERANCE: Record<keyof PendingEdit, number> = {
  latitude: 1e-7,
  longitude: 1e-7,
  radius: 0.5,
};

@customElement("ha-config-zone")
export class HaConfigZone extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _storageItems?: Zone[];

  @state() private _stateItems?: HassEntity[];

  // Values dragged on the map, shown until the saved data reflects them, so
  // a re-render while the save is in flight does not move the marker back.
  // A failed save drops them and the marker returns to the saved values.
  @state() private _pendingEdits: Record<string, PendingEdit> = {};

  @state() private _canEditCore = false;

  @query("ha-locations-editor") private _map?: HaLocationsEditor;

  private _regEntities: string[] = [];

  // Storage zone id (its unique id) to entity id
  @state() private _zoneEntityIds: Record<string, string> = {};

  // Bumped when entity map colors change to recompute the memoized locations
  @state() private _colorVersion = 0;

  // The zone as it looks on the map: its color, with its icon or initials
  private _renderZoneGraphic(
    entityId: string,
    passive: boolean,
    icon: string | undefined,
    name: string
  ) {
    const color = zoneColor(entityId, passive, getComputedStyle(this));
    return html`
      <div
        slot="graphic"
        class="zone-avatar"
        style=${styleMap({
          background: color,
          color: contrastingZoneContent(color),
        })}
      >
        ${icon ? html`<ha-icon .icon=${icon}></ha-icon>` : zoneInitials(name)}
      </div>
    `;
  }

  private _getZones = memoizeOne(
    (
      storageItems: Zone[],
      stateItems: HassEntity[],
      zoneEntityIds: Record<string, string>,
      pendingEdits: Record<string, PendingEdit>,
      _colorVersion: number
    ): MarkerLocation[] => {
      const computedStyles = getComputedStyle(this);

      const stateLocations: MarkerLocation[] = stateItems.map(
        (entityState) => ({
          id: entityState.entity_id,
          icon: entityState.attributes.icon,
          name: entityState.attributes.friendly_name || entityState.entity_id,
          latitude: entityState.attributes.latitude,
          longitude: entityState.attributes.longitude,
          radius: entityState.attributes.radius,
          ...pendingEdits[entityState.entity_id],
          radius_color: zoneColor(
            entityState.entity_id,
            !!entityState.attributes.passive,
            computedStyles
          ),
          location_editable:
            entityState.entity_id === "zone.home" && this._canEditCore,
          radius_editable:
            entityState.entity_id === "zone.home" && this._canEditCore,
        })
      );
      const storageLocations: MarkerLocation[] = storageItems.map((zone) => ({
        ...zone,
        ...pendingEdits[zone.id],
        radius_color: zoneColor(
          zoneEntityIds[zone.id] ?? `zone.${zone.id}`,
          !!zone.passive,
          computedStyles
        ),
        location_editable: true,
        radius_editable: true,
      }));
      return storageLocations.concat(stateLocations);
    }
  );

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeEntityMapColors(this.hass.connection!, () => {
        this._colorVersion++;
      }),
      subscribeEntityRegistry(this.hass.connection!, (entities) => {
        this._regEntities = entities.map(
          (registryEntry) => registryEntry.entity_id
        );
        this._zoneEntityIds = Object.fromEntries(
          entities
            .filter((registryEntry) => registryEntry.platform === "zone")
            .map((registryEntry) => [
              registryEntry.unique_id,
              registryEntry.entity_id,
            ])
        );
        this._filterStates();
      }),
    ];
  }

  protected render(): TemplateResult {
    if (
      !this.hass ||
      this._storageItems === undefined ||
      this._stateItems === undefined
    ) {
      return html`<hass-loading-screen></hass-loading-screen>`;
    }
    const hass = this.hass;
    const listBox =
      this._storageItems.length === 0 && this._stateItems.length === 0
        ? html`
            <div class="empty">
              ${hass.localize("ui.panel.config.zone.no_zones_created_yet")}
              <br />
              <ha-button size="s" @click=${this._createZone}>
                ${hass.localize("ui.panel.config.zone.create_zone")}</ha-button
              >
            </div>
          `
        : html`
            <ha-list>
              ${this._storageItems.map(
                (entry) => html`
                  <ha-list-item
                    .entry=${entry}
                    .id=${this.narrow ? entry.id : ""}
                    graphic="avatar"
                    .hasMeta=${!this.narrow}
                    @request-selected=${this._itemClicked}
                    .value=${entry.id}
                  >
                    ${this._renderZoneGraphic(
                      this._zoneEntityIds[entry.id] ?? `zone.${entry.id}`,
                      !!entry.passive,
                      entry.icon,
                      entry.name
                    )}
                    ${entry.name}
                    ${
                      !this.narrow
                        ? html`
                            <div slot="meta">
                              <ha-icon-button
                                .id=${entry.id}
                                .entry=${entry}
                                @click=${this._openEditEntry}
                                .path=${mdiPencil}
                                .label=${hass.localize("ui.common.edit_item", {
                                  name: entry.name,
                                })}
                              ></ha-icon-button>
                            </div>
                          `
                        : ""
                    }
                  </ha-list-item>
                `
              )}
              ${this._stateItems.map(
                (stateObject) => html`
                  <ha-list-item
                    graphic="avatar"
                    .id=${this.narrow ? stateObject.entity_id : ""}
                    .hasMeta=${
                      !this.narrow || stateObject.entity_id !== "zone.home"
                    }
                    .value=${stateObject.entity_id}
                    @request-selected=${this._stateItemClicked}
                    .noEdit=${
                      stateObject.entity_id !== "zone.home" ||
                      !this._canEditCore
                    }
                  >
                    ${this._renderZoneGraphic(
                      stateObject.entity_id,
                      !!stateObject.attributes.passive,
                      stateObject.attributes.icon,
                      stateObject.attributes.friendly_name ||
                        stateObject.entity_id
                    )}
                    ${
                      stateObject.attributes.friendly_name ||
                      stateObject.entity_id
                    }
                    ${
                      this.narrow &&
                      stateObject.entity_id === "zone.home" &&
                      !this._canEditCore
                        ? nothing
                        : html`<ha-icon-button
                              .id="zone-${slugify(stateObject.entity_id)}"
                              .entityId=${stateObject.entity_id}
                              .noEdit=${
                                stateObject.entity_id !== "zone.home" ||
                                !this._canEditCore
                              }
                              .path=${
                                stateObject.entity_id === "zone.home" &&
                                this._canEditCore
                                  ? mdiPencil
                                  : mdiPencilOff
                              }
                              .label=${hass.localize("ui.common.edit_item", {
                                name: hass.config.location_name,
                              })}
                              @click=${this._editHomeZone}
                              slot="meta"
                            ></ha-icon-button>
                            <ha-tooltip
                              .for="zone-${slugify(stateObject.entity_id)}"
                              placement="left"
                              .disabled=${stateObject.entity_id === "zone.home"}
                              hoist
                            >
                              ${hass.localize(
                                "ui.panel.config.zone.configured_in_yaml"
                              )}
                            </ha-tooltip>`
                    }
                  </ha-list-item>
                `
              )}
            </ha-list>
          `;

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .route=${this.route}
        back-path="/config"
        .tabs=${configSections.areas}
        has-fab
      >
        ${
          this.narrow
            ? html`
                <ha-config-section .isWide=${this.isWide}>
                  <span slot="introduction">
                    ${hass.localize("ui.panel.config.zone.introduction")}
                  </span>
                  <ha-card outlined>${listBox}</ha-card>
                </ha-config-section>
              `
            : ""
        }
        ${
          !this.narrow
            ? html`
                <div class="flex">
                  <ha-locations-editor
                    .locations=${this._getZones(
                      this._storageItems,
                      this._stateItems,
                      this._zoneEntityIds,
                      this._pendingEdits,
                      this._colorVersion
                    )}
                    @location-updated=${this._locationUpdated}
                    @radius-updated=${this._radiusUpdated}
                  ></ha-locations-editor>
                  <div class="overflow">${listBox}</div>
                </div>
              `
            : ""
        }
        <ha-button slot="fab" size="l" @click=${this._createZone}>
          <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
          ${hass.localize("ui.panel.config.zone.create_zone")}
        </ha-button>
      </hass-tabs-subpage>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    this._canEditCore =
      Boolean(this.hass.user?.is_admin) &&
      ["storage", "default"].includes(this.hass.config.config_source);
    this._fetchData();
    if (this.route.path === "/new") {
      navigate("/config/zone", { replace: true });
      this._createZone();
    }
  }

  protected updated(changedProps: PropertyValues<this>) {
    super.updated(changedProps);
    if (
      !this.route.path.startsWith("/edit/") ||
      !this._stateItems ||
      !this._storageItems
    ) {
      return;
    }
    const id = this.route.path.slice(6);
    this._editZone(id);
    navigate("/config/zone", { replace: true });
    if (this.narrow) {
      return;
    }
    this._zoomZone(id);
  }

  public willUpdate(changedProps: PropertyValues<this>) {
    super.willUpdate(changedProps);
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (oldHass && this._stateItems) {
      this._getStates(oldHass);
    }
    // Zone colors come from theme variables
    if (oldHass && oldHass.themes !== this.hass.themes) {
      this._colorVersion++;
    }
    this._settlePendingEdits();
  }

  // A pending edit is done once the saved data carries its values
  private _settlePendingEdits() {
    for (const [id, pending] of Object.entries(this._pendingEdits)) {
      const saved =
        this._storageItems?.find((zone) => zone.id === id) ??
        this.hass.states[id]?.attributes;
      if (
        saved &&
        (Object.keys(pending) as (keyof PendingEdit)[]).every(
          (key) =>
            Math.abs((saved[key] as number) - pending[key]!) <
            PENDING_TOLERANCE[key]
        )
      ) {
        this._dropPendingEdit(id);
      }
    }
  }

  private _dropPendingEdit(id: string) {
    const { [id]: _done, ...rest } = this._pendingEdits;
    this._pendingEdits = rest;
  }

  // Saves for one zone run in order, so each sees the entry the previous one
  // produced and a failure only drops the values its own request carried
  private _saveQueue: Record<string, Promise<void>> = {};

  private _saveEdit(id: string, pending: PendingEdit): Promise<void> {
    this._pendingEdits = {
      ...this._pendingEdits,
      [id]: { ...this._pendingEdits[id], ...pending },
    };
    const save = (this._saveQueue[id] ?? Promise.resolve()).then(() =>
      this._performSave(id, pending)
    );
    this._saveQueue[id] = save;
    return save;
  }

  private async _performSave(id: string, pending: PendingEdit) {
    try {
      if (id === "zone.home") {
        await saveCoreConfig(this.hass, pending);
        return;
      }
      const entry = this._storageItems!.find((item) => item.id === id);
      if (entry) {
        await this._updateEntry(entry, pending);
      }
    } catch (err: any) {
      // The saved values are the truth again for what this request changed;
      // a later edit of other values stays pending for its own save
      this._dropPendingValues(id, pending);
      showAlertDialog(this, {
        title: this.hass.localize("ui.panel.config.zone.can_not_edit"),
        text: err.message,
      });
    }
  }

  private _dropPendingValues(id: string, failed: PendingEdit) {
    const current = this._pendingEdits[id];
    if (!current) {
      return;
    }
    const rest = Object.fromEntries(
      Object.entries(current).filter(
        ([key, value]) => failed[key as keyof PendingEdit] !== value
      )
    ) as PendingEdit;
    if (Object.keys(rest).length) {
      this._pendingEdits = { ...this._pendingEdits, [id]: rest };
    } else {
      this._dropPendingEdit(id);
    }
  }

  private async _fetchData() {
    this._storageItems = (await fetchZones(this.hass!)).sort((ent1, ent2) =>
      stringCompare(ent1.name, ent2.name, this.hass!.locale.language)
    );
    this._getStates();
  }

  private _getStates(oldHass?: HomeAssistant) {
    let changed = false;
    const tempStates = Object.values(this.hass!.states).filter((entity) => {
      if (computeStateDomain(entity) !== "zone") {
        return false;
      }
      if (oldHass?.states[entity.entity_id] !== entity) {
        changed = true;
      }
      if (this._regEntities.includes(entity.entity_id)) {
        return false;
      }
      return true;
    });

    if (changed) {
      this._stateItems = tempStates;
    }
  }

  private _filterStates() {
    if (!this._stateItems) {
      return;
    }
    const tempStates = this._stateItems.filter(
      (entity) => !this._regEntities.includes(entity.entity_id)
    );
    if (tempStates.length !== this._stateItems.length) {
      this._stateItems = tempStates;
    }
  }

  private _locationUpdated(ev: CustomEvent) {
    this._saveEdit(ev.detail.id, {
      latitude: ev.detail.location[0],
      longitude: ev.detail.location[1],
    });
  }

  private _radiusUpdated(ev: CustomEvent) {
    this._saveEdit(ev.detail.id, {
      radius:
        ev.detail.id === "zone.home"
          ? Math.round(ev.detail.radius)
          : ev.detail.radius,
    });
  }

  private _createZone() {
    this._openDialog();
  }

  private _itemClicked(ev: CustomEvent) {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }

    if (this.narrow) {
      this._openEditEntry(ev);
      return;
    }
    this._zoomZone((ev.currentTarget! as any).value);
  }

  private _stateItemClicked(ev: CustomEvent) {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }

    const entryId: string = (ev.currentTarget! as any).value;

    if (this.narrow && entryId === "zone.home") {
      this._editHomeZone(ev);
      return;
    }

    this._zoomZone(entryId);
  }

  private async _zoomZone(id: string) {
    this._map?.fitMarker(id);
  }

  private async _editZone(id: string) {
    await this.updateComplete;
    // eslint-disable-next-line lit/prefer-query-decorators
    (this.shadowRoot?.querySelector(`[id="${id}"]`) as HTMLElement)?.click();
  }

  private _openEditEntry(ev: Event) {
    const entry: Zone = (ev.currentTarget! as any).entry;
    this._openDialog(entry);
    ev.stopPropagation();
  }

  private async _editHomeZone(ev) {
    // Keep the click from selecting the list item, which zooms the map
    ev.stopPropagation();
    if (ev.currentTarget.noEdit) {
      showAlertDialog(this, {
        title: this.hass.localize("ui.panel.config.zone.can_not_edit"),
        text: this.hass.localize("ui.panel.config.zone.configured_in_yaml"),
      });
      return;
    }
    showHomeZoneDetailDialog(this, {
      updateEntry: (values) => this._updateHomeZoneEntry(values),
    });
  }

  private async _createEntry(values: ZoneMutableParams) {
    const created = await createZone(this.hass!, values);
    this._storageItems = this._storageItems!.concat(created).sort(
      (ent1, ent2) =>
        stringCompare(ent1.name, ent2.name, this.hass!.locale.language)
    );
    if (this.narrow) {
      return;
    }
    await this.updateComplete;
    await this._map?.updateComplete;
    this._map?.fitMarker(created.id);
  }

  private async _updateHomeZoneEntry(values: HomeZoneMutableParams) {
    await saveCoreConfig(this.hass, {
      latitude: values.latitude,
      longitude: values.longitude,
      radius: values.radius,
    });
    this._zoomZone("zone.home");
  }

  private async _updateEntry(
    entry: Zone,
    values: Partial<ZoneMutableParams>,
    fitMap = false
  ) {
    const updated = await updateZone(this.hass!, entry!.id, values);
    this._storageItems = this._storageItems!.map((ent) =>
      ent === entry ? updated : ent
    );
    if (this.narrow || !fitMap) {
      return;
    }
    await this.updateComplete;
    await this._map?.updateComplete;
    this._map?.fitMarker(entry.id);
  }

  private async _removeEntry(entry: Zone) {
    if (
      !(await showConfirmationDialog(this, {
        title: this.hass!.localize("ui.panel.config.zone.confirm_delete"),
        dismissText: this.hass!.localize("ui.common.cancel"),
        confirmText: this.hass!.localize("ui.common.delete"),
        destructive: true,
      }))
    ) {
      return false;
    }

    try {
      await deleteZone(this.hass!, entry!.id);
      this._storageItems = this._storageItems!.filter((ent) => ent !== entry);
      if (!this.narrow) {
        this._map?.fitMap();
      }
      return true;
    } catch (_err: any) {
      return false;
    }
  }

  private async _openDialog(entry?: Zone) {
    showZoneDetailDialog(this, {
      entry,
      entityId: entry ? this._zoneEntityIds[entry.id] : undefined,
      createEntry: (values) => this._createEntry(values),
      updateEntry: entry
        ? (values) => this._updateEntry(entry, values, true)
        : undefined,
      removeEntry: entry ? () => this._removeEntry(entry) : undefined,
    });
  }

  static styles = css`
    hass-loading-screen {
      --app-header-background-color: var(--sidebar-background-color);
      --app-header-text-color: var(--sidebar-text-color);
    }
    ha-list-item {
      --mdc-list-item-meta-size: 48px;
    }
    a {
      color: var(--primary-color);
    }
    ha-card {
      margin: 16px auto;
      overflow: hidden;
    }
    ha-icon,
    ha-icon-button:not([disabled]) {
      color: var(--secondary-text-color);
    }
    .zone-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: var(--ha-font-weight-medium);
    }
    .zone-avatar ha-icon {
      color: inherit;
      filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.4));
    }
    ha-icon-button {
      --mdc-theme-text-disabled-on-light: var(--disabled-text-color);
    }
    .empty {
      text-align: center;
      padding: 8px;
    }
    .flex {
      display: flex;
      height: 100%;
    }
    .overflow {
      height: 100%;
      overflow: auto;
    }
    ha-locations-editor {
      flex-grow: 1;
      height: 100%;
    }
    .flex ha-list {
      padding-bottom: 64px;
    }
    .flex ha-list,
    .flex .empty {
      border-left: 1px solid var(--divider-color);
      width: 250px;
      min-height: 100%;
      box-sizing: border-box;
    }
    ha-tooltip {
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-zone": HaConfigZone;
  }
}
