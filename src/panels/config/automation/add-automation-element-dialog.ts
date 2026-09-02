import "@home-assistant/webawesome/dist/components/divider/divider";
import { consume } from "@lit/context";
import {
  mdiAppleKeyboardCommand,
  mdiClose,
  mdiContentPaste,
  mdiHelpCircleOutline,
  mdiPlus,
} from "@mdi/js";
import type { HassServiceTarget } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../../common/array/ensure-array";
import { fireEvent } from "../../../common/dom/fire_event";
import { mainWindow } from "../../../common/dom/get_main_window";
import { computeAreaName } from "../../../common/entity/compute_area_name";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeEntityNameList } from "../../../common/entity/compute_entity_name_display";
import { computeFloorName } from "../../../common/entity/compute_floor_name";
import { isNumericState } from "../../../common/number/format_number";
import { stringCompare } from "../../../common/string/compare";
import type {
  LocalizeFunc,
  LocalizeKeys,
} from "../../../common/translations/localize";
import { constructUrlCurrentPath } from "../../../common/url/construct-url";
import { computeRTL } from "../../../common/util/compute_rtl";
import { debounce } from "../../../common/util/debounce";
import { deepEqual } from "../../../common/util/deep-equal";
import "../../../components/entity/state-badge";
import "../../../components/ha-bottom-sheet";
import "../../../components/ha-button";
import "../../../components/ha-button-toggle-group";
import "../../../components/ha-combo-box-item";
import { CONDITION_ICONS } from "../../../components/ha-condition-icon";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-header";
import "../../../components/ha-domain-icon";
import "../../../components/ha-floor-icon";
import "../../../components/ha-icon";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-button-prev";
import "../../../components/ha-icon-next";
import type { PickerComboBoxItem } from "../../../components/ha-picker-combo-box";
import "../../../components/ha-section-title";
import "../../../components/ha-service-icon";
import "../../../components/ha-tooltip";
import { TRIGGER_ICONS } from "../../../components/ha-trigger-icon";
import "../../../components/input/ha-input-search";
import type { HaInputSearch } from "../../../components/input/ha-input-search";
import "../../../components/item/ha-list-item-button";
import "../../../components/list/ha-list-base";
import {
  ACTION_BUILDING_BLOCKS_GROUP,
  ACTION_COLLECTIONS,
  ACTION_ICONS,
} from "../../../data/action";
import {
  getAreaDeviceLookup,
  getAreaEntityLookup,
} from "../../../data/area/area_registry";
import type { FloorComboBoxItem } from "../../../data/area_floor_picker";
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
} from "../../../data/condition";
import {
  getConfigEntries,
  type ConfigEntry,
} from "../../../data/config_entries";
import {
  conditionDescriptionsContext,
  labelsContext,
  triggerDescriptionsContext,
} from "../../../data/context";
import { getDeviceEntityLookup } from "../../../data/device/device_registry";
import type { EntityComboBoxItem } from "../../../data/entity/entity_picker";
import { getFloorAreaLookup } from "../../../data/floor_registry";
import {
  getConditionIcons,
  getServiceIcons,
  getTriggerIcons,
} from "../../../data/icons";
import type { DomainManifestLookup } from "../../../data/integration";
import {
  domainToName,
  fetchIntegrationManifests,
} from "../../../data/integration";
import type { LabelRegistryEntry } from "../../../data/label/label_registry";
import { filterSelectorEntities } from "../../../data/selector";
import {
  TARGET_SEPARATOR,
  getConditionsForTarget,
  getServicesForTarget,
  getTargetComboBoxItemType,
  getTriggersForTarget,
  type SingleHassServiceTarget,
} from "../../../data/target";
import type { TriggerDescriptions } from "../../../data/trigger";
import {
  TRIGGER_COLLECTIONS,
  getTriggerDomain,
  getTriggerObjectId,
} from "../../../data/trigger";
import type { HassDialog } from "../../../dialogs/make-dialog-manager";
import { KeyboardShortcutMixin } from "../../../mixins/keyboard-shortcut-mixin";
import { haStyleScrollbar } from "../../../resources/styles";
import type { HomeAssistant, ValueChangedEvent } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { isMac } from "../../../util/is_mac";
import { showToast } from "../../../util/toast";
import "./add-automation-element/ha-automation-add-from-target";
import "./add-automation-element/ha-automation-add-items";
import "./add-automation-element/ha-automation-add-search";
import type { AddAutomationElementDialogParams } from "./show-add-automation-element-dialog";
import {
  ADD_AUTOMATION_ELEMENT_AREA_TARGET_PARAM,
  ADD_AUTOMATION_ELEMENT_DEVICE_TARGET_PARAM,
  ADD_AUTOMATION_ELEMENT_ENTITY_TARGET_PARAM,
  ADD_AUTOMATION_ELEMENT_QUERY_PARAM,
  PASTE_VALUE,
  getAddAutomationElementTargetFromQuery,
} from "./show-add-automation-element-dialog";
import { getTargetText } from "./target/get_target_text";

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

export interface CollectionGroup {
  collectionIndex: number;
  titleKey?: LocalizeKeys;
  generic?: boolean;
  groups: AddAutomationElementListItem[];
}

export interface AutomationItemComboBoxItem extends PickerComboBoxItem {
  renderedIcon?: TemplateResult;
  type: "trigger" | "condition" | "action" | "block";
}

export interface AddAutomationElementListItem {
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

const DYNAMIC_KEYWORDS = ["dynamicGroups", "helpers", "integrationGroups"];

const DYNAMIC_TO_GENERIC = new Set([`${DYNAMIC_PREFIX}event`]);

// Group keys surfaced as their own section in the "by target" tab because
// their elements have no target (time/calendar/schedule, sun). Picking one
// drills into its items, like selecting the matching group in the "by type" tab.
const TIME_LOCATION_GROUPS = ["time", "sun"];

type CollectionGroupType = "helper" | "dynamic" | "integration";

interface DomainClassificationOptions {
  type: AddAutomationElementDialogParams["type"];
  usedDomains?: Set<string>;
  activeSystemDomains?: Set<string>;
}

@customElement("add-automation-element-dialog")
class DialogAddAutomationElement
  extends KeyboardShortcutMixin(LitElement)
  implements HassDialog
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  // #region state

  @state() private _open = true;

  @state() private _params?: AddAutomationElementDialogParams;

  @state() private _selectedCollectionIndex?: number;

  @state() private _selectedGroup?: string;

  @state() private _selectedTarget?: SingleHassServiceTarget;

  @state() private _tab: "targets" | "groups" | "blocks" = "targets";

  @state() private _filter = "";

  @state() private _manifests?: DomainManifestLookup;

  @state() private _domains?: Set<string>;

  @state() private _bottomSheetMode = false;

  @state() private _narrow = false;

  @state()
  @consume({ context: triggerDescriptionsContext, subscribe: true })
  private _triggerDescriptions: TriggerDescriptions = {};

  @state()
  @consume({ context: conditionDescriptionsContext, subscribe: true })
  private _conditionDescriptions: ConditionDescriptions = {};

  @state() private _targetItems?: {
    title: string;
    items: AddAutomationElementListItem[];
  }[];

  @state() private _loadItemsError = false;

  @state() private _openedFromQuery = false;

  @state()
  @consume({ context: labelsContext, subscribe: true })
  private _labelRegistry!: LabelRegistryEntry[];

  // #endregion state

  // #region queries
  @query("ha-automation-add-items")
  private _itemsListElement?: HTMLDivElement;

  @query(".content")
  private _contentElement?: HTMLDivElement;

  // #endregion queries

  // #region variables

  private _configEntryLookup: Record<string, ConfigEntry> = {};

  private _closing = false;

  // #endregion variables

  // #region lifecycle

  protected willUpdate(changedProps: PropertyValues) {
    if (
      changedProps.has("hass") &&
      changedProps.get("hass")?.states !== this.hass.states
    ) {
      this._calculateUsedDomains();
    }
  }

  public showDialog(params: AddAutomationElementDialogParams): void {
    this._params = params;
    this._resetVariables();

    const queryTarget = getAddAutomationElementTargetFromQuery(
      this.hass.states,
      this.hass.devices,
      this.hass.areas,
      params.type
    );
    this._openedFromQuery = !!queryTarget;

    if (queryTarget) {
      const searchParams = new URLSearchParams(mainWindow.location.search);
      searchParams.delete(ADD_AUTOMATION_ELEMENT_QUERY_PARAM);
      searchParams.delete(ADD_AUTOMATION_ELEMENT_ENTITY_TARGET_PARAM);
      searchParams.delete(ADD_AUTOMATION_ELEMENT_DEVICE_TARGET_PARAM);
      searchParams.delete(ADD_AUTOMATION_ELEMENT_AREA_TARGET_PARAM);
      mainWindow.history.replaceState(
        mainWindow.history.state,
        "",
        constructUrlCurrentPath(searchParams.toString())
      );
    }

    this.addKeyboardShortcuts();

    this._loadConfigEntries();

    this._fetchManifests();
    this._calculateUsedDomains();

    if (!queryTarget) {
      // add initial dialog view state to history
      mainWindow.history.pushState(
        {
          dialogData: {},
        },
        ""
      );
    }

    if (this._params?.type === "action") {
      this.hass.loadBackendTranslation("services");
      getServiceIcons(this.hass.connection, this.hass.config);
    } else if (this._params?.type === "trigger") {
      this.hass.loadBackendTranslation("triggers");
      getTriggerIcons(this.hass.connection, this.hass.config);
    } else if (this._params?.type === "condition") {
      this.hass.loadBackendTranslation("conditions");
      getConditionIcons(this.hass.connection, this.hass.config);
    }

    window.addEventListener("resize", this._updateNarrow);
    this._updateNarrow();

    // prevent view mode switch when resizing window
    this._bottomSheetMode = this._narrow;

    if (queryTarget && !this._selectedTarget) {
      this._selectedTarget = queryTarget;
      this._tab = "targets";
      this._getItemsByTarget();
    }
  }

  public closeDialog(historyState?: any) {
    // prevent closing when come from popstate event and root level isn't active
    if (
      this._open &&
      historyState &&
      (this._selectedTarget || this._selectedGroup)
    ) {
      if (historyState.dialogData?.target) {
        this._selectedTarget = historyState.dialogData.target;
        this._getItemsByTarget();
        this._tab = "targets";
        return false;
      }
      if (historyState.dialogData?.group) {
        this._selectedCollectionIndex = historyState.dialogData.collectionIndex;
        this._selectedGroup = historyState.dialogData.group;
        this._tab = "groups";
        return false;
      }

      // return to home on mobile
      if (this._narrow) {
        this._selectedTarget = undefined;
        this._selectedGroup = undefined;
        return false;
      }
    }

    this._closing = true;

    // if dialog is closed, but root level isn't active, clean up history state
    if (mainWindow.history.state?.dialogData) {
      this._open = false;
      mainWindow.history.back();
      return false;
    }

    this.removeKeyboardShortcuts();
    if (this._params) {
      fireEvent(this, "dialog-closed", { dialog: this.localName });
    }
    this._params = undefined;
    this._resetVariables();

    return true;
  }

  private _resetVariables() {
    this._open = true;
    this._closing = false;
    this._selectedCollectionIndex = undefined;
    this._selectedGroup = undefined;
    this._selectedTarget = undefined;
    this._tab = "targets";
    this._filter = "";
    this._manifests = undefined;
    this._domains = undefined;
    this._bottomSheetMode = false;
    this._narrow = false;
    this._targetItems = undefined;
    this._loadItemsError = false;
    this._openedFromQuery = false;
  }

  private _updateNarrow = () => {
    this._narrow =
      window.matchMedia("(max-width: 870px)").matches ||
      window.matchMedia("(max-height: 500px)").matches;
  };

  private _calculateUsedDomains() {
    const domains = new Set(Object.keys(this.hass.states).map(computeDomain));
    if (!deepEqual(domains, this._domains)) {
      this._domains = domains;
    }
  }

  private _calculateActiveSystemDomains = memoizeOne(
    (
      descriptions: TriggerDescriptions | ConditionDescriptions,
      manifests: DomainManifestLookup,
      getDomain: (key: string) => string
    ): { active: Set<string>; byEntityDomain: Map<string, Set<string>> } => {
      const active = new Set<string>();
      // Group all entity filters by domain
      const domainFilters: Record<
        string,
        Parameters<typeof filterSelectorEntities>[0][]
      > = {};
      // Also collect which entity domains each domain targets
      const entityDomainsPerDomain: Record<string, Set<string>> = {};
      for (const [key, desc] of Object.entries(descriptions)) {
        const domain = getDomain(key);
        const integrationType = manifests[domain]?.integration_type;
        if (integrationType !== "system" && integrationType !== "entity") {
          continue;
        }
        // For entity-type domains that have their own entities, the normal
        // domainUsed check handles them — only process those without entities.
        if (
          integrationType === "entity" &&
          Object.keys(this.hass.states).some(
            (id) => computeDomain(id) === domain
          )
        ) {
          continue;
        }
        if (!domainFilters[domain]) {
          domainFilters[domain] = [];
          entityDomainsPerDomain[domain] = new Set();
        }
        const entityFilters = ensureArray(desc.target?.entity);
        if (entityFilters) {
          // target.entity can be EntitySelectorFilter | readonly EntitySelectorFilter[]
          // ensureArray wraps it but each element may still be an array, so flatten
          for (const filterOrArray of entityFilters) {
            const filters = ensureArray(filterOrArray);
            domainFilters[domain].push(...filters);
            for (const filter of filters) {
              for (const entityDomain of ensureArray(filter.domain) ?? []) {
                entityDomainsPerDomain[domain].add(entityDomain);
              }
            }
          }
        }
      }
      // Check each entity in hass.states against the filters
      for (const entity of Object.values(this.hass.states)) {
        for (const [domain, filters] of Object.entries(domainFilters)) {
          if (active.has(domain)) {
            continue;
          }
          if (filters.some((f) => filterSelectorEntities(f, entity))) {
            active.add(domain);
          }
        }
      }
      // Build reverse map: entity domain → set of domains that cover it
      const byEntityDomain = new Map<string, Set<string>>();
      for (const [systemDomain, entityDomains] of Object.entries(
        entityDomainsPerDomain
      )) {
        for (const entityDomain of entityDomains) {
          if (!byEntityDomain.has(entityDomain)) {
            byEntityDomain.set(entityDomain, new Set());
          }
          byEntityDomain.get(entityDomain)!.add(systemDomain);
        }
      }
      return { active, byEntityDomain };
    }
  );

  private get _systemDomains() {
    // System domains are derived from trigger/condition descriptions, so
    // they don't apply to actions.
    if (!this._manifests || this._params?.type === "action") {
      return undefined;
    }
    const descriptions =
      this._params?.type === "trigger"
        ? this._triggerDescriptions
        : this._conditionDescriptions;
    return this._calculateActiveSystemDomains(
      descriptions,
      this._manifests,
      this._params?.type === "trigger" ? getTriggerDomain : getConditionDomain
    );
  }

  private async _loadConfigEntries() {
    const configEntries = await getConfigEntries(this.hass);
    this._configEntryLookup = Object.fromEntries(
      configEntries.map((entry) => [entry.entry_id, entry])
    );
  }

  private async _fetchManifests() {
    const manifests = {};
    const fetched = await fetchIntegrationManifests(this.hass);
    for (const manifest of fetched) {
      manifests[manifest.domain] = manifest;
    }
    this._manifests = manifests;
    // If a target was already selected and items computed before manifests
    // loaded, recompute so system domain grouping applies correctly.
    if (this._selectedTarget && this._targetItems) {
      this._getItemsByTarget();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("resize", this._updateNarrow);
  }

  protected supportedShortcuts(): SupportedShortcuts {
    return {
      v: () => this._addClipboard(),
    };
  }

  // #endregion lifecycle

  // #region render

  protected render() {
    if (!this._params) {
      return nothing;
    }

    if (this._bottomSheetMode) {
      return html`
        <ha-bottom-sheet
          .open=${this._open}
          @closed=${this._handleClosed}
          flexcontent
        >
          ${this._renderContent()}
        </ha-bottom-sheet>
      `;
    }

    return html`
      <ha-dialog
        width="large"
        .open=${this._open}
        @closed=${this._handleClosed}
        flexcontent
      >
        ${this._renderContent()}
      </ha-dialog>
    `;
  }

  private _renderContent() {
    const automationElementType = this._params!.type;

    const tabButtons = [
      {
        label: this.hass.localize(
          "ui.panel.config.automation.editor.tabs.target"
        ),
        value: "targets",
      },
      {
        label: this.hass.localize(
          "ui.panel.config.automation.editor.tabs.type"
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
      this._tab === "targets" ||
      (this._narrow && this._selectedGroup);

    const collections = hideCollections
      ? []
      : this._getCollections(
          automationElementType,
          TYPES[automationElementType].collections,
          this._domains,
          this.hass.localize,
          this.hass.services,
          this._triggerDescriptions,
          this._conditionDescriptions,
          this._manifests
        );

    return html`
      <div slot="header">
        ${this._renderHeader()}
        ${
          !this._narrow || (!this._selectedGroup && !this._selectedTarget)
            ? html`
                <ha-input-search
                  appearance="outlined"
                  ?autofocus=${!this._narrow}
                  .value=${this._filter}
                  @input=${this._handleFilterInput}
                ></ha-input-search>
              `
            : nothing
        }
        ${
          !this._filter &&
          tabButtons.length > 1 &&
          (!this._narrow || (!this._selectedGroup && !this._selectedTarget))
            ? html`<ha-button-toggle-group
                variant="neutral"
                active-variant="brand"
                .buttons=${tabButtons}
                .active=${this._tab}
                size="s"
                full-width
                @value-changed=${this._switchTab}
              ></ha-button-toggle-group>`
            : nothing
        }
      </div>
      <div
        class=${classMap({
          content: true,
          column:
            this._filter ||
            (this._narrow &&
              this._selectedTarget &&
              Object.values(this._selectedTarget)[0] &&
              !this._getAddFromTargetHidden(
                this._narrow,
                this._selectedTarget
              )),
        })}
      >
        ${
          this._filter
            ? html`<ha-automation-add-search
                .hass=${this.hass}
                .filter=${this._filter}
                .configEntryLookup=${this._configEntryLookup}
                .manifests=${this._manifests}
                .narrow=${this._narrow}
                .addElementType=${this._params!.type}
                .items=${this._items(
                  automationElementType,
                  this.hass.localize,
                  this.hass.services,
                  this._triggerDescriptions,
                  this._conditionDescriptions,
                  this._manifests
                )}
                .convertToItem=${this._convertToItem}
                @search-element-picked=${this._searchItemSelected}
              >
              </ha-automation-add-search>`
            : this._tab === "targets"
              ? html`<ha-automation-add-from-target
                  .hass=${this.hass}
                  .value=${this._selectedTarget}
                  @value-changed=${this._handleTargetSelected}
                  @time-location-group-selected=${
                    this._handleTimeLocationGroupSelected
                  }
                  .narrow=${this._narrow}
                  .timeLocationLabel=${this._getTimeLocationLabel(
                    automationElementType
                  )}
                  .timeLocationGroups=${this._getTimeLocationGroups(
                    automationElementType,
                    this.hass.localize,
                    automationElementType === "condition"
                      ? this._conditionDescriptions
                      : this._triggerDescriptions
                  )}
                  .selectedGroup=${this._selectedGroup}
                  class=${classMap({
                    "ha-scrollbar": true,
                    hidden:
                      !!this._getAddFromTargetHidden(
                        this._narrow,
                        this._selectedTarget
                      ) ||
                      (this._narrow && !!this._selectedGroup),
                  })}
                  .manifests=${this._manifests}
                ></ha-automation-add-from-target>`
              : html`
                  <ha-list-base
                    class=${classMap({
                      groups: true,
                      hidden: hideCollections,
                      "ha-scrollbar": true,
                    })}
                  >
                    ${
                      this._params!.clipboardItem
                        ? html`<ha-list-item-button
                              class="paste"
                              @click=${this._paste}
                            >
                              <div slot="headline" class="label">
                                ${this.hass.localize(
                                  `ui.panel.config.automation.editor.${automationElementType}s.paste`
                                )}
                              </div>
                              <div slot="supporting-text">
                                ${this.hass.localize(
                                  // @ts-ignore
                                  `ui.panel.config.automation.editor.${automationElementType}s.type.${this._params.clipboardItem}.label`
                                )}
                              </div>
                              ${
                                !this._narrow
                                  ? html`<span slot="end" class="shortcut">
                                      <span
                                        >${
                                          isMac
                                            ? html`<ha-svg-icon
                                                slot="start"
                                                .path=${mdiAppleKeyboardCommand}
                                              ></ha-svg-icon>`
                                            : this.hass.localize(
                                                "ui.panel.config.automation.editor.ctrl"
                                              )
                                        }</span
                                      >
                                      <span>+</span>
                                      <span>V</span>
                                    </span>`
                                  : nothing
                              }
                              <ha-svg-icon
                                slot="start"
                                .path=${mdiContentPaste}
                              ></ha-svg-icon
                              ><ha-svg-icon
                                class="plus"
                                slot="end"
                                .path=${mdiPlus}
                              ></ha-svg-icon>
                            </ha-list-item-button>
                            <wa-divider></wa-divider>`
                        : nothing
                    }
                    ${collections.map(
                      (collection) => html`
                        ${
                          collection.titleKey && collection.groups.length
                            ? html`<ha-section-title>
                                ${this.hass.localize(collection.titleKey)}
                              </ha-section-title>`
                            : nothing
                        }
                        ${repeat(
                          collection.groups,
                          (item) => item.key,
                          (item) => html`
                            <ha-list-item-button
                              .value=${item.key}
                              .index=${collection.collectionIndex}
                              @click=${this._groupSelected}
                              class=${
                                item.key === this._selectedGroup
                                  ? "selected"
                                  : ""
                              }
                            >
                              <div slot="headline">${item.name}</div>
                              ${
                                item.icon
                                  ? html`<span slot="start">${item.icon}</span>`
                                  : item.iconPath
                                    ? html`<ha-svg-icon
                                        slot="start"
                                        .path=${item.iconPath}
                                      ></ha-svg-icon>`
                                    : nothing
                              }
                              ${
                                this._narrow
                                  ? html`<ha-icon-next
                                      slot="end"
                                    ></ha-icon-next>`
                                  : nothing
                              }
                            </ha-list-item-button>
                          `
                        )}
                      `
                    )}
                  </ha-list-base>
                `
        }
        ${
          !this._filter
            ? html`
                <ha-automation-add-items
                  .hass=${this.hass}
                  .items=${this._getItems()}
                  .scrollable=${!this._narrow}
                  .error=${
                    this._tab === "targets" && this._loadItemsError
                      ? this.hass.localize(
                          "ui.panel.config.automation.editor.load_target_items_failed"
                        )
                      : undefined
                  }
                  .selectLabel=${this.hass.localize(
                    `ui.panel.config.automation.editor.${this._tab === "groups" || this._selectedGroup ? `${automationElementType}s.select` : "select_target"}` as LocalizeKeys
                  )}
                  .emptyLabel=${this.hass.localize(
                    `ui.panel.config.automation.editor.${automationElementType}s.no_items_for_target`
                  )}
                  .tooltipDescription=${
                    this._tab === "targets" && !this._selectedGroup
                  }
                  .target=${
                    (this._tab === "targets" &&
                      this._selectedTarget &&
                      ([
                        ...this._extractTypeAndIdFromTarget(
                          this._selectedTarget
                        ),
                        this._getSelectedTargetLabel(this._selectedTarget),
                      ] as [string, string | undefined, string | undefined])) ||
                    undefined
                  }
                  .getLabel=${this._getLabel}
                  .configEntryLookup=${this._configEntryLookup}
                  class=${
                    this._narrow &&
                    !this._selectedGroup &&
                    (!this._selectedTarget ||
                      (this._selectedTarget &&
                        !Object.values(this._selectedTarget)[0])) &&
                    this._tab !== "blocks"
                      ? "hidden"
                      : ""
                  }
                  @value-changed=${this._selected}
                >
                </ha-automation-add-items>
              `
            : nothing
        }
      </div>
    `;
  }

  private _renderHeader() {
    const docUrl = this._getDocumentationUrl(this._params!.type);

    return html`
      <ha-dialog-header subtitle-position="above">
        <span slot="title">${this._getDialogTitle()}</span>

        ${this._renderDialogSubtitle()}
        ${
          !this._narrow || (!this._selectedGroup && !this._selectedTarget)
            ? html`
                <ha-icon-button
                  .path=${mdiHelpCircleOutline}
                  .label=${this.hass.localize(
                    `ui.panel.config.automation.editor.${this._params!.type}s.learn_more`
                  )}
                  slot="actionItems"
                  href=${docUrl}
                  target="_blank"
                  rel="noreferrer"
                ></ha-icon-button>
              `
            : nothing
        }
        ${
          this._narrow &&
          (this._selectedGroup || this._selectedTarget) &&
          !this._openedFromQuery
            ? html`<ha-icon-button-prev
                slot="navigationIcon"
                @click=${this._back}
              ></ha-icon-button-prev>`
            : html`<ha-icon-button
                .path=${mdiClose}
                @click=${this._close}
                slot="navigationIcon"
              ></ha-icon-button>`
        }
      </ha-dialog-header>
    `;
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
        if (targetType === "area") {
          const floorId = this.hass.areas[targetId]?.floor_id;
          if (floorId) {
            subtitle = computeFloorName(this.hass.floors[floorId]) || floorId;
          } else {
            subtitle = this.hass.localize(
              "ui.panel.config.automation.editor.other_areas"
            );
          }
        } else if (targetType === "device") {
          const areaId = this.hass.devices[targetId]?.area_id;
          if (areaId) {
            subtitle = computeAreaName(this.hass.areas[areaId]) || areaId;
          } else {
            const device = this.hass.devices[targetId];
            subtitle = this.hass.localize(
              `ui.panel.config.automation.editor.${device?.entry_type === "service" ? "services" : "unassigned_devices"}`
            );
          }
        } else if (targetType === "entity" && this.hass.states[targetId]) {
          const entity = this.hass.entities[targetId];
          if (entity && !entity.device_id && !entity.area_id) {
            const domain = targetId.split(".", 2)[0];
            subtitle = domainToName(
              this.hass.localize,
              domain,
              this._manifests?.[domain]
            );
          } else {
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
              .join(
                computeRTL(
                  this.hass.language,
                  this.hass.translationMetadata.translations
                )
                  ? " ◂ "
                  : " ▸ "
              );
          }
        }

        if (subtitle) {
          return html`<span slot="subtitle">${subtitle}</span>`;
        }
      }
    }

    return nothing;
  }

  // #endregion render

  // #region data

  private _getItems = () =>
    !this._filter && this._tab === "blocks"
      ? [
          {
            title: this.hass.localize(
              "ui.panel.config.automation.editor.blocks"
            ),
            items: this._getBlockItems(this._params!.type, this.hass.localize),
          },
        ]
      : !this._filter && this._selectedGroup
        ? [
            {
              title: this.hass.localize(
                `ui.panel.config.automation.editor.${this._params!.type}s.name`
              ),
              items: this._getGroupItems(
                this._params!.type,
                this._selectedGroup,
                this._selectedCollectionIndex ?? 0,
                this.hass.localize,
                this.hass.services,
                this._triggerDescriptions,
                this._conditionDescriptions,
                this._manifests,
                this._systemDomains?.byEntityDomain
              ),
            },
          ]
        : !this._filter &&
            this._tab === "targets" &&
            this._selectedTarget &&
            this._targetItems
          ? this._targetItems
          : undefined;

  private _getGroups = (
    type: AddAutomationElementDialogParams["type"],
    group?: string,
    collectionIndex?: number
  ): AutomationElementGroup => {
    if (group && collectionIndex !== undefined) {
      const selectedGroup =
        TYPES[type].collections[collectionIndex]?.groups[group] ??
        TYPES[type].collections.find((collection) => group in collection.groups)
          ?.groups[group];

      return selectedGroup?.members || { [group]: selectedGroup || {} };
    }

    return TYPES[type].collections.reduce(
      (acc, collection) => ({ ...acc, ...collection.groups }),
      {} as AutomationElementGroup
    );
  };

  private _items = memoizeOne(
    (
      type: AddAutomationElementDialogParams["type"],
      localize: LocalizeFunc,
      services: HomeAssistant["services"],
      triggerDescriptions: TriggerDescriptions,
      conditionDescriptions: ConditionDescriptions,
      manifests?: DomainManifestLookup
    ): AddAutomationElementListItem[] => {
      const groups = this._getGroups(type);

      const flattenGroups = (grp: AutomationElementGroup) =>
        Object.entries(grp).map(([key, options]) =>
          options.members
            ? flattenGroups(options.members)
            : options.domains
              ? // domain elements are appended below from the backend descriptions
                []
              : this._convertToItem(key, options, type, localize)
        );

      const items = flattenGroups(groups).flat();
      if (type === "trigger") {
        items.push(...this._triggers(localize, triggerDescriptions, undefined));
      } else if (type === "condition") {
        items.push(
          ...this._conditions(
            localize,
            conditionDescriptions,
            manifests,
            undefined
          )
        );
      } else if (type === "action") {
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
      conditionDescriptions: ConditionDescriptions,
      manifests?: DomainManifestLookup
    ): CollectionGroup[] => {
      const generatedCollections: CollectionGroup[] = [];

      let genericCollectionIndex = -1;
      let dynamicCollectionIndex = -1;

      const exclusiveDomains = this._getExclusiveDomains(type);

      const domainList =
        type === "trigger"
          ? Object.keys(triggerDescriptions ?? {}).map(getTriggerDomain)
          : type === "condition"
            ? Object.keys(conditionDescriptions ?? {}).map(getConditionDomain)
            : Object.keys(services ?? {});

      collections.forEach((collection, index) => {
        let collectionGroups = Object.entries(collection.groups);
        const groups: AddAutomationElementListItem[] = [];

        const types: CollectionGroupType[] = [];
        if (collection.groups.dynamicGroups) {
          types.push("dynamic");
        }
        if (collection.groups.helpers) {
          types.push("helper");
        }
        if (collection.groups.integrationGroups) {
          types.push("integration");
        }

        if (types.length) {
          groups.push(
            ...this._dynamicDomainGroups(
              localize,
              domainList,
              manifests,
              types,
              {
                type,
                usedDomains: domains,
                activeSystemDomains: this._systemDomains?.active,
                exclusiveDomains,
              }
            )
          );

          collectionGroups = collectionGroups.filter(
            ([key]) => !DYNAMIC_KEYWORDS.includes(key)
          );
        }

        groups.push(
          ...collectionGroups
            .filter(([, options]) =>
              this._groupHasItems(
                type,
                options,
                type === "condition"
                  ? conditionDescriptions
                  : triggerDescriptions
              )
            )
            .map(([key, options]) =>
              this._convertToItem(key, options, type, localize)
            )
        );

        if (groups.length) {
          if (collection.generic) {
            genericCollectionIndex = index;
          }
          if (collection.groups.dynamicGroups) {
            dynamicCollectionIndex = index;
          }

          generatedCollections.push({
            collectionIndex: index,
            titleKey: collection.titleKey,
            generic: collection.generic,
            groups: groups.sort((a, b) => {
              return stringCompare(a.name, b.name, this.hass.locale.language);
            }),
          });
        }
      });

      // move groups from dynamic to generic
      if (genericCollectionIndex !== -1 && dynamicCollectionIndex !== -1) {
        const groupsToMove =
          generatedCollections[dynamicCollectionIndex].groups.filter((group) =>
            DYNAMIC_TO_GENERIC.has(group.key)
          ) || [];
        generatedCollections[dynamicCollectionIndex].groups =
          generatedCollections[dynamicCollectionIndex].groups.filter(
            (group) => !DYNAMIC_TO_GENERIC.has(group.key)
          ) || [];

        generatedCollections[genericCollectionIndex].groups = [
          ...(generatedCollections[genericCollectionIndex].groups || []),
          ...groupsToMove,
        ].sort((a, b) =>
          stringCompare(a.name, b.name, this.hass.locale.language)
        );
      }

      return generatedCollections;
    }
  );

  private _getBlockItems = memoizeOne(
    (
      type: AddAutomationElementDialogParams["type"],
      localize: LocalizeFunc
    ): AddAutomationElementListItem[] => {
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
      localize: LocalizeFunc,
      services: HomeAssistant["services"],
      triggerDescriptions: TriggerDescriptions,
      conditionDescriptions: ConditionDescriptions,
      manifests?: DomainManifestLookup,
      systemDomainsByEntityDomain?: Map<string, Set<string>>
    ): AddAutomationElementListItem[] => {
      if (type === "trigger" && isDynamic(group)) {
        return this._triggers(
          localize,
          triggerDescriptions,
          systemDomainsByEntityDomain,
          group
        );
      }
      if (type === "condition" && isDynamic(group)) {
        return this._conditions(
          localize,
          conditionDescriptions,
          manifests,
          systemDomainsByEntityDomain,
          group
        );
      }
      if (type === "action" && isDynamic(group)) {
        return this._services(localize, services, manifests, group);
      }

      const groupDef =
        TYPES[type].collections[collectionIndex]?.groups[group] ??
        TYPES[type].collections.find((collection) => group in collection.groups)
          ?.groups[group];

      let result: AddAutomationElementListItem[];

      const descriptions =
        type === "condition" ? conditionDescriptions : triggerDescriptions;

      if (groupDef?.domains && !groupDef.members) {
        // Curated group whose items come solely from backend domains (e.g. Sun).
        result = this._getDomainElementItems(
          type,
          groupDef.domains,
          localize,
          descriptions
        );
      } else {
        const groups = this._getGroups(type, group, collectionIndex);
        result = Object.entries(groups).map(([key, options]) =>
          this._convertToItem(key, options, type, localize)
        );
        if (groupDef?.domains) {
          // Curated group with both static members and backend domains (Time).
          result.push(
            ...this._getDomainElementItems(
              type,
              groupDef.domains,
              localize,
              descriptions
            )
          );
        }
      }

      return result.sort((a, b) =>
        stringCompare(a.name, b.name, this.hass.locale.language)
      );
    }
  );

  private _classifyDomain(
    domain: string,
    manifest: DomainManifestLookup[string] | undefined,
    options: DomainClassificationOptions
  ): CollectionGroupType | undefined {
    const integrationType = manifest?.integration_type;

    if (integrationType === "helper") {
      return "helper";
    }

    if (ENTITY_DOMAINS_MAIN.has(domain) || integrationType === "entity") {
      // Core entity domains. Actions always list them; triggers/conditions
      // only when matching entities exist or a system domain covers them.
      if (
        options.type === "action" ||
        !options.usedDomains ||
        options.usedDomains.has(domain) ||
        ENTITY_DOMAINS_OTHER.has(domain) ||
        (options.activeSystemDomains?.has(domain) ?? false)
      ) {
        return "dynamic";
      }
      return undefined;
    }

    if (integrationType === "system" && options.type !== "action") {
      return options.activeSystemDomains?.has(domain) ? "dynamic" : undefined;
    }

    // Integrations that bring their own elements, built-in (like Apple TV,
    // FFmpeg) and custom (like HACS) alike.
    return "integration";
  }

  private _dynamicDomainGroups = (
    localize: LocalizeFunc,
    domains: string[],
    manifests: DomainManifestLookup | undefined,
    types: CollectionGroupType[],
    options: DomainClassificationOptions & { exclusiveDomains?: Set<string> }
  ): AddAutomationElementListItem[] => {
    if (!manifests) {
      return [];
    }
    const result: AddAutomationElementListItem[] = [];
    const addedDomains = new Set<string>();
    domains.forEach((domain) => {
      if (addedDomains.has(domain) || options.exclusiveDomains?.has(domain)) {
        return;
      }
      addedDomains.add(domain);

      const manifest = manifests[domain];
      const groupType = this._classifyDomain(domain, manifest, options);

      if (groupType && types.includes(groupType)) {
        result.push({
          icon: html`
            <ha-domain-icon .domain=${domain} brand-fallback></ha-domain-icon>
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
      systemDomainsByEntityDomain: Map<string, Set<string>> | undefined,
      group?: string
    ): AddAutomationElementListItem[] => {
      if (!triggers) {
        return [];
      }

      const browsedEntityDomain =
        group && isDynamic(group) ? getValueFromDynamic(group) : undefined;

      // System domains that should be merged into this entity domain group
      const systemDomainsForGroup = browsedEntityDomain
        ? systemDomainsByEntityDomain?.get(browsedEntityDomain)
        : undefined;

      return this._getTriggerListItems(
        localize,
        Object.keys(triggers).filter((trigger) => {
          const domain = getTriggerDomain(trigger);
          if (!group || group === `${DYNAMIC_PREFIX}${domain}`) {
            return true;
          }
          // Also include system domain triggers that cover the browsed entity domain
          return systemDomainsForGroup?.has(domain) ?? false;
        })
      );
    }
  );

  private _conditions = memoizeOne(
    (
      localize: LocalizeFunc,
      conditions: ConditionDescriptions,
      _manifests: DomainManifestLookup | undefined,
      systemDomainsByEntityDomain: Map<string, Set<string>> | undefined,
      group?: string
    ): AddAutomationElementListItem[] => {
      if (!conditions) {
        return [];
      }
      const result: AddAutomationElementListItem[] = [];

      const browsedEntityDomain =
        group && isDynamic(group) ? getValueFromDynamic(group) : undefined;

      const systemDomainsForGroup = browsedEntityDomain
        ? systemDomainsByEntityDomain?.get(browsedEntityDomain)
        : undefined;

      for (const condition of Object.keys(conditions)) {
        const domain = getConditionDomain(condition);

        if (
          group &&
          group !== `${DYNAMIC_PREFIX}${domain}` &&
          !(systemDomainsForGroup?.has(domain) ?? false)
        ) {
          continue;
        }

        result.push(this._getConditionListItem(localize, domain, condition));
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
    ): AddAutomationElementListItem[] => {
      if (!services) {
        return [];
      }
      const result: AddAutomationElementListItem[] = [];

      let domain: string | undefined;

      if (isDynamic(group)) {
        domain = getValueFromDynamic(group!);
      }

      const addDomain = (dmn: string) => {
        const services_keys = Object.keys(services[dmn]);
        const dmnManifest = manifests?.[dmn];
        const showDomainPrefix =
          !dmnManifest ||
          dmnManifest.integration_type !== "entity" ||
          !dmnManifest.is_built_in;

        for (const service of services_keys) {
          const serviceName =
            localize(
              `component.${dmn}.services.${service}.name`,
              this.hass.services[dmn][service].description_placeholders
            ) ||
            services[dmn][service]?.name ||
            service;
          result.push({
            icon: html`
              <ha-service-icon
                .hass=${this.hass}
                .service=${`${dmn}.${service}`}
              ></ha-service-icon>
            `,
            key: `${DYNAMIC_PREFIX}${dmn}.${service}`,
            name: showDomainPrefix
              ? `${domainToName(localize, dmn)}: ${serviceName}`
              : serviceName,
            description:
              localize(
                `component.${dmn}.services.${service}.description`,
                this.hass.services[dmn][service].description_placeholders
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

      if (group) {
        return [];
      }

      Object.keys(services)
        .sort()
        .forEach((dmn) => addDomain(dmn));

      return result;
    }
  );

  private _getLabel = memoizeOne((id: string) =>
    this._labelRegistry?.find(({ label_id }) => label_id === id)
  );

  private _getDomainType(domain: string) {
    const groupType = this._classifyDomain(domain, this._manifests?.[domain], {
      type: this._params!.type,
      usedDomains: this._domains,
      activeSystemDomains: this._systemDomains?.active,
    });
    if (groupType === "helper") {
      return "helpers";
    }
    if (groupType === "integration") {
      return "integrationGroups";
    }
    // "dynamic", plus domains hidden in the by-type list (like unused entity
    // domains) that can still surface when browsing by target.
    return "dynamicGroups";
  }

  private _sortDomainsByCollection(
    type: AddAutomationElementDialogParams["type"],
    entries: [
      string,
      { title: string; items: AddAutomationElementListItem[] },
    ][]
  ): { title: string; items: AddAutomationElementListItem[] }[] {
    const order: string[] = [];

    TYPES[type].collections.forEach((collection) => {
      order.push(...Object.keys(collection.groups));
    });

    return entries
      .sort((a, b) => {
        const domainA = a[0];
        const domainB = b[0];

        if (order.includes(domainA) && order.includes(domainB)) {
          return order.indexOf(domainA) - order.indexOf(domainB);
        }

        let typeA = domainA;
        let typeB = domainB;

        if (!order.includes(domainA)) {
          typeA = this._getDomainType(domainA);
        }

        if (!order.includes(domainB)) {
          typeB = this._getDomainType(domainB);
        }

        if (typeA === typeB) {
          return stringCompare(
            a[1].title,
            b[1].title,
            this.hass.locale.language
          );
        }
        return order.indexOf(typeA) - order.indexOf(typeB);
      })
      .map((entry) => entry[1]);
  }

  // #endregion data

  // #region data memoize

  private _getFloorAreaLookupMemoized = memoizeOne(
    (areas: HomeAssistant["areas"]) => getFloorAreaLookup(Object.values(areas))
  );

  private _getAreaDeviceLookupMemoized = memoizeOne(
    (devices: HomeAssistant["devices"]) =>
      getAreaDeviceLookup(Object.values(devices))
  );

  private _getAreaEntityLookupMemoized = memoizeOne(
    (entities: HomeAssistant["entities"]) =>
      getAreaEntityLookup(Object.values(entities))
  );

  private _getDeviceEntityLookupMemoized = memoizeOne(
    (entities: HomeAssistant["entities"]) =>
      getDeviceEntityLookup(Object.values(entities))
  );

  private _extractTypeAndIdFromTarget = memoizeOne(
    (target: SingleHassServiceTarget): [string, string | undefined] => {
      const [targetTypeId, targetId] = Object.entries(target)[0];
      const targetType = targetTypeId.replace("_id", "");
      return [targetType, targetId];
    }
  );

  // #endregion data memoize

  // #region render prepare

  private _convertToItem = (
    key: string,
    options,
    type: AddAutomationElementDialogParams["type"],
    localize: LocalizeFunc
  ): AddAutomationElementListItem => {
    // A group either lists explicit members or bundles backend element domains.
    const isGroup = !!(options.members || options.domains);
    return {
      key,
      name: localize(
        // @ts-ignore
        `ui.panel.config.automation.editor.${type}s.${
          isGroup ? "groups" : "type"
        }.${key}.label`
      ),
      description: localize(
        // @ts-ignore
        `ui.panel.config.automation.editor.${type}s.${
          isGroup ? "groups" : "type"
        }.${key}.description${isGroup ? "" : ".picker"}`
      ),
      iconPath: options.icon || TYPES[type].icons[key],
    };
  };

  // Domains owned exclusively by a curated group, i.e. a group that bundles
  // only domains and no static members (e.g. "sun" under the Sun group). Those
  // are hidden from the generic dynamic domain grouping so they don't appear
  // both standalone and inside the curated group. Domains of a mixed group
  // (static members + domains, e.g. "calendar"/"schedule" under Time) are NOT
  // hidden — they still surface as their own domain group as well.
  private _getExclusiveDomains = memoizeOne(
    (type: AddAutomationElementDialogParams["type"]): Set<string> => {
      const domains = new Set<string>();
      TYPES[type].collections.forEach((collection) =>
        Object.values(collection.groups).forEach((group) => {
          if (group.domains && !group.members) {
            group.domains.forEach((domain) => domains.add(domain));
          }
        })
      );
      return domains;
    }
  );

  private _getDomainElementItems(
    type: AddAutomationElementDialogParams["type"],
    domains: string[],
    localize: LocalizeFunc,
    descriptions: TriggerDescriptions | ConditionDescriptions
  ): AddAutomationElementListItem[] {
    const domainSet = new Set(domains);
    if (type === "trigger") {
      return Object.keys(descriptions)
        .filter((trigger) => domainSet.has(getTriggerDomain(trigger)))
        .map((trigger) =>
          this._getTriggerListItem(localize, getTriggerDomain(trigger), trigger)
        );
    }
    if (type === "condition") {
      return Object.keys(descriptions)
        .filter((condition) => domainSet.has(getConditionDomain(condition)))
        .map((condition) =>
          this._getConditionListItem(
            localize,
            getConditionDomain(condition),
            condition
          )
        );
    }
    return [];
  }

  private _groupHasItems(
    type: AddAutomationElementDialogParams["type"],
    options: { members?: object; domains?: string[] },
    descriptions: TriggerDescriptions | ConditionDescriptions
  ): boolean {
    if (options.members && Object.keys(options.members).length) {
      return true;
    }
    if (options.domains) {
      const domainSet = new Set(options.domains);
      const getDomain =
        type === "condition" ? getConditionDomain : getTriggerDomain;
      return Object.keys(descriptions).some((key) =>
        domainSet.has(getDomain(key))
      );
    }
    // plain single-element group
    return true;
  }

  private _getDomainGroupedListItems(
    localize: LocalizeFunc,
    ids: string[],
    getDomain: (id: string) => string,
    getListItem: (
      localize: LocalizeFunc,
      domain: string,
      id: string
    ) => AddAutomationElementListItem
  ): { title: string; items: AddAutomationElementListItem[] }[] {
    const items: Record<
      string,
      { title: string; items: AddAutomationElementListItem[] }
    > = {};

    // When a specific entity is selected, system domain items are merged
    // under the entity's real domain rather than under their system domain name.
    const targetEntityId = this._selectedTarget?.entity_id;
    const targetEntityDomain =
      targetEntityId &&
      this._manifests?.[computeDomain(targetEntityId)]?.integration_type !==
        "system"
        ? computeDomain(targetEntityId)
        : undefined;

    ids.forEach((id) => {
      const itemDomain = getDomain(id);
      const isSystemDomain =
        this._manifests?.[itemDomain]?.integration_type === "system";

      // System domain items are grouped under the entity's real domain (if
      // a specific entity is selected), so they appear alongside that domain's
      // own items rather than in a separate section.
      const groupDomain =
        isSystemDomain && targetEntityDomain ? targetEntityDomain : itemDomain;

      if (!items[groupDomain]) {
        items[groupDomain] = {
          title: domainToName(
            localize,
            groupDomain,
            this._manifests?.[groupDomain]
          ),
          items: [],
        };
      }

      items[groupDomain].items.push(getListItem(localize, itemDomain, id));

      items[groupDomain].items.sort((a, b) =>
        stringCompare(a.name, b.name, this.hass.locale.language)
      );
    });

    return this._sortDomainsByCollection(
      this._params!.type,
      Object.entries(items)
    );
  }

  private _getTriggerListItems(
    localize: LocalizeFunc,
    triggerIds: string[]
  ): AddAutomationElementListItem[] {
    return triggerIds
      .map((trigger) => {
        const domain = getTriggerDomain(trigger);

        return this._getTriggerListItem(localize, domain, trigger);
      })
      .sort((a, b) => stringCompare(a.name, b.name, this.hass.locale.language));
  }

  private _getTriggerListItem(
    localize: LocalizeFunc,
    domain: string,
    trigger: string
  ): AddAutomationElementListItem {
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
        localize(`component.${domain}.triggers.${triggerName}.name`) || trigger,
      description:
        localize(`component.${domain}.triggers.${triggerName}.description`) ||
        trigger,
    };
  }

  private _getConditionListItem(
    localize: LocalizeFunc,
    domain: string,
    condition: string
  ): AddAutomationElementListItem {
    const conditionName = getConditionObjectId(condition);
    return {
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
    };
  }

  private _getDomainGroupedActionListItems(
    localize: LocalizeFunc,
    serviceIds: string[]
  ): { title: string; items: AddAutomationElementListItem[] }[] {
    const items: Record<
      string,
      { title: string; items: AddAutomationElementListItem[] }
    > = {};

    serviceIds.forEach((service) => {
      const [domain, serviceName] = service.split(".", 2);
      if (!items[domain]) {
        items[domain] = {
          title: domainToName(localize, domain, this._manifests?.[domain]),
          items: [],
        };
      }

      items[domain].items.push({
        icon: html`
          <ha-service-icon
            .hass=${this.hass}
            .service=${`${domain}.${serviceName}`}
          ></ha-service-icon>
        `,
        key: `${DYNAMIC_PREFIX}${domain}.${serviceName}`,
        name: `${domain ? "" : `${domainToName(localize, domain)}: `}${
          this.hass.localize(
            `component.${domain}.services.${serviceName}.name`
          ) ||
          this.hass.services[domain][serviceName]?.name ||
          serviceName
        }`,
        description:
          this.hass.localize(
            `component.${domain}.services.${serviceName}.description`
          ) ||
          this.hass.services[domain][serviceName]?.description ||
          "",
      });

      items[domain].items.sort((a, b) =>
        stringCompare(a.name, b.name, this.hass.locale.language)
      );
    });

    return this._sortDomainsByCollection(
      this._params!.type,
      Object.entries(items)
    );
  }

  // #endregion render prepare

  // #region interaction

  private _close = () => {
    this._open = false;
  };

  private _back() {
    mainWindow.history.back();
  }

  private _getDocumentationUrl = memoizeOne(
    (type: "trigger" | "condition" | "action") =>
      documentationUrl(
        this.hass,
        type === "trigger"
          ? "/docs/automation/trigger/"
          : type === "condition"
            ? "/docs/automation/condition/"
            : "/docs/automation/action/"
      )
  );

  private _groupSelected(ev) {
    const group = ev.currentTarget;
    if (this._selectedGroup === group.value) {
      this._selectedGroup = undefined;
      this._selectedCollectionIndex = undefined;
      return;
    }
    this._selectedGroup = group.value;
    this._selectedCollectionIndex = ev.currentTarget.index;

    mainWindow.history.pushState(
      {
        dialogData: {
          group: this._selectedGroup,
          collectionIndex: this._selectedCollectionIndex,
        },
      },
      ""
    );
    requestAnimationFrame(() => {
      this._itemsListElement?.scrollTo(0, 0);
    });
  }

  private _paste() {
    this._params!.add(PASTE_VALUE);
    this.closeDialog();
  }

  private _selected(ev: ValueChangedEvent<string>) {
    let target: HassServiceTarget | undefined;
    if (
      this._tab === "targets" &&
      this._selectedTarget &&
      Object.values(this._selectedTarget)[0]
    ) {
      target = this._selectedTarget;
    }
    this._params!.add(ev.detail.value, target);
    this.closeDialog();
  }

  private _handleTargetSelected = (
    ev: ValueChangedEvent<SingleHassServiceTarget>
  ) => {
    this._targetItems = undefined;
    this._loadItemsError = false;
    this._selectedGroup = undefined;
    this._selectedCollectionIndex = undefined;
    this._selectedTarget = ev.detail.value;
    mainWindow.history.pushState(
      {
        dialogData: {
          target: this._selectedTarget,
        },
      },
      ""
    );

    requestAnimationFrame(() => {
      if (this._narrow) {
        this._contentElement?.scrollTo(0, 0);
      } else {
        this._itemsListElement?.scrollTo(0, 0);
      }
    });

    this._getItemsByTarget();
  };

  // Time & location groups have no target; picking one drills into its items
  // (the same list as the matching group in the "by type" tab).
  private _handleTimeLocationGroupSelected = (
    ev: ValueChangedEvent<string>
  ) => {
    this._targetItems = undefined;
    this._loadItemsError = false;
    this._selectedTarget = undefined;
    this._selectedGroup = ev.detail.value;
    this._selectedCollectionIndex = 0;
    mainWindow.history.pushState(
      {
        dialogData: {
          group: this._selectedGroup,
          collectionIndex: this._selectedCollectionIndex,
        },
      },
      ""
    );

    requestAnimationFrame(() => {
      if (this._narrow) {
        this._contentElement?.scrollTo(0, 0);
      } else {
        this._itemsListElement?.scrollTo(0, 0);
      }
    });
  };

  private _getTimeLocationLabel(
    type: AddAutomationElementDialogParams["type"]
  ): string | undefined {
    if (type !== "trigger" && type !== "condition") {
      return undefined;
    }
    return this.hass.localize("ui.panel.config.automation.editor.time_sun");
  }

  private _getTimeLocationGroups = memoizeOne(
    (
      type: AddAutomationElementDialogParams["type"],
      localize: LocalizeFunc,
      descriptions: TriggerDescriptions | ConditionDescriptions
    ): AddAutomationElementListItem[] => {
      if (type !== "trigger" && type !== "condition") {
        return [];
      }
      return TIME_LOCATION_GROUPS.map(
        (group) => [group, TYPES[type].collections[0].groups[group]] as const
      )
        .filter(
          ([, options]) =>
            options && this._groupHasItems(type, options, descriptions)
        )
        .map(([group, options]) =>
          this._convertToItem(group, options, type, localize)
        )
        .filter((item) => item.name);
    }
  );

  private _getDefaultStateItems(
    type: "trigger" | "condition"
  ): AddAutomationElementListItem[] {
    const items: AddAutomationElementListItem[] = [
      this._convertToItem("state", {}, type, this.hass.localize),
    ];

    const entityId = this._selectedTarget?.entity_id;
    if (entityId) {
      const NUMERIC_DOMAINS = ["counter", "input_number", "number", "sensor"];
      const domain = computeDomain(entityId);
      const stateObj = this.hass.states[entityId];
      if (
        NUMERIC_DOMAINS.includes(domain) ||
        (stateObj && isNumericState(stateObj))
      ) {
        items.push(
          this._convertToItem("numeric_state", {}, type, this.hass.localize)
        );
      }
    }

    return items;
  }

  private async _getItemsByTarget() {
    if (!this._selectedTarget) {
      return;
    }

    try {
      if (this._params!.type === "trigger") {
        const items = await getTriggersForTarget(
          this.hass.callWS,
          this._selectedTarget
        );

        const grouped = this._getDomainGroupedListItems(
          this.hass.localize,
          items,
          getTriggerDomain,
          (localize, domain, trigger) =>
            this._getTriggerListItem(localize, domain, trigger)
        );
        if (this._selectedTarget.entity_id) {
          grouped.push({
            title: this.hass.localize(
              `ui.panel.config.automation.editor.triggers.groups.entity.label` as LocalizeKeys
            ),
            items: this._getDefaultStateItems("trigger"),
          });
        }
        this._targetItems = grouped;
        return;
      }
      if (this._params!.type === "condition") {
        const items = await getConditionsForTarget(
          this.hass.callWS,
          this._selectedTarget
        );

        const grouped = this._getDomainGroupedListItems(
          this.hass.localize,
          items,
          getConditionDomain,
          (localize, domain, condition) =>
            this._getConditionListItem(localize, domain, condition)
        );
        if (this._selectedTarget.entity_id) {
          grouped.push({
            title: this.hass.localize(
              `ui.panel.config.automation.editor.conditions.groups.entity.label` as LocalizeKeys
            ),
            items: this._getDefaultStateItems("condition"),
          });
        }
        this._targetItems = grouped;
        return;
      }

      if (this._params!.type === "action") {
        const items: string[] = await getServicesForTarget(
          this.hass.callWS,
          this._selectedTarget
        );

        const filteredItems = items.filter(
          // homeassistant services are too generic to be applied on the selected target
          (service) => !service.startsWith("homeassistant.")
        );

        this._targetItems = this._getDomainGroupedActionListItems(
          this.hass.localize,
          filteredItems
        );
      }
    } catch (err) {
      this._loadItemsError = true;
      // eslint-disable-next-line no-console
      console.error(`Error fetching ${this._params!.type}s for target`, err);
    }
  }

  private _handleFilterInput = (ev: InputEvent) => {
    this._debounceFilterChanged((ev.target as HaInputSearch).value ?? "");
  };

  private _debounceFilterChanged = debounce((value: string) => {
    this._filter = value;
  }, 200);

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
        dismissable: true,
        ...(this._params.clipboardPasteToastBottomOffset != null
          ? {
              bottomOffset: this._params.clipboardPasteToastBottomOffset,
            }
          : {}),
      });
      this.closeDialog();
    }
  };

  private _switchTab(ev) {
    this._tab = ev.detail.value;
  }

  private _searchItemSelected(
    ev: CustomEvent<PickerComboBoxItem | FloorComboBoxItem | EntityComboBoxItem>
  ) {
    const item = ev.detail;

    if (
      (item as AutomationItemComboBoxItem).type &&
      !["floor", "area"].includes((item as AutomationItemComboBoxItem).type)
    ) {
      this._params!.add(item.id);
      this.closeDialog();
      return;
    }

    const targetType = getTargetComboBoxItemType(item);
    this._filter = "";
    this._selectedTarget = {
      [`${targetType}_id`]: item.id.split(TARGET_SEPARATOR, 2)[1],
    };
    this._tab = "targets";
  }

  private _handleClosed() {
    // if closing isn't already in progress, close the dialog
    if (!this._closing) {
      this.closeDialog();
    }
  }

  // #region interaction

  // #region render helpers

  private _getSelectedTargetLabel = memoizeOne(
    (selectedTarget: SingleHassServiceTarget): string | undefined => {
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

      if (
        targetId === undefined &&
        (targetType.startsWith("entity_") || targetType.startsWith("helper_"))
      ) {
        const domain = targetType.substring(7);
        return domainToName(
          this.hass.localize,
          domain,
          this._manifests?.[domain]
        );
      }

      if (targetId) {
        return getTargetText(
          {
            entities: this.hass.entities,
            devices: this.hass.devices,
            areas: this.hass.areas,
            floors: this.hass.floors,
          },
          this.hass.states,
          this.hass.localize,
          targetType as "floor" | "area" | "device" | "entity" | "label",
          targetId,
          this._getLabel
        );
      }

      return undefined;
    }
  );

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

  private _getAddFromTargetHidden = memoizeOne(
    (narrow: boolean, target?: SingleHassServiceTarget) => {
      if (narrow && target) {
        const [targetType, targetId] = this._extractTypeAndIdFromTarget(target);

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
                this._getDeviceEntityLookupMemoized(this.hass.entities)[
                  targetId
                ]?.length > 0
              )) ||
            targetType === "entity" ||
            targetType === "label")
        ) {
          return "hidden";
        }
      }

      return "";
    }
  );

  // #endregion render helpers

  // #region styles

  static get styles(): CSSResultGroup {
    return [
      haStyleScrollbar,
      css`
        ha-bottom-sheet {
          --ha-bottom-sheet-height: 90vh;
          --ha-bottom-sheet-height: calc(100dvh - var(--ha-space-12));
          --ha-bottom-sheet-max-height: var(--ha-bottom-sheet-height);
          --ha-bottom-sheet-max-width: 888px;
          --ha-bottom-sheet-padding: 0;
          --ha-bottom-sheet-surface-background: var(--card-background-color);
        }

        ha-dialog {
          --dialog-content-padding: 0;
          --ha-dialog-min-height: min(
            920px,
            calc(
              100vh - max(
                  var(--safe-area-inset-bottom),
                  var(--ha-space-4)
                ) - max(var(--safe-area-inset-top), var(--ha-space-4))
            )
          );
          --ha-dialog-min-height: min(
            920px,
            calc(
              100dvh - max(
                  var(--safe-area-inset-bottom),
                  var(--ha-space-4)
                ) - max(var(--safe-area-inset-top), var(--ha-space-4))
            )
          );
          --ha-dialog-max-height: var(--ha-dialog-min-height);
        }

        ha-dialog ha-icon-button[slot="actionItems"] {
          color: var(--secondary-text-color);
        }

        ha-input-search {
          display: block;
          --ha-input-padding-bottom: 0;
          margin: 0 var(--ha-space-4);
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
          gap: var(--ha-space-3);
        }

        ha-list-item-button {
          --ha-row-item-padding-block: var(--ha-space-1);
          --ha-row-item-padding-inline: var(--ha-space-3);
          --ha-row-item-min-height: 40px;
        }
        ha-list-item-button::part(start),
        ha-list-item-button::part(end) {
          color: var(--ha-color-on-neutral-quiet);
        }

        ha-automation-add-from-target,
        .groups {
          border-radius: var(--ha-border-radius-xl);
          border: 1px solid var(--ha-color-border-neutral-quiet);
          margin: var(--ha-space-3);
        }

        ha-automation-add-from-target,
        .groups {
          overflow: auto;
          /* Fixed-width left column so it does not resize as the right
             panel's content width changes between groups. */
          flex: 0 0 360px;
          margin-inline-end: 0;
        }

        ha-automation-add-from-target.hidden {
          display: none;
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

        ha-automation-add-items {
          flex: 1;
          min-width: 0;
        }

        .content.column ha-automation-add-from-target,
        .content.column ha-automation-add-items {
          flex: none;
        }
        .content.column ha-automation-add-items {
          min-height: 160px;
        }
        .content.column ha-automation-add-from-target {
          overflow: clip;
        }

        ha-dialog ha-automation-add-items {
          margin-top: var(--ha-space-3);
        }

        ha-bottom-sheet .groups {
          padding-bottom: max(var(--safe-area-inset-bottom), var(--ha-space-4));
        }

        ha-automation-add-items.hidden,
        .groups.hidden {
          display: none;
        }

        .groups {
          padding-bottom: max(var(--safe-area-inset-bottom), var(--ha-space-3));
        }

        ha-icon-next {
          width: var(--ha-space-6);
        }

        wa-divider {
          --spacing: 0;
        }

        ha-svg-icon.plus {
          color: var(--primary-color);
        }

        .shortcut {
          direction: ltr;
          --mdc-icon-size: var(--ha-space-3);
          display: inline-flex;
          flex-direction: row;
          align-items: center;
          gap: 2px;
          margin-right: var(--ha-space-4);
        }
        .shortcut span {
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

        ha-automation-add-search {
          flex: 1;
        }
      `,
    ];
  }

  // #endregion styles
}

declare global {
  interface HTMLElementTagNameMap {
    "add-automation-element-dialog": DialogAddAutomationElement;
  }
}
