import "@home-assistant/webawesome/dist/components/popover/popover";
import { consume } from "@lit/context";
// @ts-ignore
import chipStyles from "@material/chips/dist/mdc.chips.min.css";
import { mdiPlus, mdiTextureBox } from "@mdi/js";
import Fuse from "fuse.js";
import type { HassServiceTarget } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { ensureArray } from "../common/array/ensure-array";
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
import type { PickerComboBoxItem } from "./ha-picker-combo-box";
import "./ha-svg-icon";
import "./ha-tree-indicator";
import "./target-picker/ha-target-picker-item-group";
import "./target-picker/ha-target-picker-value-chip";

const SEPARATOR = "________";
const CREATE_ID = "___create-new-entity___";

@customElement("ha-target-picker")
export class HaTargetPicker extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value?: HassServiceTarget;

  @property() public helper?: string;

  @property({ type: Boolean, reflect: true }) public compact = false;

  @property({ attribute: false }) public createDomains?: string[];

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

  @state() private _configEntryLookup: Record<string, ConfigEntry> = {};

  @state()
  @consume({ context: labelsContext, subscribe: true })
  private _labelRegistry!: LabelRegistryEntry[];

  private _newTarget?: { type: TargetType; id: string };

  private _getDevicesMemoized = memoizeOne(getDevices);

  private _getLabelsMemoized = memoizeOne(getLabels);

  private _getEntitiesMemoized = memoizeOne(getEntities);

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

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    if (!this.hasUpdated) {
      this._loadConfigEntries();
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
      <div class="mdc-chip-set items">
        ${floorIds.length
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
          : nothing}
        ${areaIds.length
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
          : nothing}
        ${deviceIds.length
          ? deviceIds.map(
              (device_id) => html`
                <ha-target-picker-value-chip
                  .hass=${this.hass}
                  type="device"
                  .itemId=${device_id}
                  @remove-target-item=${this._handleRemove}
                  @expand-target-item=${this._handleExpand}
                ></ha-target-picker-value-chip>
              `
            )
          : nothing}
        ${entityIds.length
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
          : nothing}
        ${labelIds.length
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
          : nothing}
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
        ${entityIds.length
          ? html`
              <ha-target-picker-item-group
                @remove-target-item=${this._handleRemove}
                type="entity"
                .hass=${this.hass}
                .items=${{ entity: entityIds }}
                .deviceFilter=${this.deviceFilter}
                .entityFilter=${this.entityFilter}
                .includeDomains=${this.includeDomains}
                .includeDeviceClasses=${this.includeDeviceClasses}
              >
              </ha-target-picker-item-group>
            `
          : nothing}
        ${deviceIds.length
          ? html`
              <ha-target-picker-item-group
                @remove-target-item=${this._handleRemove}
                type="device"
                .hass=${this.hass}
                .items=${{ device: deviceIds }}
                .deviceFilter=${this.deviceFilter}
                .entityFilter=${this.entityFilter}
                .includeDomains=${this.includeDomains}
                .includeDeviceClasses=${this.includeDeviceClasses}
              >
              </ha-target-picker-item-group>
            `
          : nothing}
        ${floorIds.length || areaIds.length
          ? html`
              <ha-target-picker-item-group
                @remove-target-item=${this._handleRemove}
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
              >
              </ha-target-picker-item-group>
            `
          : nothing}
        ${labelIds.length
          ? html`
              <ha-target-picker-item-group
                @remove-target-item=${this._handleRemove}
                type="label"
                .hass=${this.hass}
                .items=${{ label: labelIds }}
                .deviceFilter=${this.deviceFilter}
                .entityFilter=${this.entityFilter}
                .includeDomains=${this.includeDomains}
                .includeDeviceClasses=${this.includeDeviceClasses}
              >
              </ha-target-picker-item-group>
            `
          : nothing}
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
          .rowRenderer=${this._renderRow}
          .getItems=${this._getItems}
          @value-changed=${this._targetPicked}
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

    const [type, id] = ev.detail.value.split(SEPARATOR);
    this._addTarget(id, type as TargetType);
  }

  private _addTarget(id: string, type: TargetType) {
    const typeId = `${type}_id`;

    if (typeId === "entity_id" && !isValidEntityId(id)) {
      return;
    }

    if (
      this.value &&
      this.value[typeId] &&
      ensureArray(this.value[typeId]).includes(id)
    ) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: this.value
        ? {
            ...this.value,
            [typeId]: this.value[typeId]
              ? [...ensureArray(this.value[typeId]), id]
              : id,
          }
        : { [typeId]: id },
    });

    this.shadowRoot
      ?.querySelector(
        `ha-target-picker-item-group[type='${this._newTarget?.type}']`
      )
      ?.removeAttribute("collapsed");
  }

  private _createNewDomainElement = (domain: string) => {
    showHelperDetailDialog(this, {
      domain,
      dialogClosedCallback: (item) => {
        if (item.entityId) {
          // prevent error that new entity_id isn't in hass object
          requestAnimationFrame(() => {
            this._addTarget(item.entityId!, "entity");
          });
        }
      },
    });
  };

  private _handleRemove(ev) {
    const { type, id } = ev.detail;
    fireEvent(this, "value-changed", {
      value: this._removeItem(this.value, type, id),
    });
  }

  private _handleExpand(ev) {
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
      Object.values(this.hass.devices).forEach((device) => {
        if (
          device.area_id === itemId &&
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
      Object.values(this.hass.entities).forEach((entity) => {
        if (
          entity.device_id === itemId &&
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
      | "areas"
      | "entities"
      | "devices"
      | "labels"
      | undefined =
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
      searchTerm: string,
      configEntryLookup: Record<string, ConfigEntry>,
      filterType?: TargetTypeFloorless
    ) => {
      const items: (
        | string
        | FloorComboBoxItem
        | EntityComboBoxItem
        | PickerComboBoxItem
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
            ? ensureArray(targetValue.entity_id)
            : undefined,
          undefined,
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
        let deviceItems = this._getDevicesMemoized(
          this.hass,
          configEntryLookup,
          includeDomains,
          undefined,
          includeDeviceClasses,
          deviceFilter,
          entityFilter,
          targetValue?.device_id
            ? ensureArray(targetValue.device_id)
            : undefined,
          undefined,
          `device${SEPARATOR}`
        ).sort(this._sortBySortingLabel);

        if (searchTerm) {
          deviceItems = this._filterGroup(
            "device",
            deviceItems,
            searchTerm,
            deviceComboBoxKeys
          );
        }

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
          targetValue?.area_id ? ensureArray(targetValue.area_id) : undefined,
          targetValue?.floor_id ? ensureArray(targetValue.floor_id) : undefined
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
          targetValue?.label_id ? ensureArray(targetValue.label_id) : undefined,
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
        weightedKeys,
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
    if (type === "area" || type === "floor") {
      rtl = computeRTL(this.hass);
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
        style=${(item as FloorComboBoxItem).type === "area" && hasFloor
          ? "--md-list-item-leading-space: var(--ha-space-12);"
          : ""}
      >
        ${(item as FloorComboBoxItem).type === "area" && hasFloor
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
                .end=${(
                  item as FloorComboBoxItem & { last?: boolean | undefined }
                ).last}
                slot="start"
              ></ha-tree-indicator>
            `
          : nothing}
        ${item.icon
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
                    .hass=${this.hass}
                  ></state-badge>
                `
              : type === "device" && (item as DevicePickerItem).domain
                ? html`
                    <img
                      slot="start"
                      alt=""
                      crossorigin="anonymous"
                      referrerpolicy="no-referrer"
                      src=${brandsUrl({
                        domain: (item as DevicePickerItem).domain!,
                        type: "icon",
                        darkOptimized: this.hass.themes.darkMode,
                      })}
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
                    : nothing}
        <span slot="headline">${item.primary}</span>
        ${item.secondary
          ? html`<span slot="supporting-text">${item.secondary}</span>`
          : nothing}
        ${(item as EntityComboBoxItem).stateObj && showEntityId
          ? html`
              <span slot="supporting-text" class="code">
                ${(item as EntityComboBoxItem).stateObj?.entity_id}
              </span>
            `
          : nothing}
        ${(item as EntityComboBoxItem).domain_name &&
        (type !== "entity" || !showEntityId)
          ? html`
              <div slot="trailing-supporting-text" class="domain">
                ${(item as EntityComboBoxItem).domain_name}
              </div>
            `
          : nothing}
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

  static get styles(): CSSResultGroup {
    return css`
      .add-target-wrapper {
        display: flex;
        justify-content: flex-start;
        margin-top: var(--ha-space-3);
      }

      ha-generic-picker {
        width: 100%;
      }

      ${unsafeCSS(chipStyles)}
      .items {
        z-index: 2;
      }
      .mdc-chip-set {
        padding: var(--ha-space-1) 0;
        gap: var(--ha-space-2);
      }

      .item-groups {
        overflow: hidden;
        border: 2px solid var(--divider-color);
        border-radius: var(--ha-border-radius-lg);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-target-picker": HaTargetPicker;
  }

  interface HASSDomEvents {
    "remove-target-item": {
      type: string;
      id: string;
    };
    "expand-target-item": {
      type: string;
      id: string;
    };
    "remove-target-group": string;
  }
}
