import { mdiPencil, mdiPencilOff, mdiPlus } from "@mdi/js";
import type { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { shouldHandleRequestSelectedEvent } from "../../../common/mwc/handle-request-selected-event";
import { navigate } from "../../../common/navigate";
import { stringCompare } from "../../../common/string/compare";
import "../../../components/ha-card";
import "../../../components/ha-fab";
import "../../../components/ha-button";
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
import { subscribeEntityRegistry } from "../../../data/entity_registry";
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
import { configSections } from "../ha-panel-config";
import { showHomeZoneDetailDialog } from "./show-dialog-home-zone-detail";
import { showZoneDetailDialog } from "./show-dialog-zone-detail";

@customElement("ha-config-zone")
export class HaConfigZone extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _searchParms = new URLSearchParams(window.location.search);

  @state() private _storageItems?: Zone[];

  @state() private _stateItems?: HassEntity[];

  @state() private _activeEntry = "";

  @state() private _canEditCore = false;

  @query("ha-locations-editor") private _map?: HaLocationsEditor;

  private _regEntities: string[] = [];

  private _getZones = memoizeOne(
    (storageItems: Zone[], stateItems: HassEntity[]): MarkerLocation[] => {
      const computedStyles = getComputedStyle(this);
      const zoneRadiusColor = computedStyles.getPropertyValue("--accent-color");
      const passiveRadiusColor = computedStyles.getPropertyValue(
        "--secondary-text-color"
      );
      const homeRadiusColor =
        computedStyles.getPropertyValue("--primary-color");

      const stateLocations: MarkerLocation[] = stateItems.map(
        (entityState) => ({
          id: entityState.entity_id,
          icon: entityState.attributes.icon,
          name: entityState.attributes.friendly_name || entityState.entity_id,
          latitude: entityState.attributes.latitude,
          longitude: entityState.attributes.longitude,
          radius: entityState.attributes.radius,
          radius_color:
            entityState.entity_id === "zone.home"
              ? homeRadiusColor
              : entityState.attributes.passive
                ? passiveRadiusColor
                : zoneRadiusColor,
          location_editable:
            entityState.entity_id === "zone.home" && this._canEditCore,
          radius_editable:
            entityState.entity_id === "zone.home" && this._canEditCore,
        })
      );
      const storageLocations: MarkerLocation[] = storageItems.map((zone) => ({
        ...zone,
        radius_color: zone.passive ? passiveRadiusColor : zoneRadiusColor,
        location_editable: true,
        radius_editable: true,
      }));
      return storageLocations.concat(stateLocations);
    }
  );

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeEntityRegistry(this.hass.connection!, (entities) => {
        this._regEntities = entities.map(
          (registryEntry) => registryEntry.entity_id
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
              <ha-button size="small" @click=${this._createZone}>
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
                    graphic="icon"
                    .hasMeta=${!this.narrow}
                    @request-selected=${this._itemClicked}
                    .value=${entry.id}
                    ?selected=${this._activeEntry === entry.id}
                  >
                    <ha-icon .icon=${entry.icon} slot="graphic"></ha-icon>
                    ${entry.name}
                    ${!this.narrow
                      ? html`
                          <div slot="meta">
                            <ha-icon-button
                              .id=${entry.id}
                              .entry=${entry}
                              @click=${this._openEditEntry}
                              .path=${mdiPencil}
                              .label=${`${hass.localize("ui.common.edit")} ${
                                entry.name
                              }`}
                            ></ha-icon-button>
                          </div>
                        `
                      : ""}
                  </ha-list-item>
                `
              )}
              ${this._stateItems.map(
                (stateObject) => html`
                  <ha-list-item
                    graphic="icon"
                    .id=${this.narrow ? stateObject.entity_id : ""}
                    .hasMeta=${!this.narrow ||
                    stateObject.entity_id !== "zone.home"}
                    .value=${stateObject.entity_id}
                    @request-selected=${this._stateItemClicked}
                    ?selected=${this._activeEntry === stateObject.entity_id}
                    .noEdit=${stateObject.entity_id !== "zone.home" ||
                    !this._canEditCore}
                  >
                    <ha-icon
                      .icon=${stateObject.attributes.icon}
                      slot="graphic"
                    >
                    </ha-icon>

                    ${stateObject.attributes.friendly_name ||
                    stateObject.entity_id}
                    ${this.narrow &&
                    stateObject.entity_id === "zone.home" &&
                    !this._canEditCore
                      ? nothing
                      : html`<ha-tooltip
                          slot="meta"
                          placement="left"
                          .content=${hass.localize(
                            "ui.panel.config.zone.configured_in_yaml"
                          )}
                          .disabled=${stateObject.entity_id === "zone.home"}
                          hoist
                        >
                          <ha-icon-button
                            .id=${!this.narrow ? stateObject.entity_id : ""}
                            .entityId=${stateObject.entity_id}
                            .noEdit=${stateObject.entity_id !== "zone.home" ||
                            !this._canEditCore}
                            .path=${stateObject.entity_id === "zone.home" &&
                            this._canEditCore
                              ? mdiPencil
                              : mdiPencilOff}
                            .label=${hass.localize("ui.common.edit_item", {
                              name: hass.config.location_name,
                            })}
                            @click=${this._editHomeZone}
                          ></ha-icon-button>
                        </ha-tooltip>`}
                  </ha-list-item>
                `
              )}
            </ha-list>
          `;

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .backPath=${this._searchParms.has("historyBack")
          ? undefined
          : "/config"}
        .tabs=${configSections.areas}
        has-fab
      >
        ${this.narrow
          ? html`
              <ha-config-section .isWide=${this.isWide}>
                <span slot="introduction">
                  ${hass.localize("ui.panel.config.zone.introduction")}
                </span>
                <ha-card outlined>${listBox}</ha-card>
              </ha-config-section>
            `
          : ""}
        ${!this.narrow
          ? html`
              <div class="flex">
                <ha-locations-editor
                  .hass=${this.hass}
                  .locations=${this._getZones(
                    this._storageItems,
                    this._stateItems
                  )}
                  @location-updated=${this._locationUpdated}
                  @radius-updated=${this._radiusUpdated}
                  @marker-clicked=${this._markerClicked}
                ></ha-locations-editor>
                <div class="overflow">${listBox}</div>
              </div>
            `
          : ""}
        <ha-fab
          slot="fab"
          .label=${hass.localize("ui.panel.config.zone.create_zone")}
          extended
          @click=${this._createZone}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
      </hass-tabs-subpage>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
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

  protected updated() {
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

  public willUpdate(changedProps: PropertyValues) {
    super.updated(changedProps);
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (oldHass && this._stateItems) {
      this._getStates(oldHass);
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

  private async _locationUpdated(ev: CustomEvent) {
    this._activeEntry = ev.detail.id;
    if (ev.detail.id === "zone.home" && this._canEditCore) {
      await saveCoreConfig(this.hass, {
        latitude: ev.detail.location[0],
        longitude: ev.detail.location[1],
      });
      return;
    }
    const entry = this._storageItems!.find((item) => item.id === ev.detail.id);
    if (!entry) {
      return;
    }
    this._updateEntry(entry, {
      latitude: ev.detail.location[0],
      longitude: ev.detail.location[1],
    });
  }

  private async _radiusUpdated(ev: CustomEvent) {
    this._activeEntry = ev.detail.id;
    if (ev.detail.id === "zone.home" && this._canEditCore) {
      await saveCoreConfig(this.hass, {
        radius: Math.round(ev.detail.radius),
      });
      return;
    }
    const entry = this._storageItems!.find((item) => item.id === ev.detail.id);
    if (!entry) {
      return;
    }
    this._updateEntry(entry, {
      radius: ev.detail.radius,
    });
  }

  private _markerClicked(ev: CustomEvent) {
    this._activeEntry = ev.detail.id;
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
    const entryId: string = (ev.currentTarget! as any).value;
    this._zoomZone(entryId);
    this._activeEntry = entryId;
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
    this._activeEntry = entryId;
  }

  private async _zoomZone(id: string) {
    this._map?.fitMarker(id);
  }

  private async _editZone(id: string) {
    await this.updateComplete;
    (this.shadowRoot?.querySelector(`[id="${id}"]`) as HTMLElement)?.click();
  }

  private _openEditEntry(ev: Event) {
    const entry: Zone = (ev.currentTarget! as any).entry;
    this._openDialog(entry);
    ev.stopPropagation();
  }

  private async _editHomeZone(ev) {
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
    this._activeEntry = created.id;
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
    this._activeEntry = entry.id;
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
