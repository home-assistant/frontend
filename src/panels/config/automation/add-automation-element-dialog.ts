import type { ContextType } from "@lit/context";
import { mdiClose, mdiHelpCircleOutline } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { addRecent } from "../../../common/array/add-recent";
import { consume } from "../../../common/decorators/consume";
import { storage } from "../../../common/decorators/storage";
import { transform } from "../../../common/decorators/transform";
import type {
  HASSDomEvent,
  HASSDomTargetEvent,
} from "../../../common/dom/fire_event";
import { mainWindow } from "../../../common/dom/get_main_window";
import { listenMediaQuery } from "../../../common/dom/media_query";
import { computeDomain } from "../../../common/entity/compute_domain";
import type { LocalizeKeys } from "../../../common/translations/localize";
import { constructUrlCurrentPath } from "../../../common/url/construct-url";
import { debounce } from "../../../common/util/debounce";
import { deepEqual } from "../../../common/util/deep-equal";
import { uid } from "../../../common/util/uid";
import { ADAPTIVE_DIALOG_MEDIA_QUERY } from "../../../components/ha-adaptive-dialog";
import "../../../components/ha-bottom-sheet";
import "../../../components/ha-button-toggle-group";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-header";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-button-prev";
import "../../../components/ha-paste-bar";
import "../../../components/input/ha-input-search";
import type { HaInputSearch } from "../../../components/input/ha-input-search";
import {
  DYNAMIC_PREFIX,
  getValueFromDynamic,
  isDynamic,
} from "../../../data/automation";
import { getConditionDomain } from "../../../data/condition";
import {
  apiContext,
  conditionDescriptionsContext,
  configContext,
  connectionContext,
  internationalizationContext,
  labelsContext,
  manifestsContext,
  registriesContext,
  servicesContext,
  statesContext,
  triggerDescriptionsContext,
} from "../../../data/context";
import {
  getConditionIcons,
  getServiceIcons,
  getTriggerIcons,
} from "../../../data/icons";
import { domainToName } from "../../../data/integration";
import type { LabelRegistryEntry } from "../../../data/label/label_registry";
import {
  TARGET_SEPARATOR,
  getTargetComboBoxItemType,
  type SingleHassServiceTarget,
} from "../../../data/target";
import { getTriggerDomain } from "../../../data/trigger";
import { DialogMixin } from "../../../dialogs/dialog-mixin";
import { KeyboardShortcutMixin } from "../../../mixins/keyboard-shortcut-mixin";
import { haStyleScrollbar } from "../../../resources/styles";
import type { HomeAssistant, ValueChangedEvent } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { showToast } from "../../../util/toast";
import {
  getAllItems,
  getBlockItems,
  getCollections,
  getGroupItems,
  getRecentElements,
  getTimeLocationGroups,
} from "./add-automation-element/collections";
import {
  BUILDING_BLOCKS,
  ELEMENT_TYPES,
  MAX_RECENT_ELEMENTS,
  RECENT_ELEMENTS_STORAGE_KEY,
} from "./add-automation-element/constants";
import { calculateActiveSystemDomains } from "./add-automation-element/domain-classification";
import { getExclusiveDomains } from "./add-automation-element/element-items";
import "./add-automation-element/ha-automation-add-from-target";
import "./add-automation-element/ha-automation-add-groups";
import type { HaAutomationAddGroups } from "./add-automation-element/ha-automation-add-groups";
import "./add-automation-element/ha-automation-add-items";
import type { HaAutomationAddItems } from "./add-automation-element/ha-automation-add-items";
import "./add-automation-element/ha-automation-add-search";
import {
  fetchTargetElementKeys,
  getTargetSections,
} from "./add-automation-element/target-items";
import {
  extractTypeAndIdFromTarget,
  getSelectedTargetLabel,
  getTargetSubtitle,
  isTargetTreeHidden,
  isTargetWithId,
  type TargetLabelSources,
} from "./add-automation-element/target-labels";
import type {
  AddElementHistoryData,
  AddElementTab,
  AddElementType,
  AutomationItemComboBoxItem,
  ElementSources,
  ItemsSection,
  SystemDomains,
} from "./add-automation-element/types";
import type { AddAutomationElementDialogParams } from "./show-add-automation-element-dialog";
import {
  ADD_AUTOMATION_ELEMENT_AREA_TARGET_PARAM,
  ADD_AUTOMATION_ELEMENT_DEVICE_TARGET_PARAM,
  ADD_AUTOMATION_ELEMENT_ENTITY_TARGET_PARAM,
  ADD_AUTOMATION_ELEMENT_QUERY_PARAM,
  PASTE_VALUE,
  getAddAutomationElementTargetFromQuery,
} from "./show-add-automation-element-dialog";
import {
  RECENT_TARGETS_STORAGE_KEY,
  addRecentTarget,
} from "./target/recent_targets";

const DOCUMENTATION_PATHS: Record<AddElementType, string> = {
  trigger: "/docs/automation/trigger/",
  condition: "/docs/automation/condition/",
  action: "/docs/automation/action/",
};

@customElement("add-automation-element-dialog")
class DialogAddAutomationElement extends DialogMixin<AddAutomationElementDialogParams>(
  KeyboardShortcutMixin(LitElement)
) {
  // #region context

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: registriesContext, subscribe: true })
  private _registries!: ContextType<typeof registriesContext>;

  // Read on demand, the dialog only rerenders when the used domains change
  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  @state()
  @consume({ context: statesContext, subscribe: true })
  @transform<HomeAssistant["states"], Set<string>>({
    transformer: function (this: DialogAddAutomationElement, states) {
      const domains = new Set(Object.keys(states).map(computeDomain));
      // keep the previous set, so a state change doesn't rerender the dialog
      return deepEqual(domains, this._usedDomains)
        ? this._usedDomains
        : domains;
    },
  })
  private _usedDomains?: Set<string>;

  @state()
  @consume({ context: statesContext, subscribe: true })
  @transform<HomeAssistant["states"], SystemDomains | undefined>({
    transformer: function (this: DialogAddAutomationElement, states) {
      const systemDomains = this._calculateSystemDomains(states);
      // keep the previous result, so a state change doesn't rerender the dialog
      return deepEqual(systemDomains, this._systemDomains)
        ? this._systemDomains
        : systemDomains;
    },
    watch: [
      "_manifests",
      "_triggerDescriptions",
      "_conditionDescriptions",
      "_registries",
    ],
  })
  private _systemDomains?: SystemDomains;

  @state()
  @consume({ context: servicesContext, subscribe: true })
  private _services!: ContextType<typeof servicesContext>;

  @state()
  @consume({ context: configContext, subscribe: true })
  private _hassConfig!: ContextType<typeof configContext>;

  @consume({ context: connectionContext, subscribe: true })
  private _connection!: ContextType<typeof connectionContext>;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @state()
  @consume({ context: manifestsContext, subscribe: true })
  private _manifests?: ContextType<typeof manifestsContext>;

  @state()
  @consume({ context: triggerDescriptionsContext, subscribe: true })
  private _triggerDescriptions: ContextType<typeof triggerDescriptionsContext> =
    {};

  @state()
  @consume({ context: conditionDescriptionsContext, subscribe: true })
  private _conditionDescriptions: ContextType<
    typeof conditionDescriptionsContext
  > = {};

  @state()
  @consume({ context: labelsContext, subscribe: true })
  private _labelRegistry?: LabelRegistryEntry[];

  // #endregion context

  // #region state

  @state() private _selectedCollectionIndex?: number;

  @state() private _selectedGroup?: string;

  @state() private _selectedTarget?: SingleHassServiceTarget;

  @state() private _tab: AddElementTab = "targets";

  @state() private _filter = "";

  @state() private _narrow = false;

  @state() private _targetElementKeys?: string[];

  @state() private _loadItemsError = false;

  @storage({ key: RECENT_TARGETS_STORAGE_KEY, state: true, subscribe: false })
  private _recentTargets?: string[];

  @storage({ key: RECENT_ELEMENTS_STORAGE_KEY, state: true, subscribe: false })
  private _recentElements?: Partial<Record<AddElementType, string[]>>;

  // #endregion state

  // #region variables

  @query("ha-automation-add-items")
  private _itemsListElement?: HaAutomationAddItems;

  @query(".content")
  private _contentElement?: HTMLDivElement;

  @query("ha-automation-add-groups")
  private _groupsElement?: HaAutomationAddGroups;

  private _initialized = false;

  // The mode is kept while open, resizing would otherwise lose the view state
  private _bottomSheetMode = false;

  private _openedFromQuery = false;

  private _closing = false;

  private readonly _historyId = uid();

  private _hasManagerHistoryEntry = false;

  private _historyPending = false;

  private _closedWhileHistoryPending = false;

  private _unsubNarrow?: () => void;

  // #endregion variables

  // #region lifecycle

  public connectedCallback() {
    super.connectedCallback();
    this._unsubNarrow = listenMediaQuery(
      ADAPTIVE_DIALOG_MEDIA_QUERY,
      (matches) => {
        this._narrow = matches;
      }
    );
    if (!this._initialized && this.params) {
      this._initialized = true;
      this._bottomSheetMode = this._narrow;
      this._initialize(this.params.type);
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubNarrow?.();
    this._unsubNarrow = undefined;
    mainWindow.removeEventListener("popstate", this._historyUnwound);
  }

  private _initialize(type: AddElementType) {
    this._hasManagerHistoryEntry =
      mainWindow.history.state?.dialog === this.localName;

    const replacing = this.params!.replacingItemKey;
    const queryTarget = replacing
      ? undefined
      : getAddAutomationElementTargetFromQuery(
          this._states,
          this._registries.devices,
          this._registries.areas,
          type
        );
    this._openedFromQuery = !!queryTarget;

    if (replacing) {
      const view = this._getReplacingView(type, replacing);
      this._tab = view.tab;
      this._selectedGroup = view.group;
      this._selectedCollectionIndex = view.collectionIndex;
    }

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
    } else {
      // add initial dialog view state to history
      this._pushHistory({});
      // Same state as selecting the group, so back returns to the groups.
      if (this._selectedGroup) {
        this._pushHistory({
          group: this._selectedGroup,
          collectionIndex: this._selectedCollectionIndex,
        });
      }
    }

    const { connection } = this._connection;
    const { config } = this._hassConfig;
    if (type === "action") {
      this._i18n.loadBackendTranslation("services");
      getServiceIcons(connection, config);
    } else if (type === "trigger") {
      this._i18n.loadBackendTranslation("triggers");
      getTriggerIcons(connection, config);
    } else {
      this._i18n.loadBackendTranslation("conditions");
      getConditionIcons(connection, config);
    }

    if (queryTarget) {
      this._selectedTarget = queryTarget;
      this._tab = "targets";
      this._fetchTargetElements();
    }
  }

  public closeDialog(historyState?: any) {
    if (!this.isConnected) {
      return true;
    }

    // Navigating back in history goes back a level instead of closing
    if (
      !this._closing &&
      historyState &&
      (this._selectedTarget || this._selectedGroup)
    ) {
      const dialogData = this._ownHistoryData(historyState);
      if (dialogData?.target) {
        this._selectedGroup = undefined;
        this._selectedCollectionIndex = undefined;
        this._selectedTarget = dialogData.target;
        this._fetchTargetElements();
        this._tab = "targets";
        return false;
      }
      if (dialogData?.group) {
        this._selectedTarget = undefined;
        this._targetElementKeys = undefined;
        this._loadItemsError = false;
        this._selectedCollectionIndex = dialogData.collectionIndex;
        this._selectedGroup = dialogData.group;
        this._tab = dialogData.tab ?? "groups";
        return false;
      }

      // return to home on mobile
      if (this._narrow) {
        this._selectedTarget = undefined;
        this._selectedGroup = undefined;
        return false;
      }
    }

    if (!this._closing) {
      this._closing = true;
      if (this._unwindHistory() && historyState) {
        // stay on the dialog stack until the history is back at the opener
        super.closeDialog(historyState);
        return false;
      }
    }
    return super.closeDialog(historyState);
  }

  private _getReplacingView(
    type: AddElementType,
    key: string
  ): {
    tab: "groups" | "blocks";
    group?: string;
    collectionIndex?: number;
  } {
    if (key in BUILDING_BLOCKS[type]) {
      return { tab: "blocks" };
    }

    let domain: string | undefined;
    if (isDynamic(key)) {
      const value = getValueFromDynamic(key);
      const domains =
        type === "trigger"
          ? Object.keys(this._triggerDescriptions).map(getTriggerDomain)
          : type === "condition"
            ? Object.keys(this._conditionDescriptions).map(getConditionDomain)
            : Object.keys(this._services);
      domain =
        type === "trigger"
          ? getTriggerDomain(value)
          : type === "condition"
            ? getConditionDomain(value)
            : computeDomain(value);
      // Descriptions may still be loading. Until then, trust the key.
      if (domains.length && !domains.includes(domain)) {
        return { tab: "groups" };
      }
      if (!getExclusiveDomains(type).has(domain)) {
        // Dynamic groups list their items regardless of the collection.
        return { tab: "groups", group: `${DYNAMIC_PREFIX}${domain}` };
      }
    }

    for (const [collectionIndex, collection] of ELEMENT_TYPES[
      type
    ].collections.entries()) {
      for (const [group, options] of Object.entries(collection.groups)) {
        if (
          domain
            ? options.domains?.includes(domain)
            : group === key || (options.members && key in options.members)
        ) {
          return { tab: "groups", group, collectionIndex };
        }
      }
    }
    return { tab: "groups" };
  }

  protected supportedShortcuts(): SupportedShortcuts {
    return {
      v: () => this._addClipboard(),
    };
  }

  // #endregion lifecycle

  // #region history

  // Entries pushed by an earlier dialog, like before a page reload, are ignored
  private _ownHistoryData(
    historyState: { dialogData?: AddElementHistoryData } | null | undefined
  ): AddElementHistoryData | undefined {
    const dialogData = historyState?.dialogData;
    return dialogData?.dialogId === this._historyId ? dialogData : undefined;
  }

  private _pushHistory(
    data: Omit<AddElementHistoryData, "dialogId" | "depth">
  ) {
    const depth =
      (this._ownHistoryData(mainWindow.history.state)?.depth ?? 0) + 1;
    mainWindow.history.pushState(
      { dialogData: { ...data, dialogId: this._historyId, depth } },
      ""
    );
  }

  // Goes back to the opener entry, where the dialog manager closes this
  // dialog as the top one, so a dialog below it stays open.
  private _unwindHistory(): boolean {
    const depth = this._ownHistoryData(mainWindow.history.state)?.depth;
    if (!depth) {
      return false;
    }
    this._historyPending = true;
    mainWindow.addEventListener("popstate", this._historyUnwound, {
      once: true,
    });
    mainWindow.history.go(-(depth + (this._hasManagerHistoryEntry ? 1 : 0)));
    return true;
  }

  private _historyUnwound = () => {
    this._historyPending = false;
    if (this._closedWhileHistoryPending) {
      // let DialogMixin remove the dialog now
      this.dispatchEvent(new Event("closed"));
    }
  };

  // #endregion history

  // #region render

  protected render() {
    if (!this.params) {
      return nothing;
    }

    if (this._bottomSheetMode) {
      return html`
        <ha-bottom-sheet
          open
          @closed=${this._handleClosed}
          @after-show=${this._handleAfterShow}
          flexcontent
        >
          ${this._renderContent(this.params)}
        </ha-bottom-sheet>
      `;
    }

    return html`
      <ha-dialog
        width="large"
        open
        @closed=${this._handleClosed}
        @after-show=${this._handleAfterShow}
        flexcontent
      >
        ${this._renderContent(this.params)}
      </ha-dialog>
    `;
  }

  private _renderContent(params: AddAutomationElementDialogParams) {
    const { type } = params;
    const { localize } = this._i18n;
    const sources = this._getSources(
      type,
      localize,
      this._i18n.locale.language,
      this._services,
      this._triggerDescriptions,
      this._conditionDescriptions,
      this._manifests
    );
    const systemDomains = this._systemDomains;

    const narrowDetails =
      this._narrow && !!(this._selectedGroup || this._selectedTarget);

    const hideCollections =
      !!this._filter ||
      this._tab === "blocks" ||
      this._tab === "targets" ||
      (this._narrow && !!this._selectedGroup);

    const targetTreeHidden = this._isTargetTreeHidden(
      this._narrow,
      this._registries,
      this._selectedTarget
    );

    const addFromTargetHidden =
      targetTreeHidden || (this._narrow && !!this._selectedGroup);

    const listColumnHidden =
      this._tab === "targets" ? addFromTargetHidden : hideCollections;

    // The narrow target details have no paste bar, like the other details views.
    const showPasteFooter =
      this._tab !== "blocks" &&
      !(this._tab === "targets" && this._narrow && this._selectedTarget);

    const collections = hideCollections
      ? []
      : this._getCollections(sources, this._usedDomains, systemDomains?.active);

    const recentElements = hideCollections
      ? []
      : this._getRecentElements(
          type,
          this._recentElements?.[type],
          this._getAllItems(sources),
          collections
        );

    const pasteBar = params.clipboardItem
      ? html`<ha-paste-bar
          .label=${localize(
            `ui.panel.config.automation.editor.${type}s.paste_element`
          )}
          @paste-element=${this._paste}
        ></ha-paste-bar>`
      : nothing;

    return html`
      <div slot="header">
        ${this._renderHeader(type, narrowDetails)}
        ${
          !narrowDetails
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
          !this._filter && !narrowDetails
            ? html`<ha-button-toggle-group
                variant="neutral"
                active-variant="brand"
                .buttons=${this._getTabButtons(type, localize)}
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
            !!this._filter ||
            (this._narrow &&
              isTargetWithId(this._selectedTarget) &&
              !targetTreeHidden),
        })}
      >
        ${
          this._filter
            ? html`<ha-automation-add-search
                .filter=${this._filter}
                .narrow=${this._narrow}
                .addElementType=${type}
                .replacingItemKey=${params.replacingItemKey}
                .items=${this._getAllItems(sources)}
                @search-element-picked=${this._searchItemSelected}
              >
              </ha-automation-add-search>`
            : html`<div
                  class=${classMap({
                    "list-column": true,
                    hidden: listColumnHidden,
                  })}
                >
                  ${
                    this._tab === "targets"
                      ? html`<ha-automation-add-from-target
                          .value=${this._selectedTarget}
                          @value-changed=${this._handleTargetSelected}
                          @time-location-group-selected=${
                            this._handleTimeLocationGroupSelected
                          }
                          .narrow=${this._narrow}
                          .timeLocationLabel=${
                            type !== "action"
                              ? localize(
                                  "ui.panel.config.automation.editor.other"
                                )
                              : undefined
                          }
                          .timeLocationGroups=${this._getTimeLocationGroups(
                            sources
                          )}
                          .selectedGroup=${this._selectedGroup}
                          .recentTargets=${this._recentTargets}
                          @clear-recent-targets=${this._clearRecentTargets}
                          class=${classMap({
                            "ha-scrollbar": true,
                            hidden: addFromTargetHidden,
                          })}
                        ></ha-automation-add-from-target>`
                      : html`<ha-automation-add-groups
                          class=${classMap({
                            groups: true,
                            hidden: hideCollections,
                            "ha-scrollbar": true,
                          })}
                          .type=${type}
                          .collections=${collections}
                          .recentElements=${recentElements}
                          .selectedGroup=${this._selectedGroup}
                          .narrow=${this._narrow}
                          .replacingItemKey=${params.replacingItemKey}
                          @group-selected=${this._groupSelected}
                          @recent-element-selected=${this._recentSelected}
                          @clear-recent-elements=${this._clearRecentElements}
                        ></ha-automation-add-groups>`
                  }
                  ${showPasteFooter ? pasteBar : nothing}
                </div>
                <ha-automation-add-items
                  .items=${this._getItemSections(sources, systemDomains)}
                  .replacingItemKey=${params.replacingItemKey}
                  .scrollable=${!this._narrow || this._tab === "blocks"}
                  .error=${
                    this._tab === "targets" && this._loadItemsError
                      ? localize(
                          "ui.panel.config.automation.editor.load_target_items_failed"
                        )
                      : undefined
                  }
                  .selectLabel=${localize(
                    `ui.panel.config.automation.editor.${this._tab === "groups" || this._selectedGroup ? `${type}s.select` : "select_target"}` as LocalizeKeys
                  )}
                  .emptyLabel=${localize(
                    `ui.panel.config.automation.editor.${type}s.no_items_for_target`
                  )}
                  .tooltipDescription=${
                    this._tab === "targets" && !this._selectedGroup
                  }
                  .target=${
                    this._tab === "targets" && this._selectedTarget
                      ? this._getItemsTarget(
                          this._selectedTarget,
                          this._getSelectedTargetLabel(
                            this._getTargetLabelSources(),
                            this._selectedTarget
                          )
                        )
                      : undefined
                  }
                  class=${
                    this._narrow &&
                    !this._selectedGroup &&
                    !isTargetWithId(this._selectedTarget) &&
                    this._tab !== "blocks"
                      ? "hidden"
                      : ""
                  }
                  @value-changed=${this._selected}
                >
                  ${this._tab === "blocks" ? pasteBar : nothing}
                </ha-automation-add-items>`
        }
      </div>
    `;
  }

  private _renderHeader(type: AddElementType, narrowDetails: boolean) {
    const { localize } = this._i18n;
    const subtitle = this._getSubtitle(type);

    return html`
      <ha-dialog-header subtitle-position="above">
        <span slot="title">${this._getDialogTitle(type)}</span>
        ${subtitle ? html`<span slot="subtitle">${subtitle}</span>` : nothing}
        ${
          !narrowDetails
            ? html`
                <ha-icon-button
                  .path=${mdiHelpCircleOutline}
                  .label=${localize(
                    `ui.panel.config.automation.editor.${type}s.learn_more`
                  )}
                  slot="actionItems"
                  href=${documentationUrl(
                    this._hassConfig,
                    DOCUMENTATION_PATHS[type]
                  )}
                  target="_blank"
                  rel="noreferrer"
                ></ha-icon-button>
              `
            : nothing
        }
        ${
          narrowDetails && !this._openedFromQuery
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

  private _getDialogTitle(type: AddElementType): string {
    const { localize } = this._i18n;
    if (this._narrow && this._selectedGroup) {
      if (isDynamic(this._selectedGroup)) {
        const domain = getValueFromDynamic(this._selectedGroup);
        return domainToName(localize, domain, this._manifests?.[domain]);
      }
      return (
        localize(
          `ui.panel.config.automation.editor.${type}s.groups.${this._selectedGroup}.label` as LocalizeKeys
        ) ||
        localize(
          `ui.panel.config.automation.editor.${type}s.type.${this._selectedGroup}.label` as LocalizeKeys
        )
      );
    }

    if (this._narrow && this._selectedTarget) {
      const targetTitle = this._getSelectedTargetLabel(
        this._getTargetLabelSources(),
        this._selectedTarget
      );
      if (targetTitle) {
        return targetTitle;
      }
    }

    return this._getModeTitle(type);
  }

  private _getModeTitle(type: AddElementType): string {
    return this._i18n.localize(
      `ui.panel.config.automation.editor.${type}s.${this.params!.replacingItemKey ? "replace_title" : "add"}`
    );
  }

  private _getSubtitle(type: AddElementType): string | undefined {
    if (!this._narrow) {
      return undefined;
    }
    if (this._selectedGroup) {
      return this._getModeTitle(type);
    }
    if (this._selectedTarget) {
      return getTargetSubtitle(
        this._getTargetLabelSources(),
        this._selectedTarget
      );
    }
    return undefined;
  }

  // #endregion render

  // #region data

  private _getSources = memoizeOne(
    (
      type: AddElementType,
      localize: ElementSources["localize"],
      language: string,
      services: ElementSources["services"],
      triggerDescriptions: ElementSources["triggerDescriptions"],
      conditionDescriptions: ElementSources["conditionDescriptions"],
      manifests: ElementSources["manifests"]
    ): ElementSources => ({
      type,
      localize,
      language,
      services,
      triggerDescriptions,
      conditionDescriptions,
      manifests,
    })
  );

  private _calculateSystemDomains(
    states: HomeAssistant["states"]
  ): SystemDomains | undefined {
    const type = this.params?.type;
    if (!type || type === "action" || !this._manifests || !this._registries) {
      return undefined;
    }
    const { entities, devices } = this._registries;
    return type === "trigger"
      ? calculateActiveSystemDomains(
          this._triggerDescriptions,
          this._manifests,
          getTriggerDomain,
          states,
          entities,
          devices
        )
      : calculateActiveSystemDomains(
          this._conditionDescriptions,
          this._manifests,
          getConditionDomain,
          states,
          entities,
          devices
        );
  }

  private _getAllItems = memoizeOne(getAllItems);

  private _getCollections = memoizeOne(getCollections);

  private _getRecentElements = memoizeOne(getRecentElements);

  private _getTimeLocationGroups = memoizeOne(getTimeLocationGroups);

  private _getTabButtons = memoizeOne(
    (type: AddElementType, localize: ElementSources["localize"]) => {
      const tabButtons = [
        {
          label: localize("ui.panel.config.automation.editor.tabs.target"),
          value: "targets",
        },
        {
          label: localize("ui.panel.config.automation.editor.tabs.type"),
          value: "groups",
        },
      ];
      if (type !== "trigger") {
        tabButtons.push({
          label: localize("ui.panel.config.automation.editor.blocks"),
          value: "blocks",
        });
      }
      return tabButtons;
    }
  );

  private _getItemSections(
    sources: ElementSources,
    systemDomains: SystemDomains | undefined
  ): ItemsSection[] | undefined {
    if (this._tab === "blocks") {
      return this._getBlockSections(
        sources.type,
        sources.localize,
        sources.language
      );
    }
    if (this._selectedGroup) {
      return this._getGroupSections(
        sources,
        this._selectedGroup,
        this._selectedCollectionIndex ?? 0,
        systemDomains?.byEntityDomain
      );
    }
    if (
      this._tab === "targets" &&
      this._selectedTarget &&
      this._targetElementKeys
    ) {
      return this._getTargetSections(
        sources,
        this._selectedTarget,
        this._targetElementKeys,
        this._usedDomains,
        systemDomains?.active
      );
    }
    return undefined;
  }

  private _getBlockSections = memoizeOne(
    (
      type: AddElementType,
      localize: ElementSources["localize"],
      language: string
    ): ItemsSection[] => [
      {
        title: localize("ui.panel.config.automation.editor.blocks"),
        items: getBlockItems(type, localize, language),
      },
    ]
  );

  private _getGroupSections = memoizeOne(
    (
      sources: ElementSources,
      group: string,
      collectionIndex: number,
      systemDomainsByEntityDomain: Map<string, Set<string>> | undefined
    ): ItemsSection[] => [
      {
        title: sources.localize(
          `ui.panel.config.automation.editor.${sources.type}s.name`
        ),
        items: getGroupItems(
          sources,
          group,
          collectionIndex,
          systemDomainsByEntityDomain
        ),
      },
    ]
  );

  private _getTargetSections = memoizeOne(
    (
      sources: ElementSources,
      target: SingleHassServiceTarget,
      keys: string[],
      usedDomains: Set<string> | undefined,
      activeSystemDomains: Set<string> | undefined
    ): ItemsSection[] =>
      // states are taken as of loading the target, like the elements
      getTargetSections(sources, target, keys, this._states, {
        type: sources.type,
        usedDomains,
        activeSystemDomains,
      })
  );

  private _getTargetLabelSources(): TargetLabelSources {
    return this._memoizedTargetLabelSources(
      this._i18n,
      this._registries,
      this._states,
      this._manifests,
      this._labelRegistry
    );
  }

  private _memoizedTargetLabelSources = memoizeOne(
    (
      i18n: TargetLabelSources["i18n"],
      registries: TargetLabelSources["registries"],
      states: TargetLabelSources["states"],
      manifests: TargetLabelSources["manifests"],
      labels: LabelRegistryEntry[] | undefined
    ): TargetLabelSources => ({
      i18n,
      registries,
      states,
      manifests,
      getLabel: (id) => labels?.find(({ label_id }) => label_id === id),
    })
  );

  private _getSelectedTargetLabel = memoizeOne(getSelectedTargetLabel);

  private _getItemsTarget = memoizeOne(
    (
      target: SingleHassServiceTarget,
      label: string | undefined
    ): [string, string | undefined, string | undefined] => [
      ...extractTypeAndIdFromTarget(target),
      label,
    ]
  );

  private _isTargetTreeHidden = memoizeOne(
    (
      narrow: boolean,
      registries: TargetLabelSources["registries"],
      target?: SingleHassServiceTarget
    ) => narrow && !!target && isTargetTreeHidden(registries, target)
  );

  private async _fetchTargetElements() {
    const target = this._selectedTarget;
    if (!target) {
      return;
    }
    const type = this.params!.type;
    this._targetElementKeys = undefined;
    this._loadItemsError = false;

    try {
      const keys = await fetchTargetElementKeys(this._api.callWS, type, target);
      if (this._selectedTarget === target) {
        this._targetElementKeys = keys;
      }
    } catch (err) {
      if (this._selectedTarget === target) {
        this._loadItemsError = true;
      }
      // eslint-disable-next-line no-console
      console.error(`Error fetching ${type}s for target`, err);
    }
  }

  // #endregion data

  // #region interaction

  private _close() {
    this.closeDialog();
  }

  private _back() {
    mainWindow.history.back();
  }

  private _handleClosed(ev: Event) {
    // Closed by the dialog itself, like with escape or a click on the scrim
    if (!this._closing) {
      this._closing = true;
      this._unwindHistory();
    }
    if (this._historyPending) {
      // DialogMixin removes the dialog on this event
      ev.stopPropagation();
      this._closedWhileHistoryPending = true;
    }
  }

  // The content renders before the dialog is shown, so the group and item
  // being replaced can only be scrolled to now.
  private _handleAfterShow() {
    if (this._selectedGroup) {
      this._groupsElement?.scrollToSelected();
    }
    if (this.params?.replacingItemKey) {
      this._itemsListElement?.scrollToCurrent();
    }
  }

  private _scrollToTop(content: boolean) {
    requestAnimationFrame(() => {
      if (content) {
        this._contentElement?.scrollTo(0, 0);
      } else {
        this._itemsListElement?.scrollTo(0, 0);
      }
    });
  }

  private _switchTab(ev: ValueChangedEvent<AddElementTab>) {
    this._tab = ev.detail.value;
  }

  private _handleFilterInput = (ev: HASSDomTargetEvent<HaInputSearch>) => {
    this._debounceFilterChanged(ev.target.value ?? "");
  };

  private _debounceFilterChanged = debounce((value: string) => {
    this._filter = value;
  }, 200);

  private _groupSelected(ev: HASSDomEvent<HASSDomEvents["group-selected"]>) {
    const { group, collectionIndex } = ev.detail;
    if (this._selectedGroup === group) {
      this._selectedGroup = undefined;
      this._selectedCollectionIndex = undefined;
      return;
    }
    this._selectedGroup = group;
    this._selectedCollectionIndex = collectionIndex;
    this._pushHistory({ group, collectionIndex });
    this._scrollToTop(false);
  }

  private _handleTargetSelected(
    ev: ValueChangedEvent<SingleHassServiceTarget>
  ) {
    this._selectedGroup = undefined;
    this._selectedCollectionIndex = undefined;
    this._selectedTarget = ev.detail.value;
    this._pushHistory({ target: this._selectedTarget });
    this._scrollToTop(this._narrow);
    this._fetchTargetElements();
  }

  // Time & location groups have no target; picking one drills into its items
  // (the same list as the matching group in the "by type" tab).
  private _handleTimeLocationGroupSelected(ev: ValueChangedEvent<string>) {
    this._targetElementKeys = undefined;
    this._loadItemsError = false;
    this._selectedTarget = undefined;
    this._selectedGroup = ev.detail.value;
    this._selectedCollectionIndex = 0;
    this._pushHistory({
      group: this._selectedGroup,
      collectionIndex: this._selectedCollectionIndex,
      tab: "targets",
    });
    this._scrollToTop(this._narrow);
  }

  private _searchItemSelected(
    ev: HASSDomEvent<HASSDomEvents["search-element-picked"]>
  ) {
    const item = ev.detail;

    if (
      (item as AutomationItemComboBoxItem).type &&
      !["floor", "area"].includes((item as AutomationItemComboBoxItem).type)
    ) {
      this._add(item.id);
      return;
    }

    // ha-automation-add-from-target confirms the new value with a
    // value-changed event, which loads the target's elements
    const targetType = getTargetComboBoxItemType(item);
    this._filter = "";
    this._selectedTarget = {
      [`${targetType}_id`]: item.id.split(TARGET_SEPARATOR, 2)[1],
    };
    this._tab = "targets";
  }

  private _recentSelected(
    ev: HASSDomEvent<HASSDomEvents["recent-element-selected"]>
  ) {
    this._add(ev.detail.value);
  }

  private _selected(ev: ValueChangedEvent<string>) {
    const target =
      this._tab === "targets" && isTargetWithId(this._selectedTarget)
        ? this._selectedTarget
        : undefined;
    this._add(ev.detail.value, target);
  }

  private _add(key: string, target?: SingleHassServiceTarget) {
    this._rememberSelection(key, target);
    this.params!.add(key, target);
    this.closeDialog();
  }

  // Existence is only checked when showing recents, data that is still
  // loading must not remove valid ones
  private _rememberSelection(key: string, target?: SingleHassServiceTarget) {
    const type = this.params!.type;

    // Building blocks are rarely reused
    if (!(key in BUILDING_BLOCKS[type])) {
      this._recentElements = {
        ...this._recentElements,
        [type]: addRecent(
          this._recentElements?.[type],
          key,
          MAX_RECENT_ELEMENTS,
          (item) => typeof item === "string"
        ),
      };
    }

    if (target) {
      this._recentTargets = addRecentTarget(this._recentTargets, target);
    }
  }

  private _clearRecentElements() {
    this._recentElements = {
      ...this._recentElements,
      [this.params!.type]: [],
    };
  }

  private _clearRecentTargets() {
    this._recentTargets = [];
  }

  private _paste() {
    this.params!.add(PASTE_VALUE);
    this.closeDialog();
  }

  private _addClipboard() {
    const params = this.params;
    if (!params?.clipboardItem) {
      return;
    }
    const { localize } = this._i18n;
    params.add(PASTE_VALUE);
    showToast(this, {
      message: localize("ui.panel.config.automation.editor.item_pasted", {
        item: localize(
          `ui.panel.config.automation.editor.${params.type}s.type.${params.clipboardItem}.label` as LocalizeKeys
        ),
      }),
      dismissable: true,
      ...(params.clipboardPasteToastBottomOffset != null
        ? { bottomOffset: params.clipboardPasteToastBottomOffset }
        : {}),
    });
    this.closeDialog();
  }

  // #endregion interaction

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

        ha-bottom-sheet .list-column:has(> ha-paste-bar) {
          margin-bottom: max(var(--safe-area-inset-bottom), var(--ha-space-3));
        }
        ha-bottom-sheet ha-automation-add-items > ha-paste-bar {
          padding-bottom: max(var(--safe-area-inset-bottom), var(--ha-space-3));
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

        .list-column,
        .content.column ha-automation-add-from-target {
          border-radius: var(--ha-border-radius-xl);
          border: 1px solid var(--ha-color-border-neutral-quiet);
          margin: var(--ha-space-3);
          flex: 0 0 360px;
          margin-inline-end: 0;
        }

        .list-column {
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow: hidden;
        }

        .list-column > ha-automation-add-from-target,
        .list-column > .groups {
          flex: 1;
          min-height: 0;
          overflow: auto;
        }

        .content.column .list-column {
          display: contents;
        }

        @media (max-width: 870px), (max-height: 500px) {
          .list-column {
            flex: 1 1 auto;
          }
        }

        .list-column.hidden,
        ha-automation-add-from-target.hidden {
          display: none;
        }

        ha-bottom-sheet .list-column,
        ha-bottom-sheet .content.column ha-automation-add-from-target {
          margin: var(--ha-space-3);
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
        .list-column:has(> ha-paste-bar) > .groups {
          padding-bottom: var(--ha-space-3);
        }
        ha-automation-add-items:has(> ha-paste-bar) {
          --ha-automation-add-items-padding-bottom: var(--ha-space-3);
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
