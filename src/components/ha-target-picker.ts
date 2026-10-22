import "@home-assistant/webawesome/dist/components/popover/popover";
import { mdiPlaylistMinus, mdiPlus, mdiTextureBox } from "@mdi/js";
import Fuse from "fuse.js";
import type { HassServiceTarget } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { consume } from "../common/decorators/consume";
import { ensureArray } from "../common/array/ensure-array";
import type { HASSDomEvent } from "../common/dom/fire_event";
import { fireEvent } from "../common/dom/fire_event";
import { isValidEntityId } from "../common/entity/valid_entity_id";
import { caseInsensitiveStringCompare } from "../common/string/compare";
import { computeRTL } from "../common/util/compute_rtl";
import {
  areaFloorComboBoxKeys,
  getAreasAndFloors,
  type AreaFloorValue,
  type FloorComboBoxItem,
} from "../data/area_floor_picker";
import { getConfigEntries, type ConfigEntry } from "../data/config_entries";
import { labelsContext } from "../data/context";
import {
  deviceComboBoxKeys,
  getDevices,
  type DevicePickerItem,
} from "../data/device/device_picker";
import {
  fetchDeviceCompositeSplits,
  type DeviceCompositeSplits,
} from "../data/device/device_registry";
import type { HaEntityPickerEntityFilterFunc } from "../data/entity/entity";
import {
  entityComboBoxKeys,
  getEntities,
  type EntityComboBoxItem,
} from "../data/entity/entity_picker";
import { domainToName } from "../data/integration";
import { getLabels, labelComboBoxKeys } from "../data/label/label_picker";
import type { LabelRegistryEntry } from "../data/label/label_registry";
import {
  extractFromTarget,
  getTargetComboBoxItemType,
  type ExtractFromTargetResult,
  type HassServiceTargetWithExclude,
  type TargetItem,
  type TargetType,
  type TargetTypeFloorless,
} from "../data/target";
import { SubscribeMixin } from "../mixins/subscribe-mixin";
import { isHelperDomain } from "../panels/config/helpers/const";
import { showHelperDetailDialog } from "../panels/config/helpers/show-dialog-helper-detail";
import {
  multiTermSearch,
  multiTermSortedSearch,
  type FuseWeightedKey,
} from "../resources/fuseMultiTerm";
import type { HomeAssistant, ValueChangedEvent } from "../types";
import { brandsUrl } from "../util/brands-url";
import type { HaDevicePickerDeviceFilterFunc } from "./device/ha-device-picker";
import "./ha-button";
import "./ha-generic-picker";
import type { HaGenericPicker } from "./ha-generic-picker";
import type { PickerComboBoxItem } from "./ha-picker-combo-box";
import "./ha-svg-icon";
import "./ha-tree-indicator";
import "./list/ha-list-base";
import "./target-picker/ha-target-picker-item-group";
import "./target-picker/ha-target-picker-item-row";
import { showTargetDetailsDialog } from "./target-picker/dialog/show-dialog-target-details";
import { filterTargetEntries } from "./target-picker/filter-target-entries";
import {
  addToExclude,
  applyExclusionChanges,
  computeExclusionsPerTarget,
  hasIncludedTargets,
  removeFromExclude,
  resolveTargetItemEntities,
  TARGET_TYPES,
  targetItemKey,
  targetItems,
  withExclude,
  type ResolvedTargetItem,
  type TargetExclusion,
  type TargetExclusions,
} from "./target-picker/target-exclusions";

const SEPARATOR = "________";
const CREATE_ID = "___create-new-entity___";
const isTargetType = (value: string): value is TargetType =>
  value === "entity" ||
  value === "device" ||
  value === "area" ||
  value === "label" ||
  value === "floor";

@customElement("ha-target-picker")
export class HaTargetPicker extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value?: HassServiceTargetWithExclude;

  @property() public helper?: string;

  @property({ attribute: false }) public createDomains?: string[];

  @property({ type: Boolean, attribute: "primary-entities-only" })
  public primaryEntitiesOnly?: boolean;

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

  @property({ attribute: false })
  public deviceFilter?: HaDevicePickerDeviceFilterFunc;

  @property({ attribute: false })
  public entityFilter?: HaEntityPickerEntityFilterFunc;

  /**
   * Entities that pass the filters the page currently has on. Narrows the
   * counts, unlike `entityFilter`, which says what can be picked at all.
   */
  @property({ attribute: false })
  public activeFilter?: (entityId: string) => boolean;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  /**
   * Offer to exclude things from the target again, stored in `exclude`.
   * Exclusions already in the value are shown either way.
   */
  @property({ type: Boolean, attribute: "allow-exclude" })
  public allowExclude = false;

  @state() private _selectedSection?: TargetTypeFloorless;

  @state() private _excludeSection?: TargetTypeFloorless;

  // What each exclusion takes out of each target, worked out from the value.
  @state() private _exclusions?: TargetExclusions;

  // Whether every included target and every exclusion resolved, so it is
  // known what each exclusion takes out, which ones are shared with another
  // target, and the details can edit them.
  @state() private _exclusionsComplete = true;

  // Every entity the included targets resolve to, so the exclude picker only
  // offers what would take something out.
  private _includedEntities?: string[];

  private _resolveRequest = 0;

  // What each target item resolves to, so a change only asks core about the
  // items it adds.
  private _itemEntries = new Map<string, Promise<ExtractFromTargetResult>>();

  @state() private _replaceTarget?: TargetItem;

  @state() private _replaceTargetAnchor?: HTMLElement;

  @state() private _configEntryLookup: Record<string, ConfigEntry> = {};

  @state() private _compositeSplits?: DeviceCompositeSplits;

  private _loadingCompositeSplits = false;

  @state()
  @consume({ context: labelsContext, subscribe: true })
  private _labelRegistry!: LabelRegistryEntry[];

  @query("ha-generic-picker") private _picker?: HaGenericPicker;

  @query("ha-generic-picker.exclude") private _excludePicker?: HaGenericPicker;

  private _newTarget?: TargetItem;

  private _getDevicesMemoized = memoizeOne(
    (
      hass: HomeAssistant,
      configEntryLookup: Record<string, ConfigEntry>,
      includeDomains?: string[],
      includeDeviceClasses?: string[],
      deviceFilter?: HaDevicePickerDeviceFilterFunc,
      entityFilter?: HaEntityPickerEntityFilterFunc,
      excludeDevices?: string[],
      value?: string,
      idPrefix?: string
    ) =>
      getDevices(hass, configEntryLookup, {
        includeDomains,
        includeDeviceClasses,
        deviceFilter,
        entityFilter,
        excludeDevices,
        value,
        idPrefix,
        nested: true,
      })
  );

  private _getLabelsMemoized = memoizeOne(getLabels);

  private _getEntitiesMemoized = memoizeOne(
    (
      hass: HomeAssistant,
      includeDomains?: string[],
      excludeDomains?: string[],
      entityFilter?: HaEntityPickerEntityFilterFunc,
      includeDeviceClasses?: string[],
      includeUnitOfMeasurement?: string[],
      includeEntities?: string[],
      excludeEntities?: string[],
      value?: string,
      idPrefix?: string
    ) =>
      getEntities(hass, {
        includeDomains,
        excludeDomains,
        entityFilter,
        includeDeviceClasses,
        includeUnitOfMeasurement,
        includeEntities,
        excludeEntities,
        value,
        idPrefix,
      })
  );

  private _getAreasAndFloorsMemoized = memoizeOne(getAreasAndFloors);

  private get _showEntityId() {
    return this.hass.userData?.showEntityIdPicker;
  }

  private _fuseIndexes = {
    area: memoizeOne((states: FloorComboBoxItem[]) =>
      this._createFuseIndex(states, areaFloorComboBoxKeys)
    ),
    entity: memoizeOne((states: EntityComboBoxItem[]) =>
      this._createFuseIndex(states, entityComboBoxKeys)
    ),
    device: memoizeOne((states: DevicePickerItem[]) =>
      this._createFuseIndex(states, deviceComboBoxKeys)
    ),
    label: memoizeOne((states: PickerComboBoxItem[]) =>
      this._createFuseIndex(states, labelComboBoxKeys)
    ),
  };

  @state() private _pendingEntityId?: string;

  public willUpdate(changedProps: PropertyValues<this>) {
    super.willUpdate(changedProps);

    if (!this.hasUpdated) {
      this._loadConfigEntries();
    }

    const devicesChanged =
      changedProps.has("hass") &&
      this.hass.devices !== changedProps.get("hass")?.devices;
    if (
      (changedProps.has("value") || devicesChanged) &&
      this.hass &&
      this._compositeSplits === undefined &&
      !this._loadingCompositeSplits &&
      this.value?.device_id &&
      ensureArray(this.value.device_id).some(
        (deviceId) => !this.hass.devices[deviceId]
      )
    ) {
      // A referenced device is missing from the registry; it might be a legacy
      // composite device that was split. Fetch the split map to offer a fix.
      this._loadCompositeSplits();
    }

    const registriesChanged =
      changedProps.has("hass") &&
      (devicesChanged ||
        this.hass.entities !== changedProps.get("hass")?.entities ||
        this.hass.areas !== changedProps.get("hass")?.areas);
    if (registriesChanged) {
      this._itemEntries.clear();
    }
    if (
      changedProps.has("value") ||
      changedProps.has("allowExclude") ||
      changedProps.has("primaryEntitiesOnly") ||
      changedProps.has("deviceFilter") ||
      changedProps.has("includeDomains") ||
      changedProps.has("includeDeviceClasses") ||
      changedProps.has("entityFilter") ||
      registriesChanged
    ) {
      this._resolveExclusions();
    }

    if (
      this._pendingEntityId &&
      changedProps.has("hass") &&
      this.hass.states !== changedProps.get("hass")?.states &&
      this.hass.states[this._pendingEntityId]
    ) {
      this._addTarget(this._pendingEntityId, "entity");
      this._pendingEntityId = undefined;
    }
  }

  private _createFuseIndex = (states, keys: FuseWeightedKey[]) =>
    Fuse.createIndex(keys, states);

  protected render() {
    return html` ${this._renderItems()} ${this._renderPicker()} `;
  }

  private _renderValueGroups() {
    const entityIds = this.value?.entity_id
      ? ensureArray(this.value.entity_id)
      : [];
    const deviceIds = this.value?.device_id
      ? ensureArray(this.value.device_id)
      : [];
    const areaIds = this.value?.area_id ? ensureArray(this.value.area_id) : [];
    const floorIds = this.value?.floor_id
      ? ensureArray(this.value.floor_id)
      : [];
    const labelIds = this.value?.label_id
      ? ensureArray(this.value?.label_id)
      : [];

    const noEffect = this._exclusions?.noEffect ?? [];
    const unplaced = this._unplacedExclusions(
      this.value?.exclude,
      this._exclusions
    );
    const perTarget = this._exclusionsPerTarget();

    if (
      !entityIds.length &&
      !deviceIds.length &&
      !areaIds.length &&
      !floorIds.length &&
      !labelIds.length &&
      !noEffect.length &&
      !unplaced.length
    ) {
      return nothing;
    }

    return html`
      <div
        class="item-groups"
        @remove-target-exclusion=${this._handleRemoveExclusion}
        @open-target-details=${this._openDetails}
      >
        ${
          entityIds.length
            ? html`
                <ha-target-picker-item-group
                  @remove-target-item=${this._handleRemove}
                  @replace-target-item=${this._handleReplace}
                  type="entity"
                  .hass=${this.hass}
                  .exclusions=${perTarget}
                  .items=${{ entity: entityIds }}
                  .deviceFilter=${this.deviceFilter}
                  .entityFilter=${this.entityFilter}
                  .activeFilter=${this.activeFilter}
                  .includeDomains=${this.includeDomains}
                  .includeDeviceClasses=${this.includeDeviceClasses}
                  .primaryEntitiesOnly=${this.primaryEntitiesOnly}
                >
                </ha-target-picker-item-group>
              `
            : nothing
        }
        ${
          deviceIds.length
            ? html`
                <ha-target-picker-item-group
                  @remove-target-item=${this._handleRemove}
                  @replace-target-item=${this._handleReplace}
                  @migrate-target-item=${this._handleMigrate}
                  type="device"
                  .hass=${this.hass}
                  .exclusions=${perTarget}
                  .items=${{ device: deviceIds }}
                  .deviceFilter=${this.deviceFilter}
                  .entityFilter=${this.entityFilter}
                  .activeFilter=${this.activeFilter}
                  .includeDomains=${this.includeDomains}
                  .includeDeviceClasses=${this.includeDeviceClasses}
                  .primaryEntitiesOnly=${this.primaryEntitiesOnly}
                  .compositeSplits=${this._compositeSplits}
                >
                </ha-target-picker-item-group>
              `
            : nothing
        }
        ${
          floorIds.length || areaIds.length
            ? html`
                <ha-target-picker-item-group
                  @remove-target-item=${this._handleRemove}
                  @replace-target-item=${this._handleReplace}
                  type="area"
                  .hass=${this.hass}
                  .exclusions=${perTarget}
                  .items=${{
                    floor: floorIds,
                    area: areaIds,
                  }}
                  .deviceFilter=${this.deviceFilter}
                  .entityFilter=${this.entityFilter}
                  .activeFilter=${this.activeFilter}
                  .includeDomains=${this.includeDomains}
                  .includeDeviceClasses=${this.includeDeviceClasses}
                  .primaryEntitiesOnly=${this.primaryEntitiesOnly}
                >
                </ha-target-picker-item-group>
              `
            : nothing
        }
        ${
          labelIds.length
            ? html`
                <ha-target-picker-item-group
                  @remove-target-item=${this._handleRemove}
                  @replace-target-item=${this._handleReplace}
                  type="label"
                  .hass=${this.hass}
                  .exclusions=${perTarget}
                  .items=${{ label: labelIds }}
                  .deviceFilter=${this.deviceFilter}
                  .entityFilter=${this.entityFilter}
                  .activeFilter=${this.activeFilter}
                  .includeDomains=${this.includeDomains}
                  .includeDeviceClasses=${this.includeDeviceClasses}
                  .primaryEntitiesOnly=${this.primaryEntitiesOnly}
                >
                </ha-target-picker-item-group>
              `
            : nothing
        }
        ${this._renderExclusionList(
          "ui.components.target-picker.exclusions",
          unplaced
        )}
        ${this._renderExclusionList(
          "ui.components.target-picker.exclusions_no_effect",
          noEffect
        )}
      </div>
    `;
  }

  private _renderExclusionList(
    label:
      | "ui.components.target-picker.exclusions"
      | "ui.components.target-picker.exclusions_no_effect",
    items: TargetItem[]
  ) {
    if (!items.length) {
      return nothing;
    }
    return html`
      <div class="exclusion-list-label">${this.hass.localize(label)}</div>
      <ha-list-base>
        ${items.map(
          (item) =>
            html`<ha-target-picker-item-row
              exclusion
              .hass=${this.hass}
              .type=${item.type}
              .itemId=${item.id}
            ></ha-target-picker-item-row>`
        )}
      </ha-list-base>
    `;
  }

  // Excludes that aren't listed under a target or as having no effect,
  // because they are still being resolved or resolving them failed.
  private _unplacedExclusions = memoizeOne(
    (
      exclude: HassServiceTarget | undefined,
      exclusions: TargetExclusions | undefined
    ): TargetItem[] => {
      const placed = new Set([
        ...Object.values(exclusions?.perTarget ?? {}).flatMap((list) =>
          list.map(targetItemKey)
        ),
        ...(exclusions?.noEffect ?? []).map(targetItemKey),
      ]);
      return targetItems(exclude).filter(
        (item) => !placed.has(targetItemKey(item))
      );
    }
  );

  private _renderItems() {
    return html` ${this._renderValueGroups()} `;
  }

  private _renderPicker() {
    const sections = this._sections();
    const showExclude = this.allowExclude && hasIncludedTargets(this.value);

    return html`
      <div
        class=${showExclude ? "add-target-wrapper exclude-shown" : "add-target-wrapper"}
      >
        <ha-generic-picker
          popover-placement="bottom-start"
          .disabled=${this.disabled}
          .autofocus=${this.autofocus}
          .helper=${this.helper}
          .sections=${sections}
          .notFoundLabel=${this._noTargetFoundLabel}
          .emptyLabel=${this.hass.localize(
            "ui.components.target-picker.no_targets"
          )}
          .selectedSection=${this._selectedSection}
          .popoverAnchor=${this._replaceTargetAnchor}
          .rowRenderer=${this._renderRow}
          .getItems=${this._getItems}
          @value-changed=${this._targetPicked}
          @picker-closed=${this._handlePickerClosed}
          .addButtonLabel=${this.hass.localize(
            "ui.components.target-picker.add_target"
          )}
          .getAdditionalItems=${this._getAdditionalItems}
        >
        </ha-generic-picker>
        ${
          showExclude
            ? html`
                <ha-generic-picker
                  class="exclude"
                  popover-placement="bottom-start"
                  .disabled=${this.disabled}
                  .sections=${sections}
                  .notFoundLabel=${this._noTargetFoundLabel}
                  .emptyLabel=${this.hass.localize(
                    "ui.components.target-picker.no_targets"
                  )}
                  .selectedSection=${this._excludeSection}
                  .rowRenderer=${this._renderRow}
                  .getItems=${this._getExcludeItems}
                  @value-changed=${this._excludePicked}
                >
                  <ha-button
                    slot="field"
                    size="s"
                    appearance="plain"
                    .disabled=${this.disabled}
                    @click=${this._openExcludePicker}
                  >
                    <ha-svg-icon
                      .path=${mdiPlaylistMinus}
                      slot="start"
                    ></ha-svg-icon>
                    ${this.hass.localize(
                      "ui.components.target-picker.exclude_target"
                    )}
                  </ha-button>
                </ha-generic-picker>
              `
            : nothing
        }
      </div>
    `;
  }

  private _sections() {
    return [
      {
        id: "entity",
        label: this.hass.localize("ui.components.target-picker.type.entities"),
      },
      {
        id: "device",
        label: this.hass.localize("ui.components.target-picker.type.devices"),
      },
      {
        id: "area",
        label: this.hass.localize("ui.components.target-picker.type.areas"),
      },
      "separator" as const,
      {
        id: "label",
        label: this.hass.localize("ui.components.target-picker.type.labels"),
      },
    ];
  }

  private _extractItem(
    item: TargetItem,
    primaryEntitiesOnly: boolean
  ): Promise<ExtractFromTargetResult> {
    const key = `${primaryEntitiesOnly}:${targetItemKey(item)}`;
    let entries = this._itemEntries.get(key);
    if (!entries) {
      entries = extractFromTarget(
        this.hass.callWS,
        { [`${item.type}_id`]: [item.id] },
        false,
        primaryEntitiesOnly
      );
      this._itemEntries.set(key, entries);
      const cached = entries;
      cached.catch(() => {
        if (this._itemEntries.get(key) === cached) {
          this._itemEntries.delete(key);
        }
      });
    }
    return entries;
  }

  // The entities an included item adds, filtered like its row so what an
  // exclusion takes out matches what the row counts.
  private async _resolveInclude(item: TargetItem): Promise<string[]> {
    if (item.type === "entity") {
      return resolveTargetItemEntities(this.hass, item);
    }
    const entries = await this._extractItem(
      item,
      this.primaryEntitiesOnly ?? true
    );
    return filterTargetEntries(this.hass, item, entries, {
      deviceFilter: this.deviceFilter,
      entityFilter: this.entityFilter,
      includeDomains: this.includeDomains,
      includeDeviceClasses: this.includeDeviceClasses,
      primaryEntitiesOnly: this.primaryEntitiesOnly,
    }).referenced_entities;
  }

  // Like core, an exclude takes out every entity of an item, not only the
  // primary ones, and isn't narrowed by the filters.
  private async _resolveExclude(item: TargetItem): Promise<string[]> {
    if (item.type === "entity") {
      return resolveTargetItemEntities(this.hass, item);
    }
    return (await this._extractItem(item, false)).referenced_entities;
  }

  private async _resolveExclusions() {
    const request = ++this._resolveRequest;
    this._includedEntities = undefined;
    const value = this.value;
    const excludes = targetItems(value?.exclude);
    const includes = targetItems(value);
    // Without an exclude, the targets are only needed to tell whether an
    // exclusion made in the details is shared with another target.
    if (
      !this.hass ||
      (!excludes.length && (!this.allowExclude || includes.length < 2))
    ) {
      this._exclusions = undefined;
      this._exclusionsComplete = true;
      return;
    }
    // Until the targets resolve, the exclusions shown are from before and
    // may not say which ones are shared now.
    this._exclusionsComplete = false;

    // Each item on its own, so it is known which exclusion takes out what
    // from which target. One that fails only loses its own part.
    const [includeResults, excludeResults] = await Promise.all([
      Promise.allSettled(includes.map((item) => this._resolveInclude(item))),
      Promise.allSettled(excludes.map((item) => this._resolveExclude(item))),
    ]);
    if (request !== this._resolveRequest) {
      return;
    }
    const resolvedIncludes: ResolvedTargetItem[] = [];
    includes.forEach((item, index) => {
      const result = includeResults[index];
      if (result.status === "fulfilled") {
        resolvedIncludes.push({ ...item, entities: result.value });
      }
    });
    const resolvedExcludes: ResolvedTargetItem[] = [];
    excludes.forEach((item, index) => {
      const result = excludeResults[index];
      if (result.status === "fulfilled") {
        resolvedExcludes.push({ ...item, entities: result.value });
      }
    });
    const allIncluded = resolvedIncludes.length === includes.length;
    const exclusions = computeExclusionsPerTarget(
      resolvedIncludes,
      resolvedExcludes
    );
    if (!allIncluded) {
      // Without every target, no effect can't be told from not known, and a
      // shared exclusion can't be told from one that isn't.
      exclusions.noEffect = [];
    }
    this._exclusions = exclusions;
    this._exclusionsComplete =
      allIncluded && resolvedExcludes.length === excludes.length;
    this._includedEntities = allIncluded
      ? [
          ...new Set(
            includeResults.flatMap((result) =>
              result.status === "fulfilled" ? result.value : []
            )
          ),
        ]
      : undefined;
  }

  // Without an exclude yet, what the target includes is only needed once the
  // exclude picker opens.
  private async _resolveIncludedEntities() {
    const request = this._resolveRequest;
    try {
      const included = await Promise.all(
        targetItems(this.value).map((item) => this._resolveInclude(item))
      );
      if (request !== this._resolveRequest) {
        return;
      }
      this._includedEntities = [...new Set(included.flat())];
      this._excludePicker?.refreshItems();
    } catch (_err) {
      // The picker then offers everything instead.
    }
  }

  private _openExcludePicker(ev: Event) {
    this._excludePicker?.open(ev);
    if (!this._includedEntities) {
      this._resolveIncludedEntities();
    }
  }

  private _excludePicked(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();
    const [rawType, id] = ev.detail.value.split(SEPARATOR);
    if (!id || !isTargetType(rawType)) {
      return;
    }
    const value = withExclude(
      this.value,
      addToExclude(this.value?.exclude, { type: rawType, id })
    );
    if (value) {
      fireEvent(this, "value-changed", { value });
    }
  }

  private _handleRemoveExclusion(
    ev: HASSDomEvent<HASSDomEvents["remove-target-exclusion"]>
  ) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: withExclude(
        this.value,
        removeFromExclude(this.value?.exclude, ev.detail)
      ),
    });
  }

  private _exclusionsPerTarget():
    Record<string, TargetExclusion[]> | undefined {
    return (
      this._exclusions?.perTarget ??
      (this.allowExclude && !hasIncludedTargets(this.value?.exclude)
        ? {}
        : undefined)
    );
  }

  private _openDetails(ev: HASSDomEvent<HASSDomEvents["open-target-details"]>) {
    ev.stopPropagation();
    const { type, id, title } = ev.detail;
    const key = targetItemKey({ type, id });
    const perTarget = this._exclusionsPerTarget();
    const exclusions = perTarget ? (perTarget[key] ?? []) : undefined;
    const editable =
      exclusions &&
      this.allowExclude &&
      !this.disabled &&
      this._exclusionsComplete;
    showTargetDetailsDialog(this, {
      title,
      type,
      itemId: id,
      deviceFilter: this.deviceFilter,
      entityFilter: this.entityFilter,
      activeFilter: this.activeFilter,
      includeDomains: this.includeDomains,
      includeDeviceClasses: this.includeDeviceClasses,
      primaryEntitiesOnly: this.primaryEntitiesOnly,
      exclusions,
      exclude: this.value?.exclude,
      otherTargetEntities: Object.entries(
        this._exclusions?.included ?? {}
      ).flatMap(([targetKey, entities]) => (targetKey === key ? [] : entities)),
      exclusionsChanged: editable
        ? (initial, current) => {
            fireEvent(this, "value-changed", {
              value: withExclude(
                this.value,
                applyExclusionChanges(this.value?.exclude, initial, current)
              ),
            });
          }
        : undefined,
    });
  }

  // What the exclude picker hides along with its children: what is already
  // excluded, and what is included except devices, whose child devices can
  // still be excluded on their own (see `_excludePickerIncludedDevices`).
  private _excludePickerHidden = memoizeOne(
    (value?: HassServiceTargetWithExclude): HassServiceTarget => {
      const hidden: HassServiceTarget = {};
      TARGET_TYPES.forEach((type) => {
        const key = `${type}_id` as const;
        const ids = [
          ...(key === "floor_id" || key === "device_id" || !value?.[key]
            ? []
            : ensureArray(value[key])),
          ...(value?.exclude?.[key] ? ensureArray(value.exclude[key]) : []),
        ];
        if (ids.length) {
          hidden[key] = ids;
        }
      });
      return hidden;
    }
  );

  private _excludePickerIncludedDevices = memoizeOne(
    (value?: HassServiceTargetWithExclude): string[] | undefined =>
      value?.device_id ? ensureArray(value.device_id) : undefined
  );

  // Only offers what overlaps with what the target includes.
  private _excludeEntityFilter = memoizeOne(
    (
      entityFilter: HaEntityPickerEntityFilterFunc | undefined,
      included: string[] | undefined
    ): HaEntityPickerEntityFilterFunc | undefined => {
      if (!included) {
        return entityFilter;
      }
      const includedSet = new Set(included);
      return (stateObj) =>
        includedSet.has(stateObj.entity_id) &&
        (!entityFilter || entityFilter(stateObj));
    }
  );

  private _getExcludeItems = (searchString: string, section: string) => {
    this._excludeSection = section as TargetTypeFloorless | undefined;

    return this._getItemsMemoized(
      this.hass.localize,
      this._excludeEntityFilter(this.entityFilter, this._includedEntities),
      this.deviceFilter,
      this.includeDomains,
      this.includeDeviceClasses,
      this._excludePickerHidden(this.value),
      undefined,
      searchString,
      this._configEntryLookup,
      this.hass.entities,
      this._excludeSection,
      this._excludePickerIncludedDevices(this.value)
    );
  };

  private _targetPicked(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();
    const value = ev.detail.value;
    if (value.startsWith(CREATE_ID)) {
      this._createNewDomainElement(value.substring(CREATE_ID.length));
      return;
    }

    const [rawType, id] = value.split(SEPARATOR);

    if (!id || !isTargetType(rawType)) {
      return;
    }

    if (this._replaceTarget) {
      this._replaceTargetItem(this._replaceTarget, { type: rawType, id });
      return;
    }

    this._addTarget(id, rawType);
  }

  private _replaceTargetItem(currentTarget: TargetItem, newTarget: TargetItem) {
    const value = this._replaceTargetInValue(
      this.value,
      currentTarget,
      newTarget
    );

    if (value === this.value) {
      return;
    }

    fireEvent(this, "value-changed", { value });
  }

  private _addTarget(id: string, type: TargetType) {
    const value = this._addTargetToValue(this.value, { type, id });

    if (value === this.value) {
      return;
    }

    fireEvent(this, "value-changed", { value });

    // eslint-disable-next-line lit/prefer-query-decorators
    this.shadowRoot
      ?.querySelector(
        `ha-target-picker-item-group[type='${this._newTarget?.type}']`
      )
      ?.removeAttribute("collapsed");
  }

  private _replaceTargetInValue(
    value: this["value"],
    currentTarget: TargetItem,
    newTarget: TargetItem
  ): this["value"] {
    if (
      !value ||
      (currentTarget.type === newTarget.type &&
        currentTarget.id === newTarget.id)
    ) {
      return value;
    }

    const valueWithoutCurrent = this._removeItem(
      value,
      currentTarget.type,
      currentTarget.id
    );

    return this._withoutOrphanExclude(
      this._addTargetToValue(valueWithoutCurrent, newTarget)
    );
  }

  private _addTargetToValue(
    value: this["value"],
    target: TargetItem
  ): this["value"] {
    const typeId = `${target.type}_id`;

    if (typeId === "entity_id" && !isValidEntityId(target.id)) {
      return value;
    }

    if (value?.[typeId] && ensureArray(value[typeId]).includes(target.id)) {
      return value;
    }

    if (!value) {
      return { [typeId]: target.id };
    }
    const newValue = {
      ...value,
      [typeId]: value[typeId]
        ? [...ensureArray(value[typeId]), target.id]
        : target.id,
    };
    // Something added on purpose shouldn't stay excluded.
    return newValue.exclude
      ? withExclude(newValue, removeFromExclude(newValue.exclude, target))
      : newValue;
  }

  private _createNewDomainElement = (domain: string) => {
    showHelperDetailDialog(this, {
      domain,
      dialogClosedCallback: (item) => {
        if (item.entityId) {
          if (this.hass.states[item.entityId]) {
            this._addTarget(item.entityId, "entity");
          } else {
            this._pendingEntityId = item.entityId;
          }
        }
      },
    });
  };

  private _handleRemove(ev: HASSDomEvent<HASSDomEvents["remove-target-item"]>) {
    const { type, id } = ev.detail;
    fireEvent(this, "value-changed", {
      value: this._withoutOrphanExclude(this._removeItem(this.value, type, id)),
    });
  }

  private _handleReplace(
    ev: HASSDomEvent<HASSDomEvents["replace-target-item"]>
  ) {
    ev.stopPropagation();
    this._replaceTargetAnchor = ev
      .composedPath()
      .find(
        (node): node is HTMLElement =>
          node instanceof HTMLElement &&
          node.tagName === "HA-TARGET-PICKER-ITEM-ROW"
      );

    const type = ev.detail.type;
    if (type === "floor") {
      this._selectedSection = "area";
    } else if (
      type === "entity" ||
      type === "device" ||
      type === "area" ||
      type === "label"
    ) {
      this._selectedSection = type;
    } else {
      return;
    }
    this._replaceTarget = { type, id: ev.detail.id };
    this._picker?.open(undefined, {
      selectedValue: `${type}${SEPARATOR}${ev.detail.id}`,
    });
  }

  private _handlePickerClosed() {
    if (this._replaceTarget) {
      this._selectedSection = undefined;
    }
    this._replaceTarget = undefined;
    this._replaceTargetAnchor = undefined;
  }

  private _removeItem(
    value: this["value"],
    type: TargetType,
    id: string
  ): this["value"] {
    const typeId = `${type}_id`;

    const newVal = ensureArray(value![typeId])!.filter(
      (val) => String(val) !== id
    );
    const val = { ...value }!;
    if (newVal.length) {
      val[typeId] = newVal;
    } else {
      delete val[typeId];
    }
    return val;
  }

  private _withoutOrphanExclude(value: this["value"]): this["value"] {
    // An exclude on its own is not a target.
    if (value && Object.keys(value).some((key) => key !== "exclude")) {
      return value;
    }
    return undefined;
  }

  private _getItems = (searchString: string, section: string) => {
    this._selectedSection = section as TargetTypeFloorless | undefined;

    return this._getItemsMemoized(
      this.hass.localize,
      this.entityFilter,
      this.deviceFilter,
      this.includeDomains,
      this.includeDeviceClasses,
      this.value,
      this._replaceTarget,
      searchString,
      this._configEntryLookup,
      this.hass.entities,
      this._selectedSection
    );
  };

  private _getItemsMemoized = memoizeOne(
    (
      localize: HomeAssistant["localize"],
      entityFilter: this["entityFilter"],
      deviceFilter: this["deviceFilter"],
      includeDomains: this["includeDomains"],
      includeDeviceClasses: this["includeDeviceClasses"],
      targetValue: this["value"],
      replaceTarget: TargetItem | undefined,
      searchTerm: string,
      configEntryLookup: Record<string, ConfigEntry>,
      _entities: HomeAssistant["entities"],
      filterType?: TargetTypeFloorless,
      // Hidden without hiding their child devices.
      hiddenDeviceIds?: string[]
    ) => {
      const replacingEntityId =
        replaceTarget?.type === "entity" ? replaceTarget.id : undefined;
      const replacingDeviceId =
        replaceTarget?.type === "device" ? replaceTarget.id : undefined;
      const replacingAreaId =
        replaceTarget?.type === "area" ? replaceTarget.id : undefined;
      const replacingFloorId =
        replaceTarget?.type === "floor" ? replaceTarget.id : undefined;
      const replacingLabelId =
        replaceTarget?.type === "label" ? replaceTarget.id : undefined;

      const items: (
        string | FloorComboBoxItem | EntityComboBoxItem | PickerComboBoxItem
      )[] = [];

      if (!filterType || filterType === "entity") {
        let entityItems = this._getEntitiesMemoized(
          this.hass,
          includeDomains,
          undefined,
          entityFilter,
          includeDeviceClasses,
          undefined,
          undefined,
          targetValue?.entity_id
            ? replacingEntityId
              ? ensureArray(targetValue.entity_id).filter(
                  (entityId) => entityId !== replacingEntityId
                )
              : ensureArray(targetValue.entity_id)
            : undefined,
          replacingEntityId
            ? `entity${SEPARATOR}${replacingEntityId}`
            : undefined,
          `entity${SEPARATOR}`
        ).sort(this._sortBySortingLabel);

        if (searchTerm) {
          entityItems = this._filterGroup(
            "entity",
            entityItems,
            searchTerm,
            entityComboBoxKeys
          ) as EntityComboBoxItem[];
        }

        if (!filterType && entityItems.length) {
          // show group title
          items.push(localize("ui.components.target-picker.type.entities"));
        }

        items.push(...entityItems);
      }

      if (!filterType || filterType === "device") {
        const selectedDeviceIds = targetValue?.device_id
          ? replacingDeviceId
            ? ensureArray(targetValue.device_id).filter(
                (deviceId) => deviceId !== replacingDeviceId
              )
            : ensureArray(targetValue.device_id)
          : undefined;
        // A selected parent device already targets its children, so exclude
        // those children from the picker too (mirrors selecting a floor
        // removing its areas from the list).
        const excludeDeviceIds =
          selectedDeviceIds || hiddenDeviceIds
            ? [
                ...(hiddenDeviceIds ?? []),
                ...(selectedDeviceIds ?? []),
                ...(selectedDeviceIds
                  ? Object.values(this.hass.devices)
                      .filter(
                        (device) =>
                          device.parent_device_id !== null &&
                          selectedDeviceIds.includes(device.parent_device_id)
                      )
                      .map((device) => device.id)
                  : []),
              ]
            : undefined;
        let deviceItems = this._getDevicesMemoized(
          this.hass,
          configEntryLookup,
          includeDomains,
          includeDeviceClasses,
          deviceFilter,
          entityFilter,
          excludeDeviceIds,
          replacingDeviceId,
          `device${SEPARATOR}`
        );
        // getDevices already returns child devices nested under their parent
        // with the top-level devices sorted; keep that order rather than
        // re-sorting by label, which would separate children from their parent.

        if (searchTerm) {
          // Keep the nested parent-then-children order (sort=false), matching
          // the areas group; the default sorted search would reorder matches by
          // relevance and pull children above their parent.
          deviceItems = this._filterGroup(
            "device",
            deviceItems,
            searchTerm,
            deviceComboBoxKeys,
            false
          );
        }

        // Recompute the tree "last child" flag over the (possibly filtered)
        // list so the last visible child of each parent draws its end connector.
        deviceItems = deviceItems.map((item, index) => {
          if (!(item as DevicePickerItem).is_child) {
            return item;
          }
          const nextItem = deviceItems[index + 1] as
            DevicePickerItem | undefined;
          return {
            ...item,
            last: !nextItem || !nextItem.is_child,
          };
        });

        if (!filterType && deviceItems.length) {
          // show group title
          items.push(localize("ui.components.target-picker.type.devices"));
        }

        items.push(...deviceItems);
      }

      if (!filterType || filterType === "area") {
        let areasAndFloors = this._getAreasAndFloorsMemoized(
          this.hass.states,
          this.hass.floors,
          this.hass.areas,
          this.hass.devices,
          this.hass.entities,
          memoizeOne((value: AreaFloorValue): string =>
            [value.type, value.id].join(SEPARATOR)
          ),
          includeDomains,
          undefined,
          includeDeviceClasses,
          deviceFilter,
          entityFilter,
          targetValue?.area_id
            ? replacingAreaId
              ? ensureArray(targetValue.area_id).filter(
                  (areaId) => areaId !== replacingAreaId
                )
              : ensureArray(targetValue.area_id)
            : undefined,
          targetValue?.floor_id
            ? replacingFloorId
              ? ensureArray(targetValue.floor_id).filter(
                  (floorId) => floorId !== replacingFloorId
                )
              : ensureArray(targetValue.floor_id)
            : undefined
        );

        if (searchTerm) {
          areasAndFloors = this._filterGroup(
            "area",
            areasAndFloors,
            searchTerm,
            areaFloorComboBoxKeys,
            false
          ) as FloorComboBoxItem[];
        }

        if (!filterType && areasAndFloors.length) {
          // show group title
          items.push(localize("ui.components.target-picker.type.areas"));
        }

        items.push(
          ...areasAndFloors.map((item, index) => {
            const nextItem = areasAndFloors[index + 1];

            if (
              !nextItem ||
              (item.type === "area" && nextItem.type === "floor")
            ) {
              return {
                ...item,
                last: true,
              };
            }

            return item;
          })
        );
      }

      if (!filterType || filterType === "label") {
        let labels = this._getLabelsMemoized(
          this.hass.states,
          this.hass.areas,
          this.hass.devices,
          this.hass.entities,
          this._labelRegistry,
          includeDomains,
          undefined,
          includeDeviceClasses,
          deviceFilter,
          entityFilter,
          targetValue?.label_id
            ? replacingLabelId
              ? ensureArray(targetValue.label_id).filter(
                  (labelId) => labelId !== replacingLabelId
                )
              : ensureArray(targetValue.label_id)
            : undefined,
          `label${SEPARATOR}`
        ).sort(this._sortBySortingLabel);

        if (searchTerm) {
          labels = this._filterGroup(
            "label",
            labels,
            searchTerm,
            labelComboBoxKeys
          );
        }

        if (!filterType && labels.length) {
          // show group title
          items.push(localize("ui.components.target-picker.type.labels"));
        }

        items.push(...labels);
      }

      return items;
    }
  );

  private _filterGroup(
    type: TargetType,
    items: (FloorComboBoxItem | PickerComboBoxItem | EntityComboBoxItem)[],
    searchTerm: string,
    weightedKeys: FuseWeightedKey[],
    sort = true
  ) {
    const fuseIndex = this._fuseIndexes[type](items);

    if (sort) {
      return multiTermSortedSearch(
        items,
        searchTerm,
        (item) => item.id,
        fuseIndex
      );
    }

    return multiTermSearch(items, searchTerm, weightedKeys, fuseIndex, {
      ignoreLocation: true,
    });
  }

  private _getAdditionalItems = () => this._getCreateItems(this.createDomains);

  private _getCreateItems = memoizeOne(
    (createDomains: this["createDomains"]) => {
      if (!createDomains?.length) {
        return [];
      }

      return createDomains.map((domain) => {
        const primary = this.hass.localize(
          "ui.components.entity.entity-picker.create_helper",
          {
            domain: isHelperDomain(domain)
              ? this.hass.localize(`ui.panel.config.helpers.types.${domain}`)
              : domainToName(this.hass.localize, domain),
          }
        );

        return {
          id: CREATE_ID + domain,
          primary: primary,
          secondary: this.hass.localize(
            "ui.components.entity.entity-picker.new_entity"
          ),
          icon_path: mdiPlus,
        } satisfies EntityComboBoxItem;
      });
    }
  );

  private async _loadConfigEntries() {
    const configEntries = await getConfigEntries(this.hass);
    this._configEntryLookup = Object.fromEntries(
      configEntries.map((entry) => [entry.entry_id, entry])
    );
  }

  private async _loadCompositeSplits() {
    this._loadingCompositeSplits = true;
    try {
      this._compositeSplits = await fetchDeviceCompositeSplits(this.hass);
    } catch (_err) {
      this._compositeSplits = {};
    } finally {
      this._loadingCompositeSplits = false;
    }
  }

  private _handleMigrate(
    ev: HASSDomEvent<HASSDomEvents["migrate-target-item"]>
  ) {
    const { id, replacements } = ev.detail;
    let value = this._removeItem(this.value, "device", id);
    for (const replacement of replacements) {
      value = this._addTargetToValue(value, {
        type: "device",
        id: replacement,
      });
    }
    fireEvent(this, "value-changed", {
      value: this._withoutOrphanExclude(value),
    });
  }

  private _renderRow = (
    item:
      | PickerComboBoxItem
      | (FloorComboBoxItem & { last?: boolean | undefined })
      | EntityComboBoxItem
      | DevicePickerItem
  ) => {
    if (!item) {
      return nothing;
    }

    const type = getTargetComboBoxItemType(item);
    let hasFloor = false;
    let rtl = false;
    let showEntityId = false;
    const isChildDeviceRow =
      type === "device" && !!(item as DevicePickerItem).is_child;
    if (type === "area" || type === "floor" || isChildDeviceRow) {
      rtl = computeRTL(
        this.hass.language,
        this.hass.translationMetadata.translations
      );
      hasFloor =
        type === "area" && !!(item as FloorComboBoxItem).area?.floor_id;
    }

    if (type === "entity") {
      showEntityId = !!this._showEntityId;
    }

    return html`
      <ha-combo-box-item
        class=${type === "empty" ? "empty" : ""}
        style=${
          ((item as FloorComboBoxItem).type === "area" && hasFloor) ||
          isChildDeviceRow
            ? "--ha-combo-box-item-padding-inline-start: var(--ha-space-12);"
            : ""
        }
      >
        ${
          ((item as FloorComboBoxItem).type === "area" && hasFloor) ||
          isChildDeviceRow
            ? html`
                <ha-tree-indicator
                  style=${styleMap({
                    width: "var(--ha-space-12)",
                    position: "absolute",
                    top: "0",
                    height: "100%",
                    left: rtl ? undefined : "var(--ha-space-1)",
                    right: rtl ? "var(--ha-space-1)" : undefined,
                    transform: rtl ? "scaleX(-1)" : "",
                  })}
                  .end=${(item as { last?: boolean }).last}
                  slot="start"
                ></ha-tree-indicator>
              `
            : nothing
        }
        ${
          item.icon
            ? html`<ha-icon slot="start" .icon=${item.icon}></ha-icon>`
            : item.icon_path
              ? html`<ha-svg-icon
                  slot="start"
                  .path=${item.icon_path}
                ></ha-svg-icon>`
              : type === "entity" && (item as EntityComboBoxItem).stateObj
                ? html`
                    <state-badge
                      slot="start"
                      .stateObj=${(item as EntityComboBoxItem).stateObj}
                    ></state-badge>
                  `
                : type === "device" && (item as DevicePickerItem).domain
                  ? html`
                      <img
                        slot="start"
                        alt=""
                        crossorigin="anonymous"
                        referrerpolicy="no-referrer"
                        src=${brandsUrl(
                          {
                            domain: (item as DevicePickerItem).domain!,
                            type: "icon",
                            darkOptimized: this.hass.themes.darkMode,
                          },
                          this.hass.auth.data.hassUrl
                        )}
                      />
                    `
                  : type === "floor"
                    ? html`<ha-floor-icon
                        slot="start"
                        .floor=${(item as FloorComboBoxItem).floor!}
                      ></ha-floor-icon>`
                    : type === "area"
                      ? html`<ha-svg-icon
                          slot="start"
                          .path=${item.icon_path || mdiTextureBox}
                        ></ha-svg-icon>`
                      : nothing
        }
        <span slot="headline">${item.primary}</span>
        ${
          item.secondary
            ? html`<span slot="supporting-text">${item.secondary}</span>`
            : nothing
        }
        ${
          (item as EntityComboBoxItem).stateObj && showEntityId
            ? html`
                <span slot="supporting-text" class="code">
                  ${(item as EntityComboBoxItem).stateObj?.entity_id}
                </span>
              `
            : nothing
        }
        ${
          (item as EntityComboBoxItem).domain_name &&
          (type !== "entity" || !showEntityId)
            ? html`
                <div slot="trailing-supporting-text" class="domain">
                  ${(item as EntityComboBoxItem).domain_name}
                </div>
              `
            : nothing
        }
      </ha-combo-box-item>
    `;
  };

  private _noTargetFoundLabel = (search: string) =>
    this.hass.localize("ui.components.target-picker.no_target_found", {
      term: html`<b>‘${search}’</b>`,
    });

  private _sortBySortingLabel = (entityA, entityB) =>
    caseInsensitiveStringCompare(
      (entityA as PickerComboBoxItem).sorting_label!,
      (entityB as PickerComboBoxItem).sorting_label!,
      this.hass?.locale.language ?? navigator.language
    );

  static styles = css`
    .add-target-wrapper {
      display: flex;
      justify-content: flex-start;
      margin-top: var(--ha-space-3);
    }

    ha-generic-picker {
      width: 100%;
    }

    /* Side by side, both pickers shrink to their buttons. Their popovers
       still take the full width, which the section chips need. */
    .add-target-wrapper.exclude-shown {
      flex-wrap: wrap;
      gap: var(--ha-space-2);
      container-type: inline-size;
    }

    .add-target-wrapper.exclude-shown ha-generic-picker {
      width: auto;
      --ha-generic-picker-width: max(100cqw, 250px);
    }

    .exclusion-list-label {
      padding: var(--ha-space-1) var(--ha-space-2);
      background-color: var(--ha-color-surface-low);
      font-weight: var(--ha-font-weight-bold);
      color: var(--secondary-text-color);
    }

    .item-groups {
      overflow: hidden;
      border: var(--ha-border-width-sm) solid var(--divider-color);
      border-radius: var(--ha-border-radius-lg);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-target-picker": HaTargetPicker;
  }

  interface HASSDomEvents {
    "remove-target-item": TargetItem;
    "replace-target-item": TargetItem;
    "migrate-target-item": { id: string; replacements: string[] };
    "remove-target-group": string;
    "remove-target-exclusion": TargetItem;
  }
}
