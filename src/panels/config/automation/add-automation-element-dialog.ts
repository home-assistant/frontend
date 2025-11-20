import type { LitVirtualizer } from "@lit-labs/virtualizer";
import { consume } from "@lit/context";
import {
  mdiAppleKeyboardCommand,
  mdiClose,
  mdiContentPaste,
  mdiLabel,
  mdiPlus,
  mdiTextureBox,
} from "@mdi/js";
import Fuse, { type IFuseOptions } from "fuse.js";
import type {
  SingleHassServiceTarget,
  UnsubscribeFunc,
} from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import {
  customElement,
  eventOptions,
  property,
  query,
  state,
} from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { repeat } from "lit/directives/repeat";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { tinykeys } from "tinykeys";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeAreaName } from "../../../common/entity/compute_area_name";
import { computeDeviceName } from "../../../common/entity/compute_device_name";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeEntityNameList } from "../../../common/entity/compute_entity_name_display";
import { computeFloorName } from "../../../common/entity/compute_floor_name";
import { stringCompare } from "../../../common/string/compare";
import type {
  LocalizeFunc,
  LocalizeKeys,
} from "../../../common/translations/localize";
import { computeRTL } from "../../../common/util/compute_rtl";
import { debounce } from "../../../common/util/debounce";
import { deepEqual } from "../../../common/util/deep-equal";
import "../../../components/chips/ha-chip-set";
import "../../../components/chips/ha-filter-chip";
import "../../../components/entity/state-badge";
import "../../../components/ha-bottom-sheet";
import "../../../components/ha-button";
import "../../../components/ha-button-toggle-group";
import "../../../components/ha-combo-box-item";
import "../../../components/ha-dialog-header";
import "../../../components/ha-domain-icon";
import "../../../components/ha-floor-icon";
import "../../../components/ha-icon";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-button-prev";
import "../../../components/ha-icon-next";
import "../../../components/ha-md-divider";
import "../../../components/ha-md-list";
import "../../../components/ha-md-list-item";
import type { PickerComboBoxItem } from "../../../components/ha-picker-combo-box";
import "../../../components/ha-section-title";
import "../../../components/ha-service-icon";
import "../../../components/ha-tree-indicator";
import { TRIGGER_ICONS } from "../../../components/ha-trigger-icon";
import "../../../components/ha-wa-dialog";
import "../../../components/search-input";
import {
  ACTION_BUILDING_BLOCKS_GROUP,
  ACTION_COLLECTIONS,
  ACTION_ICONS,
} from "../../../data/action";
import {
  getAreasAndFloors,
  type AreaFloorValue,
  type FloorComboBoxItem,
} from "../../../data/area_floor";
import {
  getAreaDeviceLookup,
  getAreaEntityLookup,
} from "../../../data/area_registry";
import {
  DYNAMIC_PREFIX,
  getValueFromDynamic,
  isDynamic,
  type AutomationElementGroup,
  type AutomationElementGroupCollection,
} from "../../../data/automation";
import {
  CONDITION_BUILDING_BLOCKS_GROUP,
  CONDITION_COLLECTIONS,
  CONDITION_ICONS,
} from "../../../data/condition";
import {
  getConfigEntries,
  type ConfigEntry,
} from "../../../data/config_entries";
import { labelsContext } from "../../../data/context";
import {
  getDeviceEntityLookup,
  getDevices,
  type DevicePickerItem,
} from "../../../data/device_registry";
import {
  getEntities,
  type EntityComboBoxItem,
} from "../../../data/entity_registry";
import { getFloorAreaLookup } from "../../../data/floor_registry";
import { getServiceIcons, getTriggerIcons } from "../../../data/icons";
import type { DomainManifestLookup } from "../../../data/integration";
import {
  domainToName,
  fetchIntegrationManifests,
} from "../../../data/integration";
import {
  getLabels,
  type LabelRegistryEntry,
} from "../../../data/label_registry";
import {
  getTargetComboBoxItemType,
  getTriggersForTarget,
} from "../../../data/target";
import type { TriggerDescriptions } from "../../../data/trigger";
import {
  TRIGGER_COLLECTIONS,
  getTriggerDomain,
  getTriggerObjectId,
  subscribeTriggers,
} from "../../../data/trigger";
import type { HassDialog } from "../../../dialogs/make-dialog-manager";
import { KeyboardShortcutMixin } from "../../../mixins/keyboard-shortcut-mixin";
import { HaFuse } from "../../../resources/fuse";
import { loadVirtualizer } from "../../../resources/virtualizer";
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { isMac } from "../../../util/is_mac";
import { showToast } from "../../../util/toast";
import type HaAutomationAddFromTarget from "./add-automation-element/ha-automation-add-from-target";
import { TARGET_SEPARATOR } from "./add-automation-element/ha-automation-add-from-target";
import type { AddAutomationElementDialogParams } from "./show-add-automation-element-dialog";
import { PASTE_VALUE } from "./show-add-automation-element-dialog";

const TYPES = {
  trigger: { collections: TRIGGER_COLLECTIONS, icons: TRIGGER_ICONS },
  condition: {
    collections: CONDITION_COLLECTIONS,
    icons: CONDITION_ICONS,
  },
  action: {
    collections: ACTION_COLLECTIONS,
    icons: ACTION_ICONS,
  },
};

interface AutomationItemComboBoxItem extends PickerComboBoxItem {
  renderedIcon?: TemplateResult;
  type: "trigger" | "condition" | "action" | "block";
}

interface ListItem {
  key: string;
  name: string;
  description: string;
  iconPath?: string;
  icon?: TemplateResult;
}

const ENTITY_DOMAINS_OTHER = new Set([
  "date",
  "datetime",
  "device_tracker",
  "text",
  "time",
  "tts",
  "update",
  "weather",
  "image_processing",
]);

const ENTITY_DOMAINS_MAIN = new Set(["notify"]);

const ACTION_SERVICE_KEYWORDS = ["dynamicGroups", "helpers", "other"];

const SEARCH_SECTIONS = [
  "item",
  "block",
  "separator",
  "entity",
  "device",
  "area",
  "separator",
  "label",
] as const;

type SearchSection = "item" | "block" | "entity" | "device" | "area" | "label";

@customElement("add-automation-element-dialog")
class DialogAddAutomationElement
  extends KeyboardShortcutMixin(LitElement)
  implements HassDialog
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: AddAutomationElementDialogParams;

  @state() private _selectedCollectionIndex?: number;

  @state() private _selectedGroup?: string;

  @state() private _selectedTarget?: SingleHassServiceTarget;

  @state() private _tab: "targets" | "groups" | "blocks" = "targets";

  @state() private _filter = "";

  @state() private _manifests?: DomainManifestLookup;

  @state() private _domains?: Set<string>;

  @state() private _open = true;

  @state() private _itemsScrolled = false;

  @state() private _bottomSheetMode = false;

  @state() private _narrow = false;

  @state() private _triggerDescriptions: TriggerDescriptions = {};

  @state() private _selectedSearchSection?: SearchSection;

  @state() private _searchSectionTitle?: string;

  @state() private _searchListScrolled = false;

  @state() private _targetItems?: ListItem[];

  @state() private _loadItemsError = false;

  @state()
  @consume({ context: labelsContext, subscribe: true })
  private _labelRegistry!: LabelRegistryEntry[];

  @query("ha-automation-add-from-target")
  private _targetPickerElement?: HaAutomationAddFromTarget;

  @query(".items")
  private _itemsListElement?: HTMLDivElement;

  @query(".content")
  private _contentElement?: HTMLDivElement;

  @query("lit-virtualizer") private _virtualizerElement?: LitVirtualizer;

  private _fullScreen = false;

  private _removeKeyboardShortcuts?: () => void;

  private _unsub?: Promise<UnsubscribeFunc>;

  private _getDevicesMemoized = memoizeOne(getDevices);

  private _getLabelsMemoized = memoizeOne(getLabels);

  private _getEntitiesMemoized = memoizeOne(getEntities);

  private _getAreasAndFloorsMemoized = memoizeOne(getAreasAndFloors);

  private _configEntryLookup: Record<string, ConfigEntry> = {};

  private get _showEntityId() {
    return this.hass.userData?.showEntityIdPicker;
  }

  protected willUpdate(changedProps: PropertyValues) {
    if (!this.hasUpdated) {
      loadVirtualizer();
    }

    if (
      this._params?.type === "action" &&
      changedProps.has("hass") &&
      changedProps.get("hass")?.states !== this.hass.states
    ) {
      this._calculateUsedDomains();
    }
  }

  public showDialog(params): void {
    this._params = params;

    this.addKeyboardShortcuts();

    this._loadConfigEntries();

    if (this._params?.type === "action") {
      this.hass.loadBackendTranslation("services");
      this._fetchManifests();
      this._calculateUsedDomains();
      getServiceIcons(this.hass);
    }
    if (this._params?.type === "trigger") {
      this.hass.loadBackendTranslation("triggers");
      this._fetchManifests();
      getTriggerIcons(this.hass);
      this._unsub = subscribeTriggers(this.hass, (triggers) => {
        this._triggerDescriptions = {
          ...this._triggerDescriptions,
          ...triggers,
        };
      });
    }
    this._fullScreen = matchMedia(
      "all and (max-width: 450px), all and (max-height: 500px)"
    ).matches;

    window.addEventListener("resize", this._updateNarrow);
    this._updateNarrow();

    // prevent view mode switch when resizing window
    this._bottomSheetMode = this._narrow;
  }

  public closeDialog() {
    this.removeKeyboardShortcuts();
    if (this._unsub) {
      this._unsub.then((unsub) => unsub());
      this._unsub = undefined;
    }
    if (this._params) {
      fireEvent(this, "dialog-closed", { dialog: this.localName });
    }
    this._open = true;
    this._itemsScrolled = false;
    this._bottomSheetMode = false;
    this._params = undefined;
    this._selectedGroup = undefined;
    this._tab = "targets";
    this._selectedTarget = undefined;
    this._selectedCollectionIndex = undefined;
    this._filter = "";
    this._manifests = undefined;
    this._domains = undefined;
    this._selectedSearchSection = undefined;
    this._searchSectionTitle = undefined;
    this._searchListScrolled = false;
    this._configEntryLookup = {};
    this._targetItems = undefined;
    this._loadItemsError = false;
    return true;
  }

  private _getGroups = (
    type: AddAutomationElementDialogParams["type"],
    group?: string,
    collectionIndex?: number
  ): AutomationElementGroup => {
    if (group && collectionIndex !== undefined) {
      return (
        TYPES[type].collections[collectionIndex].groups[group].members || {
          [group]: {},
        }
      );
    }

    return TYPES[type].collections.reduce(
      (acc, collection) => ({ ...acc, ...collection.groups }),
      {} as AutomationElementGroup
    );
  };

  private _convertItemsToComboBoxItems = (
    items: ListItem[],
    type: "trigger" | "condition" | "action" | "block"
  ): AutomationItemComboBoxItem[] =>
    items.map(({ key, name, description, iconPath, icon }) => ({
      id: key,
      primary: name,
      secondary: description,
      iconPath,
      renderedIcon: icon,
      type,
      search_labels: [key, name, description],
    }));

  private _convertToItem = (
    key: string,
    options,
    type: AddAutomationElementDialogParams["type"],
    localize: LocalizeFunc
  ): ListItem => ({
    key,
    name: localize(
      // @ts-ignore
      `ui.panel.config.automation.editor.${type}s.${
        options.members ? "groups" : "type"
      }.${key}.label`
    ),
    description: localize(
      // @ts-ignore
      `ui.panel.config.automation.editor.${type}s.${
        options.members ? "groups" : "type"
      }.${key}.description${options.members ? "" : ".picker"}`
    ),
    iconPath: options.icon || TYPES[type].icons[key],
  });

  private _createFuseIndex = (states) =>
    Fuse.createIndex(["search_labels"], states);

  private _fuseIndexes = {
    area: memoizeOne((states: PickerComboBoxItem[]) =>
      this._createFuseIndex(states)
    ),
    entity: memoizeOne((states: PickerComboBoxItem[]) =>
      this._createFuseIndex(states)
    ),
    device: memoizeOne((states: PickerComboBoxItem[]) =>
      this._createFuseIndex(states)
    ),
    label: memoizeOne((states: PickerComboBoxItem[]) =>
      this._createFuseIndex(states)
    ),
    item: memoizeOne((states: PickerComboBoxItem[]) =>
      this._createFuseIndex(states)
    ),
    block: memoizeOne((states: PickerComboBoxItem[]) =>
      this._createFuseIndex(states)
    ),
  };

  private _filterGroup(
    type: SearchSection,
    items: (
      | FloorComboBoxItem
      | PickerComboBoxItem
      | EntityComboBoxItem
      | AutomationItemComboBoxItem
    )[],
    searchTerm: string,
    fuseOptions?: IFuseOptions<any>,
    checkExact?: (
      item:
        | FloorComboBoxItem
        | PickerComboBoxItem
        | EntityComboBoxItem
        | AutomationItemComboBoxItem
    ) => boolean
  ) {
    const fuseIndex = this._fuseIndexes[type](items);
    const fuse = new HaFuse<
      | FloorComboBoxItem
      | PickerComboBoxItem
      | EntityComboBoxItem
      | AutomationItemComboBoxItem
    >(
      items,
      fuseOptions || {
        shouldSort: false,
        minMatchCharLength: Math.min(searchTerm.length, 2),
      },
      fuseIndex
    );

    const results = fuse.multiTermsSearch(searchTerm);
    let filteredItems = items;
    if (results) {
      filteredItems = results.map((result) => result.item);
    }

    if (!checkExact) {
      return filteredItems;
    }

    // If there is exact match for entity id, put it first
    const index = filteredItems.findIndex((item) => checkExact(item));
    if (index === -1) {
      return filteredItems;
    }

    const [exactMatch] = filteredItems.splice(index, 1);
    filteredItems.unshift(exactMatch);

    return filteredItems;
  }

  private _getFilteredItems = memoizeOne(
    (
      type: AddAutomationElementDialogParams["type"],
      localize: HomeAssistant["localize"],
      searchTerm: string,
      configEntryLookup: Record<string, ConfigEntry>,
      services: HomeAssistant["services"],
      selectedSection?: SearchSection,
      manifests?: DomainManifestLookup
    ) => {
      const resultItems: (
        | string
        | FloorComboBoxItem
        | EntityComboBoxItem
        | PickerComboBoxItem
      )[] = [];

      if (!selectedSection || selectedSection === "item") {
        let items = this._convertItemsToComboBoxItems(
          this._items(type, localize, services, manifests),
          type
        );
        if (searchTerm) {
          items = this._filterGroup("item", items, searchTerm, {
            ignoreLocation: true,
            includeScore: true,
            minMatchCharLength: Math.min(2, this._filter.length),
          }) as AutomationItemComboBoxItem[];
        }

        if (!selectedSection && items.length) {
          // show group title
          resultItems.push(
            localize(`ui.panel.config.automation.editor.${type}s.name`)
          );
        }

        resultItems.push(...items);
      }

      if (
        type !== "trigger" &&
        (!selectedSection || selectedSection === "block")
      ) {
        const groups =
          type === "action"
            ? ACTION_BUILDING_BLOCKS_GROUP
            : type === "condition"
              ? CONDITION_BUILDING_BLOCKS_GROUP
              : {};

        let blocks = this._convertItemsToComboBoxItems(
          Object.keys(groups).map((key) =>
            this._convertToItem(key, {}, type, localize)
          ),
          "block"
        );

        if (searchTerm) {
          blocks = this._filterGroup("block", blocks, searchTerm, {
            ignoreLocation: true,
            includeScore: true,
            minMatchCharLength: Math.min(2, this._filter.length),
          }) as AutomationItemComboBoxItem[];
        }

        if (!selectedSection && blocks.length) {
          // show group title
          resultItems.push(
            localize("ui.panel.config.automation.editor.blocks")
          );
        }
        resultItems.push(...blocks);
      }

      if (!selectedSection || selectedSection === "entity") {
        let entityItems = this._getEntitiesMemoized(
          this.hass,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          `entity${TARGET_SEPARATOR}`
        );

        if (searchTerm) {
          entityItems = this._filterGroup(
            "entity",
            entityItems,
            searchTerm,
            undefined,
            (item: EntityComboBoxItem) =>
              item.stateObj?.entity_id === searchTerm
          ) as EntityComboBoxItem[];
        }

        if (!selectedSection && entityItems.length) {
          // show group title
          resultItems.push(
            localize("ui.components.target-picker.type.entities")
          );
        }

        resultItems.push(...entityItems);
      }

      if (!selectedSection || selectedSection === "device") {
        let deviceItems = this._getDevicesMemoized(
          this.hass,
          configEntryLookup,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          `device${TARGET_SEPARATOR}`
        );

        if (searchTerm) {
          deviceItems = this._filterGroup("device", deviceItems, searchTerm);
        }

        if (!selectedSection && deviceItems.length) {
          // show group title
          resultItems.push(
            localize("ui.components.target-picker.type.devices")
          );
        }

        resultItems.push(...deviceItems);
      }

      if (!selectedSection || selectedSection === "area") {
        let areasAndFloors = this._getAreasAndFloorsMemoized(
          this.hass.states,
          this.hass.floors,
          this.hass.areas,
          this.hass.devices,
          this.hass.entities,
          memoizeOne((value: AreaFloorValue): string =>
            [value.type, value.id].join(TARGET_SEPARATOR)
          ),
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          true
        );

        if (searchTerm) {
          areasAndFloors = this._filterGroup(
            "area",
            areasAndFloors,
            searchTerm
          ) as FloorComboBoxItem[];
        }

        if (!selectedSection && areasAndFloors.length) {
          // show group title
          resultItems.push(localize("ui.components.target-picker.type.areas"));
        }

        resultItems.push(
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

      if (!selectedSection || selectedSection === "label") {
        let labels = this._getLabelsMemoized(
          this.hass.states,
          this.hass.areas,
          this.hass.devices,
          this.hass.entities,
          this._labelRegistry,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          `label${TARGET_SEPARATOR}`
        );

        if (searchTerm) {
          labels = this._filterGroup("label", labels, searchTerm);
        }

        if (!selectedSection && labels.length) {
          // show group title
          resultItems.push(localize("ui.components.target-picker.type.labels"));
        }

        resultItems.push(...labels);
      }

      return resultItems;
    }
  );

  private _items = memoizeOne(
    (
      type: AddAutomationElementDialogParams["type"],
      localize: LocalizeFunc,
      services: HomeAssistant["services"],
      manifests?: DomainManifestLookup
    ): ListItem[] => {
      const groups = this._getGroups(type);

      const flattenGroups = (grp: AutomationElementGroup) =>
        Object.entries(grp).map(([key, options]) =>
          options.members
            ? flattenGroups(options.members)
            : this._convertToItem(key, options, type, localize)
        );

      const items = flattenGroups(groups).flat();
      if (type === "trigger") {
        items.push(...this._triggers(localize, this._triggerDescriptions));
      }
      if (type === "action") {
        items.push(...this._services(localize, services, manifests));
      }

      return items.filter(({ name }) => name);
    }
  );

  private _getCollections = memoizeOne(
    (
      type: AddAutomationElementDialogParams["type"],
      collections: AutomationElementGroupCollection[],
      domains: Set<string> | undefined,
      localize: LocalizeFunc,
      services: HomeAssistant["services"],
      triggerDescriptions: TriggerDescriptions,
      manifests?: DomainManifestLookup
    ): {
      titleKey?: LocalizeKeys;
      groups: ListItem[];
    }[] => {
      const generatedCollections: any = [];

      collections.forEach((collection) => {
        let collectionGroups = Object.entries(collection.groups);
        const groups: ListItem[] = [];

        if (
          type === "action" &&
          Object.keys(collection.groups).some((item) =>
            ACTION_SERVICE_KEYWORDS.includes(item)
          )
        ) {
          groups.push(
            ...this._serviceGroups(
              localize,
              services,
              manifests,
              domains,
              collection.groups.dynamicGroups
                ? undefined
                : collection.groups.helpers
                  ? "helper"
                  : "other"
            )
          );

          collectionGroups = collectionGroups.filter(
            ([key]) => !ACTION_SERVICE_KEYWORDS.includes(key)
          );
        }

        if (
          type === "trigger" &&
          Object.keys(collection.groups).some((item) =>
            ACTION_SERVICE_KEYWORDS.includes(item)
          )
        ) {
          groups.push(
            ...this._triggerGroups(
              localize,
              triggerDescriptions,
              manifests,
              domains,
              collection.groups.dynamicGroups
                ? undefined
                : collection.groups.helpers
                  ? "helper"
                  : "other"
            )
          );

          collectionGroups = collectionGroups.filter(
            ([key]) => !ACTION_SERVICE_KEYWORDS.includes(key)
          );
        }

        groups.push(
          ...collectionGroups.map(([key, options]) =>
            this._convertToItem(key, options, type, localize)
          )
        );

        generatedCollections.push({
          titleKey: collection.titleKey,
          groups: groups.sort((a, b) => {
            // make sure device is always on top
            if (a.key === "device" || a.key === "device_id") {
              return -1;
            }
            if (b.key === "device" || b.key === "device_id") {
              return 1;
            }
            return stringCompare(a.name, b.name, this.hass.locale.language);
          }),
        });
      });
      return generatedCollections;
    }
  );

  private _getBlockItems = memoizeOne(
    (
      type: AddAutomationElementDialogParams["type"],
      localize: LocalizeFunc
    ): ListItem[] => {
      const groups =
        type === "action"
          ? ACTION_BUILDING_BLOCKS_GROUP
          : CONDITION_BUILDING_BLOCKS_GROUP;

      const result = Object.entries(groups).map(([key, options]) =>
        this._convertToItem(key, options, type, localize)
      );

      return result.sort((a, b) =>
        stringCompare(a.name, b.name, this.hass.locale.language)
      );
    }
  );

  private _getGroupItems = memoizeOne(
    (
      type: AddAutomationElementDialogParams["type"],
      group: string,
      collectionIndex: number,
      domains: Set<string> | undefined,
      localize: LocalizeFunc,
      services: HomeAssistant["services"],
      manifests?: DomainManifestLookup
    ): ListItem[] => {
      if (type === "action" && isDynamic(group)) {
        return this._services(localize, services, manifests, group);
      }

      if (type === "trigger" && isDynamic(group)) {
        return this._triggers(localize, this._triggerDescriptions, group);
      }

      const groups = this._getGroups(type, group, collectionIndex);

      const result = Object.entries(groups).map(([key, options]) =>
        this._convertToItem(key, options, type, localize)
      );

      if (type === "action") {
        if (!this._selectedGroup) {
          result.unshift(
            ...this._serviceGroups(
              localize,
              services,
              manifests,
              domains,
              undefined
            )
          );
        } else if (this._selectedGroup === "helpers") {
          result.unshift(
            ...this._serviceGroups(
              localize,
              services,
              manifests,
              domains,
              "helper"
            )
          );
        } else if (this._selectedGroup === "other") {
          result.unshift(
            ...this._serviceGroups(
              localize,
              services,
              manifests,
              domains,
              "other"
            )
          );
        }
      }

      return result.sort((a, b) =>
        stringCompare(a.name, b.name, this.hass.locale.language)
      );
    }
  );

  private _serviceGroups = (
    localize: LocalizeFunc,
    services: HomeAssistant["services"],
    manifests: DomainManifestLookup | undefined,
    domains: Set<string> | undefined,
    type: "helper" | "other" | undefined
  ): ListItem[] => {
    if (!services || !manifests) {
      return [];
    }
    const result: ListItem[] = [];
    Object.keys(services).forEach((domain) => {
      const manifest = manifests[domain];
      const domainUsed = !domains ? true : domains.has(domain);
      if (
        (type === undefined &&
          (ENTITY_DOMAINS_MAIN.has(domain) ||
            (manifest?.integration_type === "entity" &&
              domainUsed &&
              !ENTITY_DOMAINS_OTHER.has(domain)))) ||
        (type === "helper" && manifest?.integration_type === "helper") ||
        (type === "other" &&
          !ENTITY_DOMAINS_MAIN.has(domain) &&
          (ENTITY_DOMAINS_OTHER.has(domain) ||
            (!domainUsed && manifest?.integration_type === "entity") ||
            !["helper", "entity"].includes(manifest?.integration_type || "")))
      ) {
        result.push({
          icon: html`
            <ha-domain-icon
              .hass=${this.hass}
              .domain=${domain}
              brand-fallback
            ></ha-domain-icon>
          `,
          key: `${DYNAMIC_PREFIX}${domain}`,
          name: domainToName(localize, domain, manifest),
          description: "",
        });
      }
    });
    return result.sort((a, b) =>
      stringCompare(a.name, b.name, this.hass.locale.language)
    );
  };

  private _triggerGroups = (
    localize: LocalizeFunc,
    triggers: TriggerDescriptions,
    manifests: DomainManifestLookup | undefined,
    domains: Set<string> | undefined,
    type: "helper" | "other" | undefined
  ): ListItem[] => {
    if (!triggers || !manifests) {
      return [];
    }
    const result: ListItem[] = [];
    const addedDomains = new Set<string>();
    Object.keys(triggers).forEach((trigger) => {
      const domain = getTriggerDomain(trigger);

      if (addedDomains.has(domain)) {
        return;
      }
      addedDomains.add(domain);

      const manifest = manifests[domain];
      const domainUsed = !domains ? true : domains.has(domain);

      if (
        (type === undefined &&
          (ENTITY_DOMAINS_MAIN.has(domain) ||
            (manifest?.integration_type === "entity" &&
              domainUsed &&
              !ENTITY_DOMAINS_OTHER.has(domain)))) ||
        (type === "helper" && manifest?.integration_type === "helper") ||
        (type === "other" &&
          !ENTITY_DOMAINS_MAIN.has(domain) &&
          (ENTITY_DOMAINS_OTHER.has(domain) ||
            (!domainUsed && manifest?.integration_type === "entity") ||
            !["helper", "entity"].includes(manifest?.integration_type || "")))
      ) {
        result.push({
          icon: html`
            <ha-domain-icon
              .hass=${this.hass}
              .domain=${domain}
              brand-fallback
            ></ha-domain-icon>
          `,
          key: `${DYNAMIC_PREFIX}${domain}`,
          name: domainToName(localize, domain, manifest),
          description: "",
        });
      }
    });
    return result.sort((a, b) =>
      stringCompare(a.name, b.name, this.hass.locale.language)
    );
  };

  private _triggers = memoizeOne(
    (
      localize: LocalizeFunc,
      triggers: TriggerDescriptions,
      group?: string
    ): ListItem[] => {
      if (!triggers) {
        return [];
      }

      return this._getTriggerListItems(
        localize,
        Object.keys(triggers).filter((trigger) => {
          const domain = getTriggerDomain(trigger);
          return !group || group === `${DYNAMIC_PREFIX}${domain}`;
        })
      );
    }
  );

  private _getTriggerListItems(
    localize: LocalizeFunc,
    triggerIds: string[]
  ): ListItem[] {
    return triggerIds.map((trigger) => {
      const domain = getTriggerDomain(trigger);
      const triggerName = getTriggerObjectId(trigger);

      return {
        icon: html`
          <ha-trigger-icon
            .hass=${this.hass}
            .trigger=${trigger}
          ></ha-trigger-icon>
        `,
        key: `${DYNAMIC_PREFIX}${trigger}`,
        name:
          localize(`component.${domain}.triggers.${triggerName}.name`) ||
          trigger,
        description:
          localize(`component.${domain}.triggers.${triggerName}.description`) ||
          trigger,
      };
    });
  }

  private _services = memoizeOne(
    (
      localize: LocalizeFunc,
      services: HomeAssistant["services"],
      manifests: DomainManifestLookup | undefined,
      group?: string
    ): ListItem[] => {
      if (!services) {
        return [];
      }
      const result: ListItem[] = [];

      let domain: string | undefined;

      if (isDynamic(group)) {
        domain = getValueFromDynamic(group!);
      }

      const addDomain = (dmn: string) => {
        const services_keys = Object.keys(services[dmn]);

        for (const service of services_keys) {
          result.push({
            icon: html`
              <ha-service-icon
                .hass=${this.hass}
                .service=${`${dmn}.${service}`}
              ></ha-service-icon>
            `,
            key: `${DYNAMIC_PREFIX}${dmn}.${service}`,
            name: `${domain ? "" : `${domainToName(localize, dmn)}: `}${
              this.hass.localize(`component.${dmn}.services.${service}.name`) ||
              services[dmn][service]?.name ||
              service
            }`,
            description:
              this.hass.localize(
                `component.${dmn}.services.${service}.description`
              ) ||
              services[dmn][service]?.description ||
              "",
          });
        }
      };

      if (domain) {
        addDomain(domain);
        return result.sort((a, b) =>
          stringCompare(a.name, b.name, this.hass.locale.language)
        );
      }

      if (group && !["helpers", "other"].includes(group)) {
        return [];
      }

      Object.keys(services)
        .sort()
        .forEach((dmn) => {
          const manifest = manifests?.[dmn];
          if (group === "helpers" && manifest?.integration_type !== "helper") {
            return;
          }
          if (
            group === "other" &&
            (ENTITY_DOMAINS_OTHER.has(dmn) ||
              ["helper", "entity"].includes(manifest?.integration_type || ""))
          ) {
            return;
          }
          addDomain(dmn);
        });

      return result;
    }
  );

  private async _fetchManifests() {
    const manifests = {};
    const fetched = await fetchIntegrationManifests(this.hass);
    for (const manifest of fetched) {
      manifests[manifest.domain] = manifest;
    }
    this._manifests = manifests;
  }

  private _calculateUsedDomains() {
    const domains = new Set(Object.keys(this.hass.states).map(computeDomain));
    if (!deepEqual(domains, this._domains)) {
      this._domains = domains;
    }
  }

  private _renderContent() {
    const automationElementType = this._params!.type;

    const items =
      !this._filter && this._tab === "blocks"
        ? this._getBlockItems(automationElementType, this.hass.localize)
        : !this._filter && this._tab === "groups" && this._selectedGroup
          ? this._getGroupItems(
              automationElementType,
              this._selectedGroup,
              this._selectedCollectionIndex ?? 0,
              this._domains,
              this.hass.localize,
              this.hass.services,
              this._manifests
            )
          : !this._filter &&
              this._tab === "targets" &&
              this._selectedTarget &&
              this._targetItems
            ? this._targetItems
            : undefined;

    const collections = this._getCollections(
      automationElementType,
      TYPES[automationElementType].collections,
      this._domains,
      this.hass.localize,
      this.hass.services,
      this._triggerDescriptions,
      this._manifests
    );

    const tabButtons = [
      {
        label: this.hass.localize(`ui.panel.config.automation.editor.targets`),
        value: "targets",
      },
      {
        label: this.hass.localize(
          `ui.panel.config.automation.editor.${automationElementType}s.name`
        ),
        value: "groups",
      },
    ];

    if (this._params?.type !== "trigger") {
      tabButtons.push({
        label: this.hass.localize("ui.panel.config.automation.editor.blocks"),
        value: "blocks",
      });
    }

    const hideCollections =
      this._filter ||
      this._tab === "blocks" ||
      (this._narrow && this._selectedGroup);

    return html`
      <div slot="header">
        ${this._renderHeader()}
        ${!this._narrow || (!this._selectedGroup && !this._selectedTarget)
          ? html`
              <search-input
                ?autofocus=${!this._narrow}
                .hass=${this.hass}
                .filter=${this._filter}
                @value-changed=${this._debounceFilterChanged}
                .label=${this.hass.localize(`ui.common.search`)}
                @focus=${this._onSearchFocus}
                @blur=${this._removeSearchKeybindings}
              ></search-input>
            `
          : nothing}
        ${this._filter ? this._renderSectionButtons() : nothing}
        ${!this._filter &&
        (!this._narrow || (!this._selectedGroup && !this._selectedTarget))
          ? html`<ha-button-toggle-group
              variant="neutral"
              active-variant="brand"
              .buttons=${tabButtons}
              .active=${this._tab}
              size="small"
              full-width
              @value-changed=${this._switchTab}
            ></ha-button-toggle-group>`
          : nothing}
      </div>
      <div
        class=${classMap({
          content: true,
          column: this._filter || (this._narrow && this._selectedTarget),
        })}
      >
        ${this._filter
          ? this._renderSearchResults()
          : this._tab === "targets"
            ? html`<ha-automation-add-from-target
                .hass=${this.hass}
                .value=${this._selectedTarget}
                @value-changed=${this._handleTargetSelected}
                .narrow=${this._narrow}
                class=${this._getAddFromTargetHidden()}
                .manifests=${this._manifests}
              ></ha-automation-add-from-target>`
            : html`
                <ha-md-list
                  class=${classMap({
                    groups: true,
                    hidden: hideCollections,
                  })}
                >
                  ${this._params!.clipboardItem
                    ? html`<ha-md-list-item
                          interactive
                          type="button"
                          class="paste"
                          .value=${PASTE_VALUE}
                          @click=${this._selected}
                        >
                          <div class="shortcut-label">
                            <div class="label">
                              <div>
                                ${this.hass.localize(
                                  `ui.panel.config.automation.editor.${automationElementType}s.paste`
                                )}
                              </div>
                              <div class="supporting-text">
                                ${this.hass.localize(
                                  // @ts-ignore
                                  `ui.panel.config.automation.editor.${automationElementType}s.type.${this._params.clipboardItem}.label`
                                )}
                              </div>
                            </div>
                            ${!this._narrow
                              ? html`<span class="shortcut">
                                  <span
                                    >${isMac
                                      ? html`<ha-svg-icon
                                          slot="start"
                                          .path=${mdiAppleKeyboardCommand}
                                        ></ha-svg-icon>`
                                      : this.hass.localize(
                                          "ui.panel.config.automation.editor.ctrl"
                                        )}</span
                                  >
                                  <span>+</span>
                                  <span>V</span>
                                </span>`
                              : nothing}
                          </div>
                          <ha-svg-icon
                            slot="start"
                            .path=${mdiContentPaste}
                          ></ha-svg-icon
                          ><ha-svg-icon
                            class="plus"
                            slot="end"
                            .path=${mdiPlus}
                          ></ha-svg-icon>
                        </ha-md-list-item>
                        <ha-md-divider
                          role="separator"
                          tabindex="-1"
                        ></ha-md-divider>`
                    : nothing}
                  ${collections.map(
                    (collection, index) => html`
                      ${collection.titleKey
                        ? html`<ha-section-title>
                            ${this.hass.localize(collection.titleKey)}
                          </ha-section-title>`
                        : nothing}
                      ${repeat(
                        collection.groups,
                        (item) => item.key,
                        (item) => html`
                          <ha-md-list-item
                            interactive
                            type="button"
                            .value=${item.key}
                            .index=${index}
                            @click=${this._groupSelected}
                            class=${item.key === this._selectedGroup
                              ? "selected"
                              : ""}
                          >
                            <div slot="headline">${item.name}</div>
                            ${item.icon
                              ? html`<span slot="start">${item.icon}</span>`
                              : item.iconPath
                                ? html`<ha-svg-icon
                                    slot="start"
                                    .path=${item.iconPath}
                                  ></ha-svg-icon>`
                                : nothing}
                            ${this._narrow
                              ? html`<ha-icon-next slot="end"></ha-icon-next>`
                              : nothing}
                          </ha-md-list-item>
                        `
                      )}
                    `
                  )}
                </ha-md-list>
              `}
        ${!this._filter
          ? html`
              <div
                class=${classMap({
                  items: true,
                  blank:
                    (this._tab === "groups" && !this._selectedGroup) ||
                    (this._tab === "targets" && !this._selectedTarget) ||
                    (this._tab === "targets" &&
                      this._selectedTarget &&
                      (this._loadItemsError || (items && !items.length))),
                  hidden:
                    this._narrow &&
                    !this._selectedGroup &&
                    (!this._selectedTarget ||
                      (this._selectedTarget &&
                        !Object.values(this._selectedTarget)[0])) &&
                    this._tab !== "blocks",
                  error: this._tab === "targets" && this._loadItemsError,
                })}
                @scroll=${this._onItemsScroll}
              >
                ${this._tab === "groups" && !this._selectedGroup
                  ? this.hass.localize(
                      `ui.panel.config.automation.editor.${automationElementType}s.select`
                    )
                  : this._tab === "targets" && !this._selectedTarget
                    ? this.hass.localize(
                        "ui.panel.config.automation.editor.select_target"
                      )
                    : this._tab === "targets" &&
                        this._selectedTarget &&
                        this._loadItemsError
                      ? html`${this.hass.localize(
                            "ui.panel.config.automation.editor.load_target_items_failed"
                          )}
                          <div>
                            ${this._renderTarget(this._selectedTarget)}
                          </div>`
                      : this._tab === "targets" &&
                          this._selectedTarget &&
                          items &&
                          !items.length
                        ? html`${this.hass.localize(
                              `ui.panel.config.automation.editor.${automationElementType}s.no_items_for_target`
                            )}
                            <div>
                              ${this._renderTarget(this._selectedTarget)}
                            </div>`
                        : this._renderItemList(
                            this.hass.localize(
                              `ui.panel.config.automation.editor.${automationElementType}s.name`
                            ),
                            items
                          )}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _renderItemList(title, items?: ListItem[]) {
    if (!items || !items.length) {
      return nothing;
    }

    return html`
      <div class="items-title ${this._itemsScrolled ? "scrolled" : ""}">
        ${this._tab === "blocks" && !this._filter
          ? this.hass.localize("ui.panel.config.automation.editor.blocks")
          : title}
      </div>
      <ha-md-list
        dialogInitialFocus=${ifDefined(this._fullScreen ? "" : undefined)}
      >
        ${repeat(
          items,
          (item) => item.key,
          (item) => html`
            <ha-md-list-item
              interactive
              type="button"
              .value=${item.key}
              .group=${item.group}
              @click=${this._selected}
            >
              <div slot="headline">${item.name}</div>
              <div slot="supporting-text">${item.description}</div>
              ${item.icon
                ? html`<span slot="start">${item.icon}</span>`
                : item.iconPath
                  ? html`<ha-svg-icon
                      slot="start"
                      .path=${item.iconPath}
                    ></ha-svg-icon>`
                  : nothing}
              ${item.group
                ? html`<ha-icon-next slot="end"></ha-icon-next>`
                : html`<ha-svg-icon
                    slot="end"
                    class="plus"
                    .path=${mdiPlus}
                  ></ha-svg-icon>`}
            </ha-md-list-item>
          `
        )}
      </ha-md-list>
    `;
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    if (this._bottomSheetMode) {
      return html`
        <ha-bottom-sheet
          .open=${this._open}
          @closed=${this.closeDialog}
          flexcontent
        >
          ${this._renderContent()}
        </ha-bottom-sheet>
      `;
    }

    return html`
      <ha-wa-dialog
        width="large"
        .open=${this._open}
        @closed=${this.closeDialog}
        flexcontent
      >
        ${this._renderContent()}
      </ha-wa-dialog>
    `;
  }

  private _renderSectionButtons() {
    return html`
      <ha-chip-set class="sections">
        ${SEARCH_SECTIONS.map((section) =>
          section === "separator"
            ? html`<div class="separator"></div>`
            : this._params!.type !== "trigger" || section !== "block"
              ? html`<ha-filter-chip
                  @click=${this._toggleSection}
                  .section-id=${section}
                  .selected=${this._selectedSearchSection === section}
                  .label=${this._getSearchSectionLabel(section)}
                >
                </ha-filter-chip>`
              : nothing
        )}
      </ha-chip-set>
    `;
  }

  private _renderSearchResults() {
    const items = this._getFilteredItems(
      this._params!.type,
      this.hass.localize,
      this._filter,
      this._configEntryLookup,
      this.hass.services,
      this._selectedSearchSection,
      this._manifests
    );

    if (!items.length) {
      const emptySearchTranslation = !this._selectedSearchSection
        ? `ui.panel.config.automation.editor.${this._params!.type}s.empty_search.global`
        : this._selectedSearchSection === "item"
          ? `ui.panel.config.automation.editor.${this._params!.type}s.empty_search.item`
          : `ui.panel.config.automation.editor.empty_section_search.${this._selectedSearchSection}`;

      return html`<div class="empty-search">
        ${this.hass.localize(emptySearchTranslation as LocalizeKeys, {
          term: html`<b>‘${this._filter}’</b>`,
        })}
      </div>`;
    }

    return html`<div class="search-results">
      <div class="section-title-wrapper">
        ${!this._selectedSearchSection && this._searchSectionTitle
          ? html`<ha-section-title>
              ${this._searchSectionTitle}
            </ha-section-title>`
          : nothing}
      </div>
      <lit-virtualizer
        .keyFunction=${this._keyFunction}
        tabindex="0"
        scroller
        .items=${items}
        .renderItem=${this._renderSearchResultRow}
        style="min-height: 36px;"
        class=${this._searchListScrolled ? "scrolled" : ""}
        @scroll=${this._onScrollSearchList}
        @focus=${this._focusSearchList}
        @visibilityChanged=${this._visibilityChanged}
      >
      </lit-virtualizer>
    </div>`;
  }

  private _renderSearchResultRow = (
    item:
      | PickerComboBoxItem
      | (FloorComboBoxItem & { last?: boolean | undefined })
      | EntityComboBoxItem
      | DevicePickerItem
      | AutomationItemComboBoxItem,
    index: number
  ) => {
    if (!item) {
      return nothing;
    }

    if (typeof item === "string") {
      return html`<ha-section-title>${item}</ha-section-title>`;
    }

    const type = ["trigger", "condition", "action", "block"].includes(
      (item as AutomationItemComboBoxItem).type
    )
      ? "item"
      : getTargetComboBoxItemType(item);
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
        .value=${item}
        @click=${this._selectSearchResult}
      >
        ${(item as FloorComboBoxItem).type === "area" && hasFloor
          ? html`
              <ha-tree-indicator
                style=${styleMap({
                  width: "var(--ha-space-12)",
                  position: "absolute",
                  top: "var(--ha-space-0)",
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
        ${type === "item"
          ? html`<ha-svg-icon
              class="plus"
              slot="end"
              .path=${mdiPlus}
            ></ha-svg-icon>`
          : this._narrow
            ? html`<ha-icon-next slot="end"></ha-icon-next>`
            : nothing}
      </ha-combo-box-item>
    `;
  };

  private _selectSearchResult = (ev: Event) => {
    ev.stopPropagation();
    const value = (ev.currentTarget as any).value as
      | PickerComboBoxItem
      | FloorComboBoxItem
      | EntityComboBoxItem
      | DevicePickerItem
      | AutomationItemComboBoxItem;

    if (!value) {
      return;
    }

    this._selectSearchItem(value);
  };

  private _selectSearchItem(
    item:
      | PickerComboBoxItem
      | FloorComboBoxItem
      | EntityComboBoxItem
      | DevicePickerItem
      | AutomationItemComboBoxItem
  ) {
    if (
      (item as AutomationItemComboBoxItem).type &&
      !["floor", "area"].includes((item as AutomationItemComboBoxItem).type)
    ) {
      this._params!.add(item.id);
      this.closeDialog();
    }

    const targetType = getTargetComboBoxItemType(item);
    this._filter = "";
    this._selectedTarget = {
      [`${targetType}_id`]: item.id.split(TARGET_SEPARATOR, 2)[1],
    };
    this._tab = "targets";
  }

  @eventOptions({ passive: true })
  private _onScrollSearchList(ev) {
    const top = ev.target.scrollTop ?? 0;
    this._searchListScrolled = top > 0;
  }

  @eventOptions({ passive: true })
  private _visibilityChanged(ev) {
    if (this._virtualizerElement) {
      const firstItem = this._virtualizerElement.items[ev.first];
      const secondItem = this._virtualizerElement.items[ev.first + 1];

      if (
        firstItem === undefined ||
        secondItem === undefined ||
        typeof firstItem === "string" ||
        typeof secondItem === "string" ||
        ev.first === 0 ||
        (ev.first === 0 &&
          ev.last === this._virtualizerElement.items.length - 1)
      ) {
        this._searchSectionTitle = undefined;
        return;
      }

      let section: SearchSection;

      if (
        (firstItem as AutomationItemComboBoxItem).type &&
        !["area", "floor"].includes(
          (firstItem as AutomationItemComboBoxItem).type
        )
      ) {
        section = (firstItem as AutomationItemComboBoxItem)
          .type as SearchSection;
      } else {
        section = getTargetComboBoxItemType(firstItem as any) as SearchSection;
      }

      this._searchSectionTitle = this._getSearchSectionLabel(section);
    }
  }

  private _getSearchSectionLabel(section: SearchSection) {
    if (section === "block") {
      return this.hass.localize("ui.panel.config.automation.editor.blocks");
    }

    if (
      section === "item" ||
      ["trigger", "condition", "action"].includes(section)
    ) {
      return this.hass.localize(
        `ui.panel.config.automation.editor.${this._params!.type}s.name`
      );
    }

    return this.hass.localize(
      `ui.components.target-picker.type.${section === "entity" ? "entities" : `${section as "area" | "device" | "floor"}s`}` as LocalizeKeys
    );
  }

  private _keyFunction = (item: PickerComboBoxItem | string) =>
    typeof item === "string" ? item : item.id;

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("resize", this._updateNarrow);
    this._removeSearchKeybindings();
  }

  private _toggleSection(ev: Event) {
    ev.stopPropagation();
    // this._resetSelectedItem();
    this._searchSectionTitle = undefined;
    const section = (ev.target as HTMLElement)["section-id"] as string;
    if (!section) {
      return;
    }
    if (this._selectedSearchSection === section) {
      this._selectedSearchSection = undefined;
    } else {
      this._selectedSearchSection = section as SearchSection;
    }

    // Reset scroll position when filter changes
    if (this._virtualizerElement) {
      this._virtualizerElement.scrollToIndex(0);
    }
  }

  private _updateNarrow = () => {
    this._narrow =
      window.matchMedia("(max-width: 870px)").matches ||
      window.matchMedia("(max-height: 500px)").matches;
  };

  private _close() {
    this._open = false;
  }

  private _back() {
    if (this._selectedTarget) {
      this._targetPickerElement?.navigateBack();
      return;
    }
    this._selectedGroup = undefined;
  }

  private _groupSelected(ev) {
    const group = ev.currentTarget;
    if (this._selectedGroup === group.value) {
      this._selectedGroup = undefined;
      this._selectedCollectionIndex = undefined;
      return;
    }
    this._selectedGroup = group.value;
    this._selectedCollectionIndex = ev.currentTarget.index;
    requestAnimationFrame(() => {
      this._itemsListElement?.scrollTo(0, 0);
    });
  }

  private _selected(ev) {
    const item = ev.currentTarget;
    this._params!.add(item.value);
    this.closeDialog();
  }

  private _handleTargetSelected = (
    ev: CustomEvent<{ value: SingleHassServiceTarget }>
  ) => {
    this._targetItems = undefined;
    this._loadItemsError = false;
    this._selectedTarget = ev.detail.value;

    requestAnimationFrame(() => {
      if (this._narrow) {
        this._contentElement?.scrollTo(0, 0);
      } else {
        this._itemsListElement?.scrollTo(0, 0);
      }
    });

    this._getItemsByTarget();
  };

  private async _getItemsByTarget() {
    if (!this._selectedTarget) {
      return;
    }

    try {
      let items: string[] = [];
      if (this._params!.type === "trigger") {
        items = await getTriggersForTarget(
          this.hass.callWS,
          this._selectedTarget,
          true
        );
      } else {
        throw new Error("Not implemented");
      }

      this._targetItems = this._getTriggerListItems(this.hass.localize, items);
    } catch (err) {
      this._loadItemsError = true;
      // eslint-disable-next-line no-console
      console.error(`Error fetching ${this._params!.type}s for target`, err);
    }
  }

  private _debounceFilterChanged = debounce(
    (ev) => this._filterChanged(ev),
    200
  );

  private _filterChanged = (ev) => {
    this._filter = ev.detail.value;
  };

  private _addClipboard = () => {
    if (this._params?.clipboardItem) {
      this._params!.add(PASTE_VALUE);
      showToast(this, {
        message: this.hass.localize(
          "ui.panel.config.automation.editor.item_pasted",
          {
            item: this.hass.localize(
              // @ts-ignore
              `ui.panel.config.automation.editor.${this._params.type}s.type.${this._params.clipboardItem}.label`
            ),
          }
        ),
      });
      this.closeDialog();
    }
  };

  protected supportedShortcuts(): SupportedShortcuts {
    return {
      v: () => this._addClipboard(),
    };
  }

  private _switchTab(ev) {
    this._tab = ev.detail.value;
  }

  @eventOptions({ passive: true })
  private _onItemsScroll(ev) {
    const top = ev.target.scrollTop ?? 0;
    this._itemsScrolled = top > 0;
  }

  private _onSearchFocus(ev) {
    this._removeKeyboardShortcuts = tinykeys(ev.target, {
      ArrowDown: this._focusSearchList,
      Enter: this._pickSingleItem,
    });
  }

  private _removeSearchKeybindings() {
    this._removeKeyboardShortcuts?.();
  }

  private _focusSearchList = (ev) => {
    if (!this._filter) {
      return;
    }

    ev.preventDefault();
    // TODO
    // if (this._selectedItemIndex === -1) {
    //   this._selectNextItem();
    // }
  };

  private _pickSingleItem = (ev: KeyboardEvent) => {
    if (!this._filter) {
      return;
    }

    ev.preventDefault();
    const automationElementType = this._params!.type;

    const items = this._getFilteredItems(
      automationElementType,
      this.hass.localize,
      this._filter,
      this._configEntryLookup,
      this.hass.services,
      this._selectedSearchSection,
      this._manifests
    ).filter(
      (item) => typeof item !== "string"
    ) as AutomationItemComboBoxItem[];

    if (items.length !== 1) {
      return;
    }

    this._selectSearchItem(items[0]);
  };

  private _renderHeader() {
    return html`
      <ha-dialog-header subtitle-position="above">
        <span slot="title">${this._getDialogTitle()}</span>

        ${this._renderDialogSubtitle()}
        ${this._narrow && (this._selectedGroup || this._selectedTarget)
          ? html`<ha-icon-button-prev
              slot="navigationIcon"
              @click=${this._back}
            ></ha-icon-button-prev>`
          : html`<ha-icon-button
              .path=${mdiClose}
              @click=${this._close}
              slot="navigationIcon"
            ></ha-icon-button>`}
      </ha-dialog-header>
    `;
  }

  private _getSelectedTargetIcon(
    selectedTarget: SingleHassServiceTarget
  ): TemplateResult | typeof nothing {
    const [targetType, targetId] =
      this._extractTypeAndIdFromTarget(selectedTarget);

    if (!targetId) {
      return nothing;
    }

    if (targetType === "floor" && this.hass.floors[targetId]) {
      return html`<ha-floor-icon
        .floor=${this.hass.floors[targetId]}
      ></ha-floor-icon>`;
    }

    if (targetType === "area" && this.hass.areas[targetId]) {
      const area = this.hass.areas[targetId];
      if (area.icon) {
        return html`<ha-icon .icon=${area.icon}></ha-icon>`;
      }
      return html`<ha-svg-icon .path=${mdiTextureBox}></ha-svg-icon>`;
    }

    if (targetType === "device" && this.hass.devices[targetId]) {
      const device = this.hass.devices[targetId];
      const configEntry = device.primary_config_entry
        ? this._configEntryLookup?.[device.primary_config_entry]
        : undefined;
      const domain = configEntry?.domain;

      if (domain) {
        return html`<img
          slot="start"
          alt=""
          crossorigin="anonymous"
          referrerpolicy="no-referrer"
          src=${brandsUrl({
            domain,
            type: "icon",
            darkOptimized: this.hass.themes?.darkMode,
          })}
        />`;
      }
    }

    if (targetType === "entity" && this.hass.states[targetId]) {
      const stateObj = this.hass.states[targetId];
      if (stateObj) {
        return html`<state-badge
          .stateObj=${stateObj}
          .hass=${this.hass}
          .stateColor=${false}
        ></state-badge>`;
      }
    }

    if (targetType === "label") {
      const label = this._getLabel(targetId);
      if (label?.icon) {
        return html`<ha-icon .icon=${label.icon}></ha-icon>`;
      }
      return html`<ha-svg-icon .path=${mdiLabel}></ha-svg-icon>`;
    }

    return nothing;
  }

  private _getLabel = memoizeOne((labelId) =>
    this._labelRegistry?.find(({ label_id }) => label_id === labelId)
  );

  private _getSelectedTargetLabel(
    selectedTarget: SingleHassServiceTarget
  ): string | undefined {
    const [targetType, targetId] =
      this._extractTypeAndIdFromTarget(selectedTarget);

    if (targetId === undefined && targetType === "floor") {
      return this.hass.localize(
        "ui.panel.config.automation.editor.other_areas"
      );
    }

    if (targetId === undefined && targetType === "area") {
      return this.hass.localize(
        "ui.panel.config.automation.editor.unassigned_devices"
      );
    }

    if (targetId === undefined && targetType === "service") {
      return this.hass.localize("ui.panel.config.automation.editor.services");
    }

    if (targetId === undefined && targetType === "device") {
      return this.hass.localize(
        "ui.panel.config.automation.editor.unassigned_entities"
      );
    }

    if (targetId === undefined && targetType === "helper") {
      return this.hass.localize("ui.panel.config.automation.editor.helpers");
    }

    if (targetId) {
      if (targetType === "floor") {
        return computeFloorName(this.hass.floors[targetId]) || targetId;
      }
      if (targetType === "area") {
        return computeAreaName(this.hass.areas[targetId]) || targetId;
      }
      if (targetType === "device") {
        return computeDeviceName(this.hass.devices[targetId]) || targetId;
      }
      if (targetType === "entity" && this.hass.states[targetId]) {
        const stateObj = this.hass.states[targetId];
        const [entityName, deviceName] = computeEntityNameList(
          stateObj,
          [{ type: "entity" }, { type: "device" }, { type: "area" }],
          this.hass.entities,
          this.hass.devices,
          this.hass.areas,
          this.hass.floors
        );

        return entityName || deviceName || targetId;
      }
      if (targetType === "label") {
        const label = this._getLabel(targetId);
        return label?.name || targetId;
      }
    }

    return undefined;
  }

  private _getDialogTitle() {
    if (this._narrow && this._selectedGroup) {
      return isDynamic(this._selectedGroup)
        ? domainToName(
            this.hass.localize,
            getValueFromDynamic(this._selectedGroup!),
            this._manifests?.[getValueFromDynamic(this._selectedGroup!)]
          )
        : this.hass.localize(
            `ui.panel.config.automation.editor.${this._params!.type}s.groups.${this._selectedGroup}.label` as LocalizeKeys
          ) ||
            this.hass.localize(
              `ui.panel.config.automation.editor.${this._params!.type}s.type.${this._selectedGroup}.label` as LocalizeKeys
            );
    }

    if (this._narrow && this._selectedTarget) {
      const targetTitle = this._getSelectedTargetLabel(this._selectedTarget);
      if (targetTitle) {
        return targetTitle;
      }
    }

    return this.hass.localize(
      `ui.panel.config.automation.editor.${this._params!.type}s.add`
    );
  }

  private _renderDialogSubtitle() {
    if (!this._narrow) {
      return nothing;
    }

    if (this._selectedGroup) {
      return html`<span slot="subtitle"
        >${this.hass.localize(
          `ui.panel.config.automation.editor.${this._params!.type}s.add`
        )}</span
      >`;
    }

    if (this._selectedTarget) {
      let subtitle: string | undefined;
      const [targetType, targetId] = this._extractTypeAndIdFromTarget(
        this._selectedTarget
      );

      if (targetId) {
        if (targetType === "area" && this.hass.areas[targetId].floor_id) {
          const floorId = this.hass.areas[targetId].floor_id;
          subtitle = computeFloorName(this.hass.floors[floorId]) || floorId;
        }
        if (targetType === "device" && this.hass.devices[targetId].area_id) {
          const areaId = this.hass.devices[targetId].area_id;
          subtitle = computeAreaName(this.hass.areas[areaId]) || areaId;
        }
        if (targetType === "entity" && this.hass.states[targetId]) {
          const stateObj = this.hass.states[targetId];
          const [entityName, deviceName, areaName] = computeEntityNameList(
            stateObj,
            [{ type: "entity" }, { type: "device" }, { type: "area" }],
            this.hass.entities,
            this.hass.devices,
            this.hass.areas,
            this.hass.floors
          );

          subtitle = [areaName, entityName ? deviceName : undefined]
            .filter(Boolean)
            .join(computeRTL(this.hass) ? " ◂ " : " ▸ ");
        }
      }

      if (subtitle) {
        return html`<span slot="subtitle">${subtitle}</span>`;
      }
    }

    return nothing;
  }

  private _renderTarget = memoizeOne(
    (selectedTarget?: SingleHassServiceTarget) => {
      if (!selectedTarget) {
        return nothing;
      }

      return html`<span class="selected-target"
        >${this._getSelectedTargetIcon(
          selectedTarget
        )}${this._getSelectedTargetLabel(selectedTarget)}</span
      >`;
    }
  );

  private _getFloorAreaLookupMemoized = memoizeOne(
    (areas: HomeAssistant["areas"]) => getFloorAreaLookup(Object.values(areas))
  );

  private _getAreaDeviceLookupMemoized = memoizeOne(
    (devices: HomeAssistant["devices"]) =>
      getAreaDeviceLookup(Object.values(devices))
  );

  private _getAreaEntityLookupMemoized = memoizeOne(
    (entities: HomeAssistant["entities"]) =>
      getAreaEntityLookup(Object.values(entities), true)
  );

  private _getDeviceEntityLookupMemoized = memoizeOne(
    (entities: HomeAssistant["entities"]) =>
      getDeviceEntityLookup(Object.values(entities), true)
  );

  private _extractTypeAndIdFromTarget = memoizeOne(
    (target: SingleHassServiceTarget): [string, string | undefined] => {
      const [targetTypeId, targetId] = Object.entries(target)[0];
      const targetType = targetTypeId.replace("_id", "");
      return [targetType, targetId];
    }
  );

  private _getAddFromTargetHidden() {
    if (this._narrow && this._selectedTarget) {
      const [targetType, targetId] = this._extractTypeAndIdFromTarget(
        this._selectedTarget
      );

      if (
        targetId &&
        ((targetType === "floor" &&
          !(
            this._getFloorAreaLookupMemoized(this.hass.areas)[targetId]
              ?.length > 0
          )) ||
          (targetType === "area" &&
            !(
              this._getAreaDeviceLookupMemoized(this.hass.devices)[targetId]
                ?.length > 0
            ) &&
            !(
              this._getAreaEntityLookupMemoized(this.hass.entities)[targetId]
                ?.length > 0
            )) ||
          (targetType === "device" &&
            !(
              this._getDeviceEntityLookupMemoized(this.hass.entities)[targetId]
                ?.length > 0
            )) ||
          targetType === "entity")
      ) {
        return "hidden";
      }
    }

    return "";
  }

  private async _loadConfigEntries() {
    const configEntries = await getConfigEntries(this.hass);
    this._configEntryLookup = Object.fromEntries(
      configEntries.map((entry) => [entry.entry_id, entry])
    );
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        ha-bottom-sheet {
          --ha-bottom-sheet-height: 90vh;
          --ha-bottom-sheet-height: calc(100dvh - var(--ha-space-12));
          --ha-bottom-sheet-max-height: var(--ha-bottom-sheet-height);
          --ha-bottom-sheet-max-width: 888px;
          --ha-bottom-sheet-padding: var(--ha-space-0);
          --ha-bottom-sheet-surface-background: var(--card-background-color);
        }

        ha-wa-dialog {
          --dialog-content-padding: var(--ha-space-0);
          --ha-dialog-min-height: min(
            648px,
            calc(
              100vh - max(
                  var(--safe-area-inset-bottom),
                  var(--ha-space-4)
                ) - max(var(--safe-area-inset-top), var(--ha-space-4))
            )
          );
          --ha-dialog-min-height: min(
            648px,
            calc(
              100dvh - max(
                  var(--safe-area-inset-bottom),
                  var(--ha-space-4)
                ) - max(var(--safe-area-inset-top), var(--ha-space-4))
            )
          );
          --ha-dialog-max-height: var(--ha-dialog-min-height);
        }

        search-input {
          display: block;
          margin: var(--ha-space-0) var(--ha-space-4);
        }

        ha-button-toggle-group {
          --ha-button-toggle-group-padding: var(--ha-space-3) var(--ha-space-4)
            0;
        }

        .content {
          flex: 1;
          min-height: 0;
          height: 100%;
          display: flex;
        }

        .content.column {
          flex-direction: column;
        }

        ha-md-list {
          padding: 0;
        }

        ha-automation-add-from-target,
        .search-results,
        .groups {
          border-radius: var(--ha-border-radius-xl);
          border: 1px solid var(--ha-color-border-neutral-quiet);
          margin: var(--ha-space-3);
        }

        ha-automation-add-from-target,
        .groups {
          overflow: auto;
          flex: 4;
          margin-inline-end: var(--ha-space-0);
        }

        .search-results {
          overflow: hidden;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        ha-automation-add-from-target.hidden {
          display: none;
        }

        @media all and (max-width: 870px), all and (max-height: 500px) {
          ha-automation-add-from-target {
            overflow: hidden;
          }
        }

        .groups {
          --md-list-item-leading-space: var(--ha-space-3);
          --md-list-item-trailing-space: var(--md-list-item-leading-space);
          --md-list-item-bottom-space: var(--ha-space-1);
          --md-list-item-top-space: var(--md-list-item-bottom-space);
          --md-list-item-supporting-text-font: var(--ha-font-family-body);
          --md-list-item-one-line-container-height: var(--ha-space-10);
        }
        ha-bottom-sheet .groups,
        ha-bottom-sheet ha-automation-add-from-target {
          margin: var(--ha-space-3);
        }
        .groups .selected {
          background-color: var(--ha-color-fill-primary-normal-active);
          --md-list-item-label-text-color: var(--ha-color-on-primary-normal);
          --icon-primary-color: var(--ha-color-on-primary-normal);
        }
        .groups .selected ha-svg-icon {
          color: var(--ha-color-on-primary-normal);
        }

        ha-section-title {
          top: 0;
          position: sticky;
          z-index: 1;
        }

        .items {
          display: flex;
          flex-direction: column;
          overflow: auto;
          flex: 6;
        }

        .content.column ha-automation-add-from-target,
        .content.column .items {
          flex: none;
        }

        ha-wa-dialog .items {
          margin-top: var(--ha-space-3);
        }

        ha-bottom-sheet .groups {
          padding-bottom: max(var(--safe-area-inset-bottom), var(--ha-space-4));
        }

        .items.hidden,
        .groups.hidden {
          display: none;
        }
        .items.blank,
        .empty-search {
          border-radius: var(--ha-border-radius-xl);
          background-color: var(--ha-color-surface-default);
          align-items: center;
          color: var(--ha-color-text-secondary);
          padding: var(--ha-space-0);
          margin: var(--ha-space-3) var(--ha-space-4)
            max(var(--safe-area-inset-bottom), var(--ha-space-3));
          line-height: var(--ha-line-height-expanded);
        }

        .items.error {
          background-color: var(--ha-color-fill-danger-quiet-resting);
          color: var(--ha-color-on-danger-normal);
        }

        .empty-search {
          display: flex;
          flex-direction: column;
          flex: 1;
          padding: var(--ha-space-3);
        }

        .items ha-md-list {
          --md-list-item-two-line-container-height: var(--ha-space-12);
          --md-list-item-leading-space: var(--ha-space-3);
          --md-list-item-trailing-space: var(--md-list-item-leading-space);
          --md-list-item-bottom-space: var(--ha-space-2);
          --md-list-item-top-space: var(--md-list-item-bottom-space);
          --md-list-item-supporting-text-font: var(--ha-font-family-body);
          gap: var(--ha-space-2);
          padding: var(--ha-space-0) var(--ha-space-4);
        }
        .items ha-md-list ha-md-list-item {
          border-radius: var(--ha-border-radius-lg);
          border: 1px solid var(--ha-color-border-neutral-quiet);
        }

        .items ha-md-list,
        .groups {
          padding-bottom: max(var(--safe-area-inset-bottom), var(--ha-space-3));
        }

        .items.blank {
          justify-content: center;
        }
        .items.empty-search {
          padding-top: var(--ha-space-6);
          justify-content: start;
        }

        .items-title {
          position: sticky;
          display: flex;
          align-items: center;
          font-weight: var(--ha-font-weight-medium);
          padding-top: var(--ha-space-2);
          padding-bottom: var(--ha-space-2);
          padding-inline-start: var(--ha-space-8);
          padding-inline-end: var(--ha-space-3);
          top: 0;
          z-index: 1;
          background-color: var(--card-background-color);
        }
        ha-bottom-sheet .items-title {
          padding-top: var(--ha-space-3);
        }
        .items-title.scrolled:first-of-type {
          box-shadow: var(--bar-box-shadow);
          border-bottom: 1px solid var(--ha-color-border-neutral-quiet);
        }

        ha-icon-next {
          width: var(--ha-space-6);
        }

        ha-md-list-item.paste {
          border-bottom: 1px solid var(--ha-color-border-neutral-quiet);
        }

        ha-svg-icon.plus {
          color: var(--primary-color);
        }
        .shortcut-label {
          display: flex;
          gap: var(--ha-space-3);
          justify-content: space-between;
        }
        .shortcut-label .supporting-text {
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-s);
        }
        .shortcut-label .shortcut {
          --mdc-icon-size: var(--ha-space-3);
          display: inline-flex;
          flex-direction: row;
          align-items: center;
          gap: 2px;
        }
        .shortcut-label .shortcut span {
          font-size: var(--ha-font-size-s);
          font-family: var(--ha-font-family-code);
          color: var(--ha-color-text-secondary);
        }

        .section-title-wrapper {
          height: 0;
          position: relative;
        }

        .section-title-wrapper ha-section-title {
          position: absolute;
          top: 0;
          width: calc(100% - var(--ha-space-4));
          z-index: 1;
        }

        .sections {
          display: flex;
          flex-wrap: nowrap;
          gap: var(--ha-space-2);
          padding: var(--ha-space-3);
          margin-bottom: calc(var(--ha-space-3) * -1);
          overflow: auto;
          overflow-x: auto;
          overflow-y: hidden;
        }

        .sections ha-filter-chip {
          flex-shrink: 0;
          --md-filter-chip-selected-container-color: var(
            --ha-color-fill-primary-normal-hover
          );
          color: var(--primary-color);
        }

        .sections .separator {
          height: var(--ha-space-8);
          width: 0;
          border: 1px solid var(--ha-color-border-neutral-quiet);
        }

        lit-virtualizer ha-section-title {
          width: 100%;
        }

        lit-virtualizer {
          flex: 1;
        }

        lit-virtualizer:focus-visible {
          outline: none;
        }

        ha-combo-box-item {
          width: 100%;
        }

        .selected-target {
          display: inline-flex;
          gap: var(--ha-space-1);
          justify-content: center;
          align-items: center;
          border-radius: var(--ha-border-radius-md);
          background: var(--ha-color-fill-neutral-normal-resting);
          padding: 0 var(--ha-space-2) 0 var(--ha-space-1);
          color: var(--ha-color-on-neutral-normal);
        }

        .selected-target ha-icon,
        .selected-target ha-svg-icon,
        .selected-target state-badge,
        .selected-target img {
          display: flex;
          padding: var(--ha-space-1) 0;
        }

        .selected-target state-badge,
        .selected-target img {
          width: 24px;
          height: 24px;
          filter: grayscale(100%);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "add-automation-element-dialog": DialogAddAutomationElement;
  }
}
