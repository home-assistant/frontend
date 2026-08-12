import "@home-assistant/webawesome/dist/components/popover/popover";
import { consume } from "@lit/context";
import { mdiPlus, mdiTextureBox } from "@mdi/js";
import Fuse from "fuse.js";
import type { HassServiceTarget } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
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
  devicesInEffectiveArea,
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
  areaMeetsFilter,
  deviceMeetsFilter,
  entityRegMeetsFilter,
  getTargetComboBoxItemType,
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
import "./ha-generic-picker";
import type { HaGenericPicker } from "./ha-generic-picker";
import type { PickerComboBoxItem } from "./ha-picker-combo-box";
import "./ha-svg-icon";
import "./ha-tree-indicator";
import "./target-picker/ha-target-picker-item-group";
import "./target-picker/ha-target-picker-value-chip";

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

  @property({ attribute: false }) public value?: HassServiceTarget;

  @property() public helper?: string;

  @property({ type: Boolean, reflect: true }) public compact = false;

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

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ attribute: "add-on-top", type: Boolean }) public addOnTop = false;

  @state() private _selectedSection?: TargetTypeFloorless;

  @state() private _replaceTarget?: TargetItem;

  @state() private _replaceTargetAnchor?: HTMLElement;

  @state() private _configEntryLookup: Record<string, ConfigEntry> = {};

  @state() private _compositeSplits?: DeviceCompositeSplits;

  private _loadingCompositeSplits = false;

  @state()
  @consume({ context: labelsContext, subscribe: true })
  private _labelRegistry!: LabelRegistryEntry[];

  @query("ha-generic-picker") private _picker?: HaGenericPicker;

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
    if (this.addOnTop) {
      return html` ${this._renderPicker()} ${this._renderItems()} `;
    }
    return html` ${this._renderItems()} ${this._renderPicker()} `;
  }

  private _renderValueChips() {
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
      ? ensureArray(this.value.label_id)
      : [];

    if (
      !entityIds.length &&
      !deviceIds.length &&
      !areaIds.length &&
      !floorIds.length &&
      !labelIds.length
    ) {
      return nothing;
    }

    return html`
      <div class="items">
        ${
          floorIds.length
            ? floorIds.map(
                (floor_id) => html`
                  <ha-target-picker-value-chip
                    .hass=${this.hass}
                    type="floor"
                    .itemId=${floor_id}
                    @remove-target-item=${this._handleRemove}
                    @expand-target-item=${this._handleExpand}
                  ></ha-target-picker-value-chip>
                `
              )
            : nothing
        }
        ${
          areaIds.length
            ? areaIds.map(
                (area_id) => html`
                  <ha-target-picker-value-chip
                    .hass=${this.hass}
                    type="area"
                    .itemId=${area_id}
                    @remove-target-item=${this._handleRemove}
                    @expand-target-item=${this._handleExpand}
                  ></ha-target-picker-value-chip>
                `
              )
            : nothing
        }
        ${
          deviceIds.length
            ? deviceIds.map(
                (device_id) => html`
                  <ha-target-picker-value-chip
                    .hass=${this.hass}
                    type="device"
                    .itemId=${device_id}
                    .compositeSplits=${this._compositeSplits}
                    @remove-target-item=${this._handleRemove}
                    @expand-target-item=${this._handleExpand}
                  ></ha-target-picker-value-chip>
                `
              )
            : nothing
        }
        ${
          entityIds.length
            ? entityIds.map(
                (entity_id) => html`
                  <ha-target-picker-value-chip
                    .hass=${this.hass}
                    type="entity"
                    .itemId=${entity_id}
                    @remove-target-item=${this._handleRemove}
                    @expand-target-item=${this._handleExpand}
                  ></ha-target-picker-value-chip>
                `
              )
            : nothing
        }
        ${
          labelIds.length
            ? labelIds.map(
                (label_id) => html`
                  <ha-target-picker-value-chip
                    .hass=${this.hass}
                    type="label"
                    .itemId=${label_id}
                    @remove-target-item=${this._handleRemove}
                    @expand-target-item=${this._handleExpand}
                  ></ha-target-picker-value-chip>
                `
              )
            : nothing
        }
      </div>
    `;
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

    if (
      !entityIds.length &&
      !deviceIds.length &&
      !areaIds.length &&
      !floorIds.length &&
      !labelIds.length
    ) {
      return nothing;
    }

    return html`
      <div class="item-groups">
        ${
          entityIds.length
            ? html`
                <ha-target-picker-item-group
                  @remove-target-item=${this._handleRemove}
                  @replace-target-item=${this._handleReplace}
                  type="entity"
                  .hass=${this.hass}
                  .items=${{ entity: entityIds }}
                  .deviceFilter=${this.deviceFilter}
                  .entityFilter=${this.entityFilter}
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
                  .items=${{ device: deviceIds }}
                  .deviceFilter=${this.deviceFilter}
                  .entityFilter=${this.entityFilter}
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
                  .items=${{
                    floor: floorIds,
                    area: areaIds,
                  }}
                  .deviceFilter=${this.deviceFilter}
                  .entityFilter=${this.entityFilter}
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
                  .items=${{ label: labelIds }}
                  .deviceFilter=${this.deviceFilter}
                  .entityFilter=${this.entityFilter}
                  .includeDomains=${this.includeDomains}
                  .includeDeviceClasses=${this.includeDeviceClasses}
                  .primaryEntitiesOnly=${this.primaryEntitiesOnly}
                >
                </ha-target-picker-item-group>
              `
            : nothing
        }
      </div>
    `;
  }

  private _renderItems() {
    return html`
      ${this.compact ? this._renderValueChips() : this._renderValueGroups()}
    `;
  }

  private _renderPicker() {
    const sections = [
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

    return html`
      <div class="add-target-wrapper">
        <ha-generic-picker
          .hass=${this.hass}
          popover-placement="bottom-start"
          .disabled=${this.disabled}
          .autofocus=${this.autofocus}
          .helper=${this.helper}
          .sections=${sections}
          .notFoundLabel=${this._noTargetFoundLabel}
          .emptyLabel=${this.hass.localize(
            "ui.components.target-picker.no_targets"
          )}
          .sectionTitleFunction=${this._sectionTitleFunction}
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
      </div>
    `;
  }

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

    return this._addTargetToValue(valueWithoutCurrent, newTarget);
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

    return value
      ? {
          ...value,
          [typeId]: value[typeId]
            ? [...ensureArray(value[typeId]), target.id]
            : target.id,
        }
      : { [typeId]: target.id };
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
      value: this._removeItem(this.value, type, id),
    });
  }

  private _handleExpand(ev: HASSDomEvent<HASSDomEvents["expand-target-item"]>) {
    const type = ev.detail.type;
    const itemId = ev.detail.id;
    const newAreas: string[] = [];
    const newDevices: string[] = [];
    const newEntities: string[] = [];

    if (type === "floor") {
      Object.values(this.hass.areas).forEach((area) => {
        if (
          area.floor_id === itemId &&
          !this.value!.area_id?.includes(area.area_id) &&
          areaMeetsFilter(
            area,
            this.hass.devices,
            this.hass.entities,
            this.deviceFilter,
            this.includeDomains,
            this.includeDeviceClasses,
            this.hass.states,
            this.entityFilter
          )
        ) {
          newAreas.push(area.area_id);
        }
      });
    } else if (type === "area") {
      // Splitting an area yields its effective-area devices, so a child device
      // that belongs to a different area is not pulled into this area.
      devicesInEffectiveArea(this.hass.devices, itemId).forEach((device) => {
        if (
          !this.value!.device_id?.includes(device.id) &&
          deviceMeetsFilter(
            device,
            this.hass.entities,
            this.deviceFilter,
            this.includeDomains,
            this.includeDeviceClasses,
            this.hass.states,
            this.entityFilter
          )
        ) {
          newDevices.push(device.id);
        }
      });
      Object.values(this.hass.entities).forEach((entity) => {
        if (
          entity.area_id === itemId &&
          !this.value!.entity_id?.includes(entity.entity_id) &&
          entityRegMeetsFilter(
            entity,
            false,
            this.includeDomains,
            this.includeDeviceClasses,
            this.hass.states,
            this.entityFilter
          )
        ) {
          newEntities.push(entity.entity_id);
        }
      });
    } else if (type === "device") {
      // Splitting a device into entities includes its child devices' entities,
      // since targeting the device would target its children too.
      const deviceIds = new Set([
        itemId,
        ...Object.values(this.hass.devices)
          .filter((device) => device.parent_device_id === itemId)
          .map((device) => device.id),
      ]);
      Object.values(this.hass.entities).forEach((entity) => {
        if (
          entity.device_id &&
          deviceIds.has(entity.device_id) &&
          !this.value!.entity_id?.includes(entity.entity_id) &&
          entityRegMeetsFilter(
            entity,
            false,
            this.includeDomains,
            this.includeDeviceClasses,
            this.hass.states,
            this.entityFilter
          )
        ) {
          newEntities.push(entity.entity_id);
        }
      });
    } else if (type === "label") {
      Object.values(this.hass.areas).forEach((area) => {
        if (
          area.labels.includes(itemId) &&
          !this.value!.area_id?.includes(area.area_id) &&
          areaMeetsFilter(
            area,
            this.hass.devices,
            this.hass.entities,
            this.deviceFilter,
            this.includeDomains,
            this.includeDeviceClasses,
            this.hass.states,
            this.entityFilter
          )
        ) {
          newAreas.push(area.area_id);
        }
      });
      Object.values(this.hass.devices).forEach((device) => {
        if (
          device.labels.includes(itemId) &&
          !this.value!.device_id?.includes(device.id) &&
          deviceMeetsFilter(
            device,
            this.hass.entities,
            this.deviceFilter,
            this.includeDomains,
            this.includeDeviceClasses,
            this.hass.states,
            this.entityFilter
          )
        ) {
          newDevices.push(device.id);
        }
      });
      Object.values(this.hass.entities).forEach((entity) => {
        if (
          entity.labels.includes(itemId) &&
          !this.value!.entity_id?.includes(entity.entity_id) &&
          entityRegMeetsFilter(
            entity,
            true,
            this.includeDomains,
            this.includeDeviceClasses,
            this.hass.states,
            this.entityFilter
          )
        ) {
          newEntities.push(entity.entity_id);
        }
      });
    } else {
      return;
    }
    let value = this.value;
    if (newEntities.length) {
      value = this._addItems(value, "entity_id", newEntities);
    }
    if (newDevices.length) {
      value = this._addItems(value, "device_id", newDevices);
    }
    if (newAreas.length) {
      value = this._addItems(value, "area_id", newAreas);
    }
    value = this._removeItem(value, type, itemId);
    fireEvent(this, "value-changed", { value });
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

  private _addItems(
    value: this["value"],
    type: string,
    ids: string[]
  ): this["value"] {
    return {
      ...value,
      [type]: value![type] ? ensureArray(value![type])!.concat(ids) : ids,
    };
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
    if (newVal.length) {
      return {
        ...value,
        [typeId]: newVal,
      };
    }
    const val = { ...value }!;
    delete val[typeId];
    if (Object.keys(val).length) {
      return val;
    }
    return undefined;
  }

  private _sectionTitleFunction = ({
    firstIndex,
    lastIndex,
    firstItem,
    secondItem,
    itemsCount,
  }: {
    firstIndex: number;
    lastIndex: number;
    firstItem: PickerComboBoxItem | string;
    secondItem: PickerComboBoxItem | string;
    itemsCount: number;
  }) => {
    if (
      firstItem === undefined ||
      secondItem === undefined ||
      typeof firstItem === "string" ||
      (typeof secondItem === "string" && secondItem !== "padding") ||
      (firstIndex === 0 && lastIndex === itemsCount - 1)
    ) {
      return undefined;
    }

    const type = getTargetComboBoxItemType(firstItem as PickerComboBoxItem);
    const translationType:
      "areas" | "entities" | "devices" | "labels" | undefined =
      type === "area" || type === "floor"
        ? "areas"
        : type === "entity"
          ? "entities"
          : type && type !== "empty"
            ? `${type}s`
            : undefined;

    return translationType
      ? this.hass.localize(
          `ui.components.target-picker.type.${translationType}`
        )
      : undefined;
  };

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
      filterType?: TargetTypeFloorless
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
        const excludeDeviceIds = selectedDeviceIds
          ? [
              ...selectedDeviceIds,
              ...Object.values(this.hass.devices)
                .filter(
                  (device) =>
                    device.parent_device_id !== null &&
                    selectedDeviceIds.includes(device.parent_device_id)
                )
                .map((device) => device.id),
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
    fireEvent(this, "value-changed", { value });
  }

  private _renderRow = (
    item:
      | PickerComboBoxItem
      | (FloorComboBoxItem & { last?: boolean | undefined })
      | EntityComboBoxItem
      | DevicePickerItem,
    index: number
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
        id=${`list-item-${index}`}
        tabindex="-1"
        .type=${type === "empty" ? "text" : "button"}
        class=${type === "empty" ? "empty" : ""}
        style=${
          ((item as FloorComboBoxItem).type === "area" && hasFloor) ||
          isChildDeviceRow
            ? "--md-list-item-leading-space: var(--ha-space-12);"
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

    .items {
      z-index: 2;
      display: flex;
      flex-wrap: wrap;
      padding: var(--ha-space-2) 0;
      gap: var(--ha-space-2);
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
    "expand-target-item": TargetItem;
    "replace-target-item": TargetItem;
    "migrate-target-item": { id: string; replacements: string[] };
    "remove-target-group": string;
  }
}
