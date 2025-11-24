import {
  mdiAppleKeyboardCommand,
  mdiClose,
  mdiContentPaste,
  mdiPlus,
} from "@mdi/js";
import Fuse from "fuse.js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
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
import memoizeOne from "memoize-one";
import { tinykeys } from "tinykeys";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stringCompare } from "../../../common/string/compare";
import type {
  LocalizeFunc,
  LocalizeKeys,
} from "../../../common/translations/localize";
import { debounce } from "../../../common/util/debounce";
import { deepEqual } from "../../../common/util/deep-equal";
import "../../../components/ha-bottom-sheet";
import "../../../components/ha-button-toggle-group";
import "../../../components/ha-dialog-header";
import "../../../components/ha-domain-icon";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-button-prev";
import "../../../components/ha-icon-next";
import "../../../components/ha-md-divider";
import "../../../components/ha-md-list";
import type { HaMdList } from "../../../components/ha-md-list";
import "../../../components/ha-md-list-item";
import "../../../components/ha-service-icon";
import { TRIGGER_ICONS } from "../../../components/ha-trigger-icon";
import "../../../components/ha-wa-dialog";
import "../../../components/search-input";
import {
  ACTION_BUILDING_BLOCKS_GROUP,
  ACTION_COLLECTIONS,
  ACTION_ICONS,
} from "../../../data/action";
import {
  DYNAMIC_PREFIX,
  getValueFromDynamic,
  isDynamic,
  type AutomationElementGroup,
  type AutomationElementGroupCollection,
} from "../../../data/automation";
import type { ConditionDescriptions } from "../../../data/condition";
import {
  CONDITION_BUILDING_BLOCKS_GROUP,
  CONDITION_COLLECTIONS,
  getConditionDomain,
  getConditionObjectId,
  subscribeConditions,
} from "../../../data/condition";
import {
  getConditionIcons,
  getServiceIcons,
  getTriggerIcons,
} from "../../../data/icons";
import type { IntegrationManifest } from "../../../data/integration";
import {
  domainToName,
  fetchIntegrationManifests,
} from "../../../data/integration";
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
import type { HomeAssistant } from "../../../types";
import { isMac } from "../../../util/is_mac";
import { showToast } from "../../../util/toast";
import type { AddAutomationElementDialogParams } from "./show-add-automation-element-dialog";
import { PASTE_VALUE } from "./show-add-automation-element-dialog";
import { CONDITION_ICONS } from "../../../components/ha-condition-icon";

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

interface ListItem {
  key: string;
  name: string;
  description: string;
  iconPath?: string;
  icon?: TemplateResult;
}

type DomainManifestLookup = Record<string, IntegrationManifest>;

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

const DYNAMIC_KEYWORDS = ["dynamicGroups", "helpers", "other"];

@customElement("add-automation-element-dialog")
class DialogAddAutomationElement
  extends KeyboardShortcutMixin(LitElement)
  implements HassDialog
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: AddAutomationElementDialogParams;

  @state() private _selectedCollectionIndex?: number;

  @state() private _selectedGroup?: string;

  @state() private _tab: "groups" | "blocks" = "groups";

  @state() private _filter = "";

  @state() private _manifests?: DomainManifestLookup;

  @state() private _domains?: Set<string>;

  @state() private _open = true;

  @state() private _itemsScrolled = false;

  @state() private _bottomSheetMode = false;

  @state() private _narrow = false;

  @state() private _triggerDescriptions: TriggerDescriptions = {};

  @state() private _conditionDescriptions: ConditionDescriptions = {};

  @query(".items ha-md-list ha-md-list-item")
  private _itemsListFirstElement?: HaMdList;

  @query(".items")
  private _itemsListElement?: HTMLDivElement;

  private _fullScreen = false;

  private _removeKeyboardShortcuts?: () => void;

  private _unsub?: Promise<UnsubscribeFunc>;

  public showDialog(params): void {
    this._params = params;

    this.addKeyboardShortcuts();

    this._unsubscribe();
    this._fetchManifests();

    if (this._params?.type === "action") {
      this.hass.loadBackendTranslation("services");
      this._calculateUsedDomains();
      getServiceIcons(this.hass);
    } else if (this._params?.type === "trigger") {
      this.hass.loadBackendTranslation("triggers");
      getTriggerIcons(this.hass);
      this._unsub = subscribeTriggers(this.hass, (triggers) => {
        this._triggerDescriptions = {
          ...this._triggerDescriptions,
          ...triggers,
        };
      });
    } else if (this._params?.type === "condition") {
      this.hass.loadBackendTranslation("conditions");
      getConditionIcons(this.hass);
      this._unsub = subscribeConditions(this.hass, (conditions) => {
        this._conditionDescriptions = {
          ...this._conditionDescriptions,
          ...conditions,
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
    this._unsubscribe();
    if (this._params) {
      fireEvent(this, "dialog-closed", { dialog: this.localName });
    }
    this._open = true;
    this._itemsScrolled = false;
    this._bottomSheetMode = false;
    this._params = undefined;
    this._selectedGroup = undefined;
    this._tab = "groups";
    this._selectedCollectionIndex = undefined;
    this._filter = "";
    this._manifests = undefined;
    this._domains = undefined;
    return true;
  }

  private _unsubscribe() {
    if (this._unsub) {
      this._unsub.then((unsub) => unsub());
      this._unsub = undefined;
    }
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

  private _getFilteredItems = memoizeOne(
    (
      type: AddAutomationElementDialogParams["type"],
      filter: string,
      localize: LocalizeFunc,
      services: HomeAssistant["services"],
      manifests?: DomainManifestLookup
    ): ListItem[] => {
      const items = this._items(type, localize, services, manifests);

      const index = this._fuseIndex(items);

      const fuse = new HaFuse(
        items,
        {
          ignoreLocation: true,
          includeScore: true,
          minMatchCharLength: Math.min(2, this._filter.length),
        },
        index
      );

      const results = fuse.multiTermsSearch(filter);
      if (results) {
        return results.map((result) => result.item).filter((item) => item.name);
      }
      return items;
    }
  );

  private _getFilteredBuildingBlocks = memoizeOne(
    (
      type: AddAutomationElementDialogParams["type"],
      filter: string,
      localize: LocalizeFunc
    ): ListItem[] => {
      const groups =
        type === "action"
          ? ACTION_BUILDING_BLOCKS_GROUP
          : type === "condition"
            ? CONDITION_BUILDING_BLOCKS_GROUP
            : {};

      const items = Object.keys(groups).map((key) =>
        this._convertToItem(key, {}, type, localize)
      );

      const index = this._fuseIndexBlock(items);

      const fuse = new HaFuse(
        items,
        {
          ignoreLocation: true,
          includeScore: true,
          minMatchCharLength: Math.min(2, this._filter.length),
        },
        index
      );

      const results = fuse.multiTermsSearch(filter);
      if (results) {
        return results.map((result) => result.item).filter((item) => item.name);
      }
      return items;
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
        items.push(
          ...this._triggers(localize, this._triggerDescriptions, manifests)
        );
      } else if (type === "condition") {
        items.push(
          ...this._conditions(localize, this._conditionDescriptions, manifests)
        );
      } else if (type === "action") {
        items.push(...this._services(localize, services, manifests));
      }
      return items;
    }
  );

  private _fuseIndex = memoizeOne((items: ListItem[]) =>
    Fuse.createIndex(["key", "name", "description"], items)
  );

  private _fuseIndexBlock = memoizeOne((items: ListItem[]) =>
    Fuse.createIndex(["key", "name", "description"], items)
  );

  private _getCollections = memoizeOne(
    (
      type: AddAutomationElementDialogParams["type"],
      collections: AutomationElementGroupCollection[],
      domains: Set<string> | undefined,
      localize: LocalizeFunc,
      services: HomeAssistant["services"],
      triggerDescriptions: TriggerDescriptions,
      conditionDescriptions: ConditionDescriptions,
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
          type === "trigger" &&
          Object.keys(collection.groups).some((item) =>
            DYNAMIC_KEYWORDS.includes(item)
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
            ([key]) => !DYNAMIC_KEYWORDS.includes(key)
          );
        } else if (
          type === "condition" &&
          Object.keys(collection.groups).some((item) =>
            DYNAMIC_KEYWORDS.includes(item)
          )
        ) {
          groups.push(
            ...this._conditionGroups(
              localize,
              conditionDescriptions,
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
            ([key]) => !DYNAMIC_KEYWORDS.includes(key)
          );
        } else if (
          type === "action" &&
          Object.keys(collection.groups).some((item) =>
            DYNAMIC_KEYWORDS.includes(item)
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
            ([key]) => !DYNAMIC_KEYWORDS.includes(key)
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
      if (type === "trigger" && isDynamic(group)) {
        return this._triggers(
          localize,
          this._triggerDescriptions,
          manifests,
          group
        );
      }
      if (type === "condition" && isDynamic(group)) {
        return this._conditions(
          localize,
          this._conditionDescriptions,
          manifests,
          group
        );
      }
      if (type === "action" && isDynamic(group)) {
        return this._services(localize, services, manifests, group);
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
      _manifests: DomainManifestLookup | undefined,
      group?: string
    ): ListItem[] => {
      if (!triggers) {
        return [];
      }
      const result: ListItem[] = [];

      for (const trigger of Object.keys(triggers)) {
        const domain = getTriggerDomain(trigger);
        const triggerName = getTriggerObjectId(trigger);

        if (group && group !== `${DYNAMIC_PREFIX}${domain}`) {
          continue;
        }

        result.push({
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
            localize(
              `component.${domain}.triggers.${triggerName}.description`
            ) || trigger,
        });
      }
      return result;
    }
  );

  private _conditionGroups = (
    localize: LocalizeFunc,
    conditions: ConditionDescriptions,
    manifests: DomainManifestLookup | undefined,
    domains: Set<string> | undefined,
    type: "helper" | "other" | undefined
  ): ListItem[] => {
    if (!conditions || !manifests) {
      return [];
    }
    const result: ListItem[] = [];
    const addedDomains = new Set<string>();
    Object.keys(conditions).forEach((condition) => {
      const domain = getConditionDomain(condition);

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

  private _conditions = memoizeOne(
    (
      localize: LocalizeFunc,
      conditions: ConditionDescriptions,
      _manifests: DomainManifestLookup | undefined,
      group?: string
    ): ListItem[] => {
      if (!conditions) {
        return [];
      }
      const result: ListItem[] = [];

      for (const condition of Object.keys(conditions)) {
        const domain = getConditionDomain(condition);
        const conditionName = getConditionObjectId(condition);

        if (group && group !== `${DYNAMIC_PREFIX}${domain}`) {
          continue;
        }

        result.push({
          icon: html`
            <ha-condition-icon
              .hass=${this.hass}
              .condition=${condition}
            ></ha-condition-icon>
          `,
          key: `${DYNAMIC_PREFIX}${condition}`,
          name:
            localize(`component.${domain}.conditions.${conditionName}.name`) ||
            condition,
          description:
            localize(
              `component.${domain}.conditions.${conditionName}.description`
            ) || condition,
        });
      }
      return result;
    }
  );

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

  protected willUpdate(changedProperties: PropertyValues): void {
    if (
      this._params?.type === "action" &&
      changedProperties.has("hass") &&
      changedProperties.get("hass")?.states !== this.hass.states
    ) {
      this._calculateUsedDomains();
    }
  }

  private _renderContent() {
    const automationElementType = this._params!.type;

    const items = this._filter
      ? this._getFilteredItems(
          automationElementType,
          this._filter,
          this.hass.localize,
          this.hass.services,
          this._manifests
        )
      : this._tab === "blocks"
        ? this._getBlockItems(automationElementType, this.hass.localize)
        : this._selectedGroup
          ? this._getGroupItems(
              automationElementType,
              this._selectedGroup,
              this._selectedCollectionIndex ?? 0,
              this._domains,
              this.hass.localize,
              this.hass.services,
              this._manifests
            )
          : undefined;

    const filteredBlockItems =
      this._filter && automationElementType !== "trigger"
        ? this._getFilteredBuildingBlocks(
            automationElementType,
            this._filter,
            this.hass.localize
          )
        : undefined;

    const collections = this._getCollections(
      automationElementType,
      TYPES[automationElementType].collections,
      this._domains,
      this.hass.localize,
      this.hass.services,
      this._triggerDescriptions,
      this._conditionDescriptions,
      this._manifests
    );

    const groupName = isDynamic(this._selectedGroup)
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

    const typeTitle = this.hass.localize(
      `ui.panel.config.automation.editor.${automationElementType}s.add`
    );

    const tabButtons = [
      {
        label: this.hass.localize(
          `ui.panel.config.automation.editor.${automationElementType}s.name`
        ),
        value: "groups",
      },
      {
        label: this.hass.localize(`ui.panel.config.automation.editor.blocks`),
        value: "blocks",
      },
    ];

    const hideCollections =
      this._filter ||
      this._tab === "blocks" ||
      (this._narrow && this._selectedGroup);

    return html`
      <div slot="header">
        <ha-dialog-header subtitle-position="above">
          <span slot="title"
            >${this._narrow && this._selectedGroup
              ? groupName
              : typeTitle}</span
          >

          ${this._narrow && this._selectedGroup
            ? html`<span slot="subtitle">${typeTitle}</span>`
            : nothing}
          ${this._narrow && this._selectedGroup
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
        ${!this._narrow || !this._selectedGroup
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
        ${this._params?.type !== "trigger" &&
        !this._filter &&
        (!this._narrow || !this._selectedGroup)
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
      <div class="content">
        <ha-md-list
          class=${classMap({
            groups: true,
            hidden: hideCollections,
          })}
        >
          ${this._params!.clipboardItem && !this._filter
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
                <ha-md-divider role="separator" tabindex="-1"></ha-md-divider>`
            : nothing}
          ${collections.map(
            (collection, index) => html`
              ${collection.titleKey
                ? html`<div class="collection-title">
                    ${this.hass.localize(collection.titleKey)}
                  </div>`
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
                    class=${item.key === this._selectedGroup ? "selected" : ""}
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
                  </ha-md-list-item>
                `
              )}
            `
          )}
        </ha-md-list>
        <div
          class=${classMap({
            items: true,
            blank:
              !this._selectedGroup && !this._filter && this._tab === "groups",
            "empty-search":
              !items?.length && !filteredBlockItems?.length && this._filter,
            hidden:
              this._narrow &&
              !this._selectedGroup &&
              !this._filter &&
              this._tab === "groups",
          })}
          @scroll=${this._onItemsScroll}
        >
          ${filteredBlockItems
            ? this._renderItemList(
                this.hass.localize(`ui.panel.config.automation.editor.blocks`),
                filteredBlockItems
              )
            : nothing}
          ${this._tab === "groups" && !this._selectedGroup && !this._filter
            ? this.hass.localize(
                `ui.panel.config.automation.editor.${automationElementType}s.select`
              )
            : !items?.length &&
                this._filter &&
                (!filteredBlockItems || !filteredBlockItems.length)
              ? html`<span
                  >${this.hass.localize(
                    `ui.panel.config.automation.editor.${automationElementType}s.empty_search`,
                    {
                      term: html`<b>‘${this._filter}’</b>`,
                    }
                  )}</span
                >`
              : this._renderItemList(
                  this.hass.localize(
                    `ui.panel.config.automation.editor.${automationElementType}s.name`
                  ),
                  items
                )}
        </div>
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
      <ha-wa-dialog .open=${this._open} @closed=${this.closeDialog} flexcontent>
        ${this._renderContent()}
      </ha-wa-dialog>
    `;
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("resize", this._updateNarrow);
    this._removeSearchKeybindings();
    this._unsubscribe();
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
    if (!this._filter || !this._itemsListFirstElement) {
      return;
    }

    ev.preventDefault();
    this._itemsListFirstElement.focus();
  };

  private _pickSingleItem = (ev: KeyboardEvent) => {
    if (!this._filter) {
      return;
    }

    ev.preventDefault();
    const automationElementType = this._params!.type;

    const items = [
      ...this._getFilteredItems(
        automationElementType,
        this._filter,
        this.hass.localize,
        this.hass.services,
        this._manifests
      ),
      ...(automationElementType !== "trigger"
        ? this._getFilteredBuildingBlocks(
            automationElementType,
            this._filter,
            this.hass.localize
          )
        : []),
    ];

    if (items.length !== 1) {
      return;
    }

    this._params!.add(items[0].key);
    this.closeDialog();
  };

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
          --ha-dialog-width-md: 888px;
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

        ha-md-list {
          padding: 0;
        }

        .groups {
          overflow: auto;
          flex: 3;
          border-radius: var(--ha-border-radius-xl);
          border: 1px solid var(--ha-color-border-neutral-quiet);
          margin: var(--ha-space-3);
          margin-inline-end: var(--ha-space-0);
          --md-list-item-leading-space: var(--ha-space-3);
          --md-list-item-trailing-space: var(--md-list-item-leading-space);
          --md-list-item-bottom-space: var(--ha-space-1);
          --md-list-item-top-space: var(--md-list-item-bottom-space);
          --md-list-item-supporting-text-font: var(--ha-font-family-body);
          --md-list-item-one-line-container-height: var(--ha-space-10);
        }
        ha-bottom-sheet .groups {
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

        .collection-title {
          background-color: var(--ha-color-fill-neutral-quiet-resting);
          padding: var(--ha-space-1) var(--ha-space-2);
          font-weight: var(--ha-font-weight-bold);
          color: var(--secondary-text-color);
          top: 0;
          position: sticky;
          min-height: var(--ha-space-6);
          display: flex;
          align-items: center;
          z-index: 1;
        }

        .items {
          display: flex;
          flex-direction: column;
          overflow: auto;
          flex: 7;
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
        .items.empty-search {
          border-radius: var(--ha-border-radius-xl);
          background-color: var(--ha-color-surface-default);
          align-items: center;
          color: var(--ha-color-text-secondary);
          padding: var(--ha-space-0);
          margin: var(--ha-space-3) var(--ha-space-4)
            max(var(--safe-area-inset-bottom), var(--ha-space-3));
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "add-automation-element-dialog": DialogAddAutomationElement;
  }
}
