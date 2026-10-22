import {
  mdiClose,
  mdiDevices,
  mdiHome,
  mdiLabel,
  mdiMinus,
  mdiMinusBox,
  mdiSwapHorizontal,
  mdiTextureBox,
} from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  html,
  LitElement,
  nothing,
  type PropertyValues,
  type TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { live } from "lit/directives/live";
import memoizeOne from "memoize-one";
import { consume } from "../../common/decorators/consume";
import type { HASSDomTargetEvent } from "../../common/dom/fire_event";
import { fireEvent } from "../../common/dom/fire_event";
import { stopPropagation } from "../../common/dom/stop_propagation";
import { computeAreaName } from "../../common/entity/compute_area_name";
import {
  computeDeviceName,
  computeDeviceNameDisplay,
} from "../../common/entity/compute_device_name";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeEntityPickerDisplay } from "../../common/entity/compute_entity_name_display";
import { getDeviceArea } from "../../common/entity/context/get_device_context";
import { computeRTL } from "../../common/util/compute_rtl";
import type { AreaRegistryEntry } from "../../data/area/area_registry";
import { getConfigEntry } from "../../data/config_entries";
import { labelsContext } from "../../data/context";
import type {
  DeviceCompositeSplits,
  DeviceRegistryEntry,
} from "../../data/device/device_registry";
import type { HaEntityPickerEntityFilterFunc } from "../../data/entity/entity";
import type { FloorRegistryEntry } from "../../data/floor_registry";
import { domainToName } from "../../data/integration";
import type { LabelRegistryEntry } from "../../data/label/label_registry";
import {
  deviceMeetsFilter,
  extractFromTarget,
  type ExtractFromTargetResult,
  type ExtractFromTargetResultReferenced,
  type TargetItem,
  type TargetType,
} from "../../data/target";
import { showMoreInfoDialog } from "../../dialogs/more-info/show-ha-more-info-dialog";
import type { HomeAssistant } from "../../types";
import { brandsUrl } from "../../util/brands-url";
import type { HaDevicePickerDeviceFilterFunc } from "../device/ha-device-picker";
import { floorDefaultIconPath } from "../ha-floor-icon";
import "../ha-button";
import "../ha-checkbox";
import type { HaCheckbox } from "../ha-checkbox";
import "../ha-icon-button";
import "../ha-icon-next";
import "../ha-label";
import "../ha-state-icon";
import "../ha-svg-icon";
import "../item/ha-list-item-base";
import "../item/ha-list-item-button";
import { computeTargetSubRows } from "./compute-target-sub-rows";
import { filterTargetEntries } from "./filter-target-entries";
import {
  buildTargetRow,
  targetRowState,
  type TargetExclusion,
  type TargetRow,
} from "./target-exclusions";

@customElement("ha-target-picker-item-row")
export class HaTargetPickerItemRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ reflect: true }) public type!: TargetType;

  @property({ attribute: "item-id" }) public itemId!: string;

  @property({ type: Boolean }) public expand = false;

  @property({ type: Boolean, attribute: "sub-entry", reflect: true })
  public subEntry = false;

  @property({ attribute: false })
  public subLevel = 0;

  @property({ type: Boolean, attribute: "hide-context" })
  public hideContext = false;

  @property({ attribute: false })
  public parentEntries?: ExtractFromTargetResultReferenced;

  @property({ attribute: false })
  public deviceFilter?: HaDevicePickerDeviceFilterFunc;

  @property({ attribute: false })
  public entityFilter?: HaEntityPickerEntityFilterFunc;

  /**
   * Entities that pass the filters the page currently has on. Narrows the
   * count, and the target details, but not what the target resolves to.
   */
  @property({ attribute: false })
  public activeFilter?: (entityId: string) => boolean;

  /**
   * Show only targets with entities from specific domains.
   * @type {Array}
   * @attr include-domains
   */
  @property({ type: Array, attribute: "include-domains" })
  public includeDomains?: string[];

  /**
   * Show only targets with entities of these device classes.
   * @type {Array}
   * @attr include-device-classes
   */
  @property({ type: Array, attribute: "include-device-classes" })
  public includeDeviceClasses?: string[];

  @property({ type: Boolean, attribute: "primary-entities-only" })
  public primaryEntitiesOnly?: boolean;

  @property({ attribute: false })
  public compositeSplits?: DeviceCompositeSplits;

  /**
   * Render this row as an exclusion: muted, with a minus in front and a
   * button to remove it, instead of as something the target includes.
   */
  @property({ type: Boolean, reflect: true })
  public exclusion = false;

  /** On an exclusion row: how many entities it takes out of the row above. */
  @property({ attribute: false })
  public removedCount?: number;

  /**
   * On a target row: the exclusions that take entities out of it. In the
   * target details, every row gets the target's exclusions, as they are
   * being edited.
   */
  @property({ attribute: false })
  public exclusions?: TargetExclusion[];

  /** In the target details: rows get a checkbox to exclude what they hold. */
  @property({ type: Boolean })
  public selectable = false;

  @state() private _iconImg?: string;

  @state() private _domainName?: string;

  @state() private _entries?: ExtractFromTargetResult;

  @state()
  @consume({ context: labelsContext, subscribe: true })
  _labelRegistry?: LabelRegistryEntry[];

  private _loadedConfigEntryId?: string;

  protected willUpdate(changedProps: PropertyValues<this>) {
    if (!this.subEntry && !this.exclusion && changedProps.has("itemId")) {
      this._updateItemData();
    }
    if (
      changedProps.has("itemId") ||
      changedProps.has("type") ||
      changedProps.has("hass")
    ) {
      this._updateDomain();
    }
  }

  private _updateDomain() {
    if (this.type === "entity") {
      this._setDomainName(computeDomain(this.itemId));
      return;
    }
    if (this.type !== "device") {
      return;
    }
    const configEntryId =
      this.hass.devices?.[this.itemId]?.primary_config_entry;
    if (configEntryId && configEntryId !== this._loadedConfigEntryId) {
      this._loadedConfigEntryId = configEntryId;
      this._getDeviceDomain(configEntryId);
    }
  }

  private _targetRow = memoizeOne(
    (
      type: TargetType,
      itemId: string,
      entries: ExtractFromTargetResultReferenced | undefined,
      entityRegistry: HomeAssistant["entities"],
      devices: HomeAssistant["devices"]
    ): TargetRow =>
      buildTargetRow(type, itemId, entries, entityRegistry, devices)
  );

  protected render() {
    if (this.type === "label" && !this._labelRegistry) {
      return nothing;
    }
    if (this.exclusion) {
      return this._renderExclusion();
    }
    const { name, context, iconPath, fallbackIconPath, stateObject, notFound } =
      this._itemData(this.type, this.itemId);

    const replacement =
      this.type === "device" && notFound
        ? this._getReplacement(this.itemId)
        : undefined;
    // Only surface the "replaced" state when there is at least one available
    // replacement device to migrate to. If every replacement device was
    // deleted (or filtered out), fall back to the plain "not found" state.
    const canMigrate = !!replacement?.candidates.length;

    const showEntities = this.type !== "entity" && !notFound;

    const entries = this.parentEntries || this._entries;

    // Don't show sub entries that have no entities
    if (
      this.subEntry &&
      this.type !== "entity" &&
      (!entries || entries.referenced_entities.length === 0)
    ) {
      return nothing;
    }

    const replaceable = !this.subEntry && !this.expand;

    const isOut = this._isOut(this.exclusions);
    const rowEntities =
      this.type === "entity" ? [this.itemId] : entries?.referenced_entities;
    const fullyOut = !!rowEntities?.length && rowEntities.every(isOut);
    const rowState =
      this.selectable && rowEntities?.length
        ? targetRowState(
            this._targetRow(
              this.type,
              this.itemId,
              entries,
              this.hass.entities,
              this.hass.devices
            ),
            !this.subEntry,
            this.exclusions ?? []
          )
        : undefined;
    const excludedBy = rowState
      ? rowState.lockedBy
      : this.subEntry && fullyOut
        ? this._excludedBy(rowEntities!)
        : [];

    const content = html`
      <div class="icon" slot="start">
        ${this._renderIcon(
          {
            iconPath,
            fallbackIconPath: canMigrate ? mdiSwapHorizontal : fallbackIconPath,
            stateObject,
          },
          { type: this.type, id: this.itemId }
        )}
      </div>

      <span slot="headline" class=${classMap({ out: fullyOut })}
        >${
          canMigrate
            ? this.hass.localize(
                "ui.components.target-picker.device_replaced_headline"
              )
            : name
        }</span
      >
      ${
        notFound || (context && !this.hideContext)
          ? html`<span slot="supporting-text"
              >${
                notFound
                  ? canMigrate
                    ? replacement!.candidates.length === 1 && replacement!.name
                      ? this.hass.localize(
                          "ui.components.target-picker.device_replaced_by_one",
                          { device: replacement!.name }
                        )
                      : this.hass.localize(
                          "ui.components.target-picker.device_replaced",
                          { count: replacement!.candidates.length }
                        )
                    : this.hass.localize(
                        `ui.components.target-picker.${this.type}_not_found`
                      )
                  : context
              }</span
            >`
          : nothing
      }
      ${
        excludedBy.length
          ? html`<span slot="supporting-text" class="excluded-by">
              ${this.hass.localize("ui.components.target-picker.excluded_by")}
              ${excludedBy.map((item) => this._renderExcludedBy(item))}
            </span>`
          : stateObject && this.subEntry
            ? html`<span slot="supporting-text" class="state"
                >${this.hass.formatEntityState(stateObject)}</span
              >`
            : nothing
      }
      ${
        !this.subEntry && entries && showEntities
          ? html`
              <div slot="end" class="summary">
                ${
                  this.expand || !entries.referenced_entities.length
                    ? html`<span class="main">
                        ${this._entitiesLabel(entries, isOut)}
                      </span>`
                    : html`<ha-button
                        appearance="filled"
                        variant="brand"
                        size="xs"
                        @click=${this._openDetails}
                      >
                        ${this._entitiesLabel(entries, isOut)}
                      </ha-button>`
                }
              </div>
            `
          : nothing
      }
      ${
        canMigrate
          ? html`
              <ha-button
                class="migrate"
                slot="end"
                appearance="plain"
                variant="warning"
                size="s"
                @click=${this._migrate}
              >
                ${this.hass.localize(
                  "ui.components.target-picker.replace_update"
                )}
              </ha-button>
            `
          : nothing
      }
      ${
        !this.expand && !this.subEntry
          ? html`
              <ha-icon-button
                .path=${mdiClose}
                slot="end"
                @click=${this._removeItem}
              ></ha-icon-button>
            `
          : this.subEntry && this.type === "entity"
            ? html` <ha-icon-next slot="end"></ha-icon-next> `
            : nothing
      }
      ${
        rowState
          ? html`<ha-checkbox
              slot="end"
              .checked=${live(rowState.checked)}
              .indeterminate=${live(rowState.indeterminate)}
              .disabled=${rowState.disabled}
              .title=${name}
              @change=${this._selectionChanged}
              @click=${stopPropagation}
            ></ha-checkbox>`
          : nothing
      }
    `;

    let item: TemplateResult;

    if (replaceable || (this.subEntry && this.type === "entity")) {
      item = html`
        <ha-list-item-button
          class=${classMap({
            error: notFound,
            replaceable,
          })}
          @click=${
            replaceable
              ? this._replaceItem
              : this.subEntry && this.type === "entity"
                ? this._openMoreInfo
                : undefined
          }
        >
          ${content}
        </ha-list-item-button>
      `;
    } else {
      item = html`
        <ha-list-item-base
          class=${classMap({
            error: notFound,
          })}
        >
          ${content}
        </ha-list-item-base>
      `;
    }

    return html`
      ${item}
      ${
        this.expand && entries && entries.referenced_entities
          ? this._renderEntries()
          : nothing
      }
    `;
  }

  private _isOut = memoizeOne(
    (exclusions?: TargetExclusion[]): ((entityId: string) => boolean) => {
      const removed = new Set(
        exclusions?.flatMap((exclusion) => exclusion.removed)
      );
      return (entityId) => removed.has(entityId);
    }
  );

  private _excludedBy(entityIds: string[]): TargetItem[] {
    const entities = new Set(entityIds);
    return (this.exclusions ?? [])
      .filter((exclusion) =>
        exclusion.removed.some((entityId) => entities.has(entityId))
      )
      .map(({ type, id }) => ({ type, id }));
  }

  private _renderExcludedBy(item: TargetItem) {
    const itemData = this._itemData(item.type, item.id);
    return html`<ha-label dense>
      ${this._renderIcon(itemData, item, "icon")} ${itemData.name}
    </ha-label>`;
  }

  private _entitiesLabel(
    entries: ExtractFromTargetResultReferenced,
    isOut: (entityId: string) => boolean
  ): string {
    const remaining = entries.referenced_entities.filter(
      (entityId) => !isOut(entityId)
    );
    const excluded = entries.referenced_entities.length - remaining.length;
    const total = remaining.length;
    const count = this.activeFilter
      ? remaining.filter(this.activeFilter).length
      : total;
    if (excluded) {
      return this.activeFilter
        ? this.hass.localize(
            "ui.components.target-picker.entities_count_filtered_excluded",
            { count, total, excluded }
          )
        : this.hass.localize(
            "ui.components.target-picker.entities_count_excluded",
            { count, excluded }
          );
    }
    return this.activeFilter
      ? this.hass.localize(
          "ui.components.target-picker.entities_count_filtered",
          { count, total }
        )
      : this.hass.localize("ui.components.target-picker.entities_count", {
          count,
        });
  }

  private _renderIcon(
    {
      iconPath,
      fallbackIconPath,
      stateObject,
    }: {
      iconPath?: string | null;
      fallbackIconPath?: string;
      stateObject?: HassEntity;
    },
    item: TargetItem,
    slot?: string
  ) {
    const ownItem = item.type === this.type && item.id === this.itemId;
    if (iconPath) {
      return html`<ha-icon
        slot=${ifDefined(slot)}
        .icon=${iconPath}
      ></ha-icon>`;
    }
    if (ownItem && this._iconImg) {
      return html`<img
        slot=${ifDefined(slot)}
        alt=${this._domainName || ""}
        crossorigin="anonymous"
        referrerpolicy="no-referrer"
        src=${this._iconImg}
      />`;
    }
    if (fallbackIconPath) {
      return html`<ha-svg-icon
        slot=${ifDefined(slot)}
        .path=${fallbackIconPath}
      ></ha-svg-icon>`;
    }
    if (item.type === "entity") {
      return html`<ha-state-icon
        slot=${ifDefined(slot)}
        .stateObj=${
          stateObject || ({ entity_id: item.id, attributes: {} } as HassEntity)
        }
      ></ha-state-icon>`;
    }
    return nothing;
  }

  private _renderExclusion() {
    const { name, context, iconPath, fallbackIconPath, stateObject, notFound } =
      this._itemData(this.type, this.itemId);

    return html`
      <ha-list-item-base class="exclusion">
        <ha-svg-icon slot="start" class="minus" .path=${mdiMinus}></ha-svg-icon>
        <div class="icon" slot="start">
          ${this._renderIcon(
            { iconPath, fallbackIconPath, stateObject },
            { type: this.type, id: this.itemId }
          )}
        </div>
        <span slot="headline"
          ><span class="visually-hidden"
            >${this.hass.localize("ui.components.target-picker.excluded")}
          </span>
          ${name}</span
        >
        ${
          notFound || context
            ? html`<span slot="supporting-text"
                >${
                  notFound
                    ? this.hass.localize(
                        `ui.components.target-picker.${this.type}_not_found`
                      )
                    : context
                }</span
              >`
            : nothing
        }
        ${
          this.removedCount
            ? html`<span slot="end" class="removed">
                ${this.hass.localize(
                  "ui.components.target-picker.removes_count",
                  { count: this.removedCount }
                )}
              </span>`
            : nothing
        }
        <ha-icon-button
          slot="end"
          .path=${mdiClose}
          .label=${this.hass.localize(
            "ui.components.target-picker.remove_exclusion"
          )}
          @click=${this._removeExclusion}
        ></ha-icon-button>
      </ha-list-item-base>
    `;
  }

  private _renderEntries() {
    const entries = this.parentEntries || this._entries;

    if (!entries || entries.referenced_entities.length === 0) {
      return this._renderEmptyEntries();
    }

    const {
      nextType,
      rows,
      rowEntries,
      deviceRows,
      deviceRowEntries,
      entityRows,
    } = computeTargetSubRows(
      this.type,
      this.itemId,
      entries,
      this.hass.entities,
      this.hass.devices
    );

    const nextSubLevel = this.subLevel + 1;

    return html`
      ${rows.map(
        (itemId, index) => html`
          <ha-target-picker-item-row
            sub-entry
            .subLevel=${nextSubLevel}
            style=${`--sub-entry-indent: calc(${nextSubLevel} * var(--ha-space-10));`}
            .hass=${this.hass}
            .type=${nextType}
            .itemId=${itemId}
            .parentEntries=${rowEntries?.[index]}
            .hideContext=${this.hideContext || this.type !== "label"}
            .selectable=${this.selectable}
            .exclusions=${this.exclusions}
            expand
          ></ha-target-picker-item-row>
        `
      )}
      ${deviceRows.map(
        (itemId, index) => html`
          <ha-target-picker-item-row
            sub-entry
            .subLevel=${nextSubLevel}
            style=${`--sub-entry-indent: calc(${nextSubLevel} * var(--ha-space-10));`}
            .hass=${this.hass}
            type="device"
            .itemId=${itemId}
            .parentEntries=${deviceRowEntries?.[index]}
            .hideContext=${this.hideContext || this.type !== "label"}
            .selectable=${this.selectable}
            .exclusions=${this.exclusions}
            expand
          ></ha-target-picker-item-row>
        `
      )}
      ${entityRows.map(
        (itemId) => html`
          <ha-target-picker-item-row
            sub-entry
            .subLevel=${nextSubLevel}
            style=${`--sub-entry-indent: calc(${nextSubLevel} * var(--ha-space-10));`}
            .hass=${this.hass}
            type="entity"
            .itemId=${itemId}
            .hideContext=${this.hideContext || this.type !== "label"}
            .selectable=${this.selectable}
            .exclusions=${this.exclusions}
          ></ha-target-picker-item-row>
        `
      )}
    `;
  }

  private _renderEmptyEntries() {
    return html`<ha-list-item-base>
      <ha-svg-icon .path=${mdiMinusBox} slot="start" class="icon"></ha-svg-icon>
      <span slot="headline"
        >${this.hass.localize("ui.components.target-picker.no_targets")}</span
      >
    </ha-list-item-base>`;
  }

  private async _updateItemData() {
    if (this.type === "entity") {
      this._entries = undefined;
      return;
    }
    try {
      const entries = await extractFromTarget(
        this.hass.callWS,
        {
          [`${this.type}_id`]: [this.itemId],
        },
        false,
        this.primaryEntitiesOnly
      );
      this._entries = filterTargetEntries(
        this.hass,
        { type: this.type, id: this.itemId },
        entries,
        {
          deviceFilter: this.deviceFilter,
          entityFilter: this.entityFilter,
          includeDomains: this.includeDomains,
          includeDeviceClasses: this.includeDeviceClasses,
          primaryEntitiesOnly: this.primaryEntitiesOnly,
        }
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to extract target", e);
    }
  }

  private _itemData(type: TargetType, item: string) {
    if (type === "floor") {
      const floor: FloorRegistryEntry | undefined = this.hass.floors?.[item];
      return {
        name: floor?.name || item,
        iconPath: floor?.icon,
        fallbackIconPath: floor ? floorDefaultIconPath(floor) : mdiHome,
        notFound: !floor,
      };
    }
    if (type === "area") {
      const area: AreaRegistryEntry | undefined = this.hass.areas?.[item];
      return {
        name: area?.name || item,
        context: area?.floor_id && this.hass.floors?.[area.floor_id]?.name,
        iconPath: area?.icon,
        fallbackIconPath: mdiTextureBox,
        notFound: !area,
      };
    }
    if (type === "device") {
      const device: DeviceRegistryEntry | undefined = this.hass.devices?.[item];

      const area = device
        ? getDeviceArea(device, this.hass.areas, this.hass.devices)
        : undefined;
      const parentDevice =
        device?.parent_device_id && device.next_name_part === "parent_device"
          ? this.hass.devices[device.parent_device_id]
          : undefined;
      const context = [
        area ? computeAreaName(area) : undefined,
        parentDevice ? computeDeviceName(parentDevice) : undefined,
      ]
        .filter(Boolean)
        .join(
          computeRTL(
            this.hass.language,
            this.hass.translationMetadata.translations
          )
            ? " ◂ "
            : " ▸ "
        );

      return {
        name: device
          ? computeDeviceNameDisplay(device, this.hass.localize)
          : item,
        context,
        fallbackIconPath: mdiDevices,
        notFound: !device,
      };
    }
    if (type === "entity") {
      const stateObject: HassEntity | undefined = this.hass.states[item];
      const { primary, secondary } = stateObject
        ? computeEntityPickerDisplay(this.hass, stateObject)
        : { primary: item, secondary: undefined };
      return {
        name: primary,
        context: secondary,
        stateObject,
        notFound: !stateObject && item !== "all" && item !== "none",
      };
    }

    // type label
    const label: LabelRegistryEntry | undefined = this._labelRegistry?.find(
      (lab) => lab.label_id === item
    );
    return {
      name: label?.name || item,
      iconPath: label?.icon,
      fallbackIconPath: mdiLabel,
      notFound: !label,
    };
  }

  private _setDomainName(domain: string) {
    this._domainName = domainToName(this.hass.localize, domain);
  }

  private _removeItem(ev: MouseEvent) {
    ev.stopPropagation();
    fireEvent(this, "remove-target-item", {
      type: this.type,
      id: this.itemId,
    });
  }

  private _removeExclusion(ev: MouseEvent) {
    ev.stopPropagation();
    fireEvent(this, "remove-target-exclusion", {
      type: this.type,
      id: this.itemId,
    });
  }

  private _selectionChanged(ev: HASSDomTargetEvent<HaCheckbox>) {
    ev.stopPropagation();
    fireEvent(this, "target-selection-changed", {
      row: this._targetRow(
        this.type,
        this.itemId,
        this.parentEntries || this._entries,
        this.hass.entities,
        this.hass.devices
      ),
      isTarget: !this.subEntry,
      selected: ev.target.checked,
    });
  }

  private async _getDeviceDomain(configEntryId: string) {
    try {
      const data = await getConfigEntry(this.hass, configEntryId);
      const domain = data.config_entry.domain;
      this._iconImg = brandsUrl(
        {
          domain: domain,
          type: "icon",
          darkOptimized: this.hass.themes?.darkMode,
        },
        this.hass.auth.data.hassUrl
      );

      this._setDomainName(domain);
    } catch {
      // failed to load config entry -> ignore
    }
  }

  private _replaceItem(ev: MouseEvent) {
    ev.stopPropagation();
    fireEvent(this, "replace-target-item", {
      type: this.type,
      id: this.itemId,
    });
  }

  // Returns the split devices that replaced a removed composite device and
  // pass this row's filters, or undefined if the item is not a replaced device.
  private _getReplacement(item: string) {
    const split = this.compositeSplits?.[item];
    if (!split || this.hass.devices[item]) {
      return undefined;
    }
    const candidates = split.split_ids.filter((id) => {
      const device = this.hass.devices[id];
      return (
        device &&
        deviceMeetsFilter(
          device,
          this.hass.entities,
          this.deviceFilter,
          this.includeDomains,
          this.includeDeviceClasses,
          this.hass.states,
          this.entityFilter,
          !this.primaryEntitiesOnly
        )
      );
    });
    // Display the replaced reference using the primary replacement device's
    // name instead of the removed composite device id. Fall back to the first
    // available candidate if the primary device itself was deleted.
    const nameDevice =
      (split.primary_id && this.hass.devices[split.primary_id]) ||
      (candidates.length ? this.hass.devices[candidates[0]] : undefined);
    const name = nameDevice ? computeDeviceName(nameDevice) : undefined;
    return { candidates, name };
  }

  private _migrate = (ev: MouseEvent) => {
    ev.stopPropagation();
    const replacement = this._getReplacement(this.itemId);
    if (!replacement?.candidates.length) {
      return;
    }
    fireEvent(this, "migrate-target-item", {
      id: this.itemId,
      replacements: replacement.candidates,
    });
  };

  // The target picker opens the details, as it knows what is excluded from
  // the whole target.
  private _openDetails(ev: MouseEvent) {
    ev.stopPropagation();
    fireEvent(this, "open-target-details", {
      type: this.type,
      id: this.itemId,
      title: this._itemData(this.type, this.itemId).name,
    });
  }

  private _openMoreInfo = () => {
    showMoreInfoDialog(this, {
      entityId: this.itemId,
    });
  };

  static styles = [
    css`
      .error {
        background: var(--ha-color-fill-warning-quiet-resting);
      }

      /* Exclusions sit under the target they take something out of: muted,
         indented and led by a minus, so they read as "except". */
      .exclusion::part(base) {
        padding-inline-start: var(--ha-space-8);
      }
      .exclusion [slot="headline"],
      .exclusion [slot="supporting-text"],
      .exclusion .removed,
      .exclusion .minus,
      .exclusion .icon {
        color: var(--ha-color-text-secondary);
      }
      .exclusion .removed {
        font-size: var(--ha-font-size-s);
        white-space: nowrap;
        align-self: center;
      }
      ha-list-item-base::part(end) {
        gap: var(--ha-space-2);
      }

      .visually-hidden {
        position: absolute;
        overflow: hidden;
        clip: rect(0 0 0 0);
        height: 1px;
        width: 1px;
        margin: -1px;
        padding: 0;
        border: 0;
      }

      [slot="headline"].out {
        color: var(--ha-color-text-secondary);
        text-decoration: line-through;
      }
      .excluded-by {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--ha-space-1);
        font-size: var(--ha-font-size-s);
        color: var(--ha-color-text-secondary);
      }

      .error [slot="supporting-text"] {
        color: var(--ha-color-on-warning-normal);
      }

      .migrate {
        align-self: center;
        white-space: nowrap;
      }

      .replaceable {
        cursor: pointer;
      }

      .replaceable:hover {
        background-color: var(--ha-color-fill-neutral-quiet-hover);
      }

      state-badge {
        color: var(--ha-color-on-neutral-quiet);
      }

      .icon {
        width: 24px;
        display: flex;
        color: var(--ha-color-on-neutral-normal);
      }

      img {
        width: 24px;
        height: 24px;
        z-index: 1;
      }
      ha-icon-button {
        --ha-icon-button-size: 32px;
      }
      .summary {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        line-height: var(--ha-line-height-condensed);
      }
      :host([sub-entry]) .summary {
        margin-inline-start: var(--ha-space-12);
      }
      .summary .main {
        font-weight: var(--ha-font-weight-medium);
      }
      :host([expand]) .summary .main {
        color: var(--ha-color-text-secondary);
        font-size: var(--ha-font-size-s);
        font-weight: var(--ha-font-weight-normal);
      }
      .summary .secondary {
        font-size: var(--ha-font-size-s);
        color: var(--secondary-text-color);
      }

      .state {
        width: fit-content;
        font-size: var(--ha-font-size-s);
        color: var(--ha-color-text-secondary);
      }

      ha-list-item-button::part(end) {
        gap: var(--ha-space-2);
      }

      :host([sub-entry]) ha-list-item-button::part(base),
      :host([sub-entry]) ha-list-item-base::part(base) {
        padding-inline-start: var(--sub-entry-indent);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-target-picker-item-row": HaTargetPickerItemRow;
  }

  interface HASSDomEvents {
    "open-target-details": { type: TargetType; id: string; title: string };
    "target-selection-changed": {
      row: TargetRow;
      isTarget: boolean;
      selected: boolean;
    };
  }
}
