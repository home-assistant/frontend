import "@home-assistant/webawesome/dist/components/divider/divider";
import { consume } from "@lit/context";
import {
  mdiAppleKeyboardCommand,
  mdiClose,
  mdiContentPaste,
  mdiPlus,
} from "@mdi/js";
import type {
  HassServiceTarget,
  UnsubscribeFunc,
} from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { mainWindow } from "../../../common/dom/get_main_window";
import { computeAreaName } from "../../../common/entity/compute_area_name";
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
import "../../../components/entity/state-badge";
import "../../../components/ha-bottom-sheet";
import "../../../components/ha-button";
import "../../../components/ha-button-toggle-group";
import "../../../components/ha-combo-box-item";
import { CONDITION_ICONS } from "../../../components/ha-condition-icon";
import "../../../components/ha-dialog-header";
import "../../../components/ha-domain-icon";
import "../../../components/ha-floor-icon";
import "../../../components/ha-icon";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-button-prev";
import "../../../components/ha-icon-next";
import "../../../components/ha-md-list";
import "../../../components/ha-md-list-item";
import type { PickerComboBoxItem } from "../../../components/ha-picker-combo-box";
import "../../../components/ha-section-title";
import "../../../components/ha-service-icon";
import "../../../components/ha-tooltip";
import { TRIGGER_ICONS } from "../../../components/ha-trigger-icon";
import "../../../components/ha-wa-dialog";
import "../../../components/search-input";
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
  subscribeConditions,
} from "../../../data/condition";
import {
  getConfigEntries,
  type ConfigEntry,
} from "../../../data/config_entries";
import { labelsContext } from "../../../data/context";
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
import { subscribeLabFeature } from "../../../data/labs";
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
  subscribeTriggers,
} from "../../../data/trigger";
import type { HassDialog } from "../../../dialogs/make-dialog-manager";
import { KeyboardShortcutMixin } from "../../../mixins/keyboard-shortcut-mixin";
import type { HomeAssistant, ValueChangedEvent } from "../../../types";
import { isMac } from "../../../util/is_mac";
import { showToast } from "../../../util/toast";
import "./add-automation-element/ha-automation-add-from-target";
import "./add-automation-element/ha-automation-add-items";
import "./add-automation-element/ha-automation-add-search";
import type { AddAutomationElementDialogParams } from "./show-add-automation-element-dialog";
import { PASTE_VALUE } from "./show-add-automation-element-dialog";
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

const DYNAMIC_KEYWORDS = ["dynamicGroups", "helpers", "other"];

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

  @state() private _triggerDescriptions: TriggerDescriptions = {};

  @state() private _targetItems?: {
    title: string;
    items: AddAutomationElementListItem[];
  }[];

  @state() private _loadItemsError = false;

  @state() private _newTriggersAndConditions = false;

  @state() private _conditionDescriptions: ConditionDescriptions = {};

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

  private _unsub?: Promise<UnsubscribeFunc>;

  private _unsubscribeLabFeatures?: Promise<UnsubscribeFunc>;

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

    if (changedProps.has("_newTriggersAndConditions")) {
      this._subscribeDescriptions();
    }
  }

  private _subscribeDescriptions() {
    this._unsubscribe();
    if (this._params?.type === "trigger") {
      this._triggerDescriptions = {};
      this._unsub = subscribeTriggers(this.hass, (triggers) => {
        this._triggerDescriptions = {
          ...this._triggerDescriptions,
          ...triggers,
        };
      });
    } else if (this._params?.type === "condition") {
      this._conditionDescriptions = {};
      this._unsub = subscribeConditions(this.hass, (conditions) => {
        this._conditionDescriptions = {
          ...this._conditionDescriptions,
          ...conditions,
        };
      });
    }
  }

  public showDialog(params): void {
    this._params = params;

    this.addKeyboardShortcuts();

    this._loadConfigEntries();

    this._unsubscribe();
    this._fetchManifests();
    this._calculateUsedDomains();

    this._unsubscribeLabFeatures = subscribeLabFeature(
      this.hass.connection,
      "automation",
      "new_triggers_conditions",
      (feature) => {
        this._newTriggersAndConditions = feature.enabled;
        this._tab = this._newTriggersAndConditions ? "targets" : "groups";
      }
    );

    // add initial dialog view state to history
    mainWindow.history.pushState(
      {
        dialogData: {},
      },
      ""
    );

    if (this._params?.type === "action") {
      this.hass.loadBackendTranslation("services");
      getServiceIcons(this.hass);
    } else if (this._params?.type === "trigger") {
      this.hass.loadBackendTranslation("triggers");
      getTriggerIcons(this.hass);
      this._subscribeDescriptions();
    } else if (this._params?.type === "condition") {
      this.hass.loadBackendTranslation("conditions");
      getConditionIcons(this.hass);
      this._subscribeDescriptions();
    }

    window.addEventListener("resize", this._updateNarrow);
    this._updateNarrow();

    // prevent view mode switch when resizing window
    this._bottomSheetMode = this._narrow;
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
    this._unsubscribe();
    if (this._params) {
      fireEvent(this, "dialog-closed", { dialog: this.localName });
    }
    this._open = true;
    this._closing = false;
    this._params = undefined;
    this._selectedCollectionIndex = undefined;
    this._selectedGroup = undefined;
    this._selectedTarget = undefined;
    this._tab = this._newTriggersAndConditions ? "targets" : "groups";
    this._filter = "";
    this._manifests = undefined;
    this._domains = undefined;
    this._bottomSheetMode = false;
    this._narrow = false;
    this._targetItems = undefined;
    this._loadItemsError = false;
    return true;
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
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("resize", this._updateNarrow);
    this._unsubscribe();
  }

  protected supportedShortcuts(): SupportedShortcuts {
    return {
      v: () => this._addClipboard(),
    };
  }

  private _unsubscribe() {
    if (this._unsub) {
      this._unsub.then((unsub) => unsub());
      this._unsub = undefined;
    }
    if (this._unsubscribeLabFeatures) {
      this._unsubscribeLabFeatures.then((unsub) => unsub());
      this._unsubscribeLabFeatures = undefined;
    }
  }

  // #endregion lifecycle

  // #region render

  private _getEmptyNote(automationElementType: string) {
    if (
      automationElementType !== "trigger" &&
      automationElementType !== "condition"
    ) {
      return undefined;
    }

    return this.hass.localize(
      `ui.panel.config.automation.editor.${automationElementType}s.no_items_for_target_note`,
      {
        labs_link: html`<a href="/config/labs" @click=${this._close}
          >${this.hass.localize("ui.panel.config.labs.caption")}</a
        >`,
      }
    );
  }

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
      <ha-wa-dialog
        .hass=${this.hass}
        width="large"
        .open=${this._open}
        @closed=${this._handleClosed}
        flexcontent
      >
        ${this._renderContent()}
      </ha-wa-dialog>
    `;
  }

  private _renderContent() {
    const automationElementType = this._params!.type;

    const tabButtons = [
      {
        label: this.hass.localize(
          `ui.panel.config.automation.editor.${automationElementType}s.name`
        ),
        value: "groups",
      },
    ];

    if (this._newTriggersAndConditions) {
      tabButtons.unshift({
        label: this.hass.localize(`ui.panel.config.automation.editor.targets`),
        value: "targets",
      });
    }

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
        ${!this._narrow || (!this._selectedGroup && !this._selectedTarget)
          ? html`
              <search-input
                ?autofocus=${!this._narrow}
                .hass=${this.hass}
                .filter=${this._filter}
                @value-changed=${this._debounceFilterChanged}
                .label=${this.hass.localize(`ui.common.search`)}
              ></search-input>
            `
          : nothing}
        ${!this._filter &&
        tabButtons.length > 1 &&
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
        ${this._filter
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
                this._manifests
              )}
              .convertToItem=${this._convertToItem}
              .newTriggersAndConditions=${this._newTriggersAndConditions}
              @search-element-picked=${this._searchItemSelected}
            >
            </ha-automation-add-search>`
          : this._tab === "targets"
            ? html`<ha-automation-add-from-target
                .hass=${this.hass}
                .value=${this._selectedTarget}
                @value-changed=${this._handleTargetSelected}
                .narrow=${this._narrow}
                class=${this._getAddFromTargetHidden(
                  this._narrow,
                  this._selectedTarget
                )}
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
                          @click=${this._paste}
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
                        <wa-divider></wa-divider>`
                    : nothing}
                  ${collections.map(
                    (collection, index) => html`
                      ${collection.titleKey && collection.groups.length
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
              <ha-automation-add-items
                .hass=${this.hass}
                .items=${this._getItems()}
                .scrollable=${!this._narrow}
                .error=${this._tab === "targets" && this._loadItemsError
                  ? this.hass.localize(
                      "ui.panel.config.automation.editor.load_target_items_failed"
                    )
                  : undefined}
                .selectLabel=${this.hass.localize(
                  `ui.panel.config.automation.editor.${this._tab === "groups" ? `${automationElementType}s.select` : "select_target"}` as LocalizeKeys
                )}
                .emptyLabel=${this.hass.localize(
                  `ui.panel.config.automation.editor.${automationElementType}s.no_items_for_target`
                )}
                .emptyNote=${this._getEmptyNote(automationElementType)}
                .tooltipDescription=${this._tab === "targets"}
                .target=${(this._tab === "targets" &&
                  this._selectedTarget &&
                  ([
                    ...this._extractTypeAndIdFromTarget(this._selectedTarget),
                    this._getSelectedTargetLabel(this._selectedTarget),
                  ] as [string, string | undefined, string | undefined])) ||
                undefined}
                .getLabel=${this._getLabel}
                .configEntryLookup=${this._configEntryLookup}
                class=${this._narrow &&
                !this._selectedGroup &&
                (!this._selectedTarget ||
                  (this._selectedTarget &&
                    !Object.values(this._selectedTarget)[0])) &&
                this._tab !== "blocks"
                  ? "hidden"
                  : ""}
                @value-changed=${this._selected}
              >
              </ha-automation-add-items>
            `
          : nothing}
      </div>
    `;
  }

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
              .join(computeRTL(this.hass) ? " ◂ " : " ▸ ");
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
      : !this._filter && this._tab === "groups" && this._selectedGroup
        ? [
            {
              title: this.hass.localize(
                `ui.panel.config.automation.editor.${this._params!.type}s.name`
              ),
              items: this._getGroupItems(
                this._params!.type,
                this._selectedGroup,
                this._selectedCollectionIndex ?? 0,
                this._domains,
                this.hass.localize,
                this.hass.services,
                this._manifests
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

  private _items = memoizeOne(
    (
      type: AddAutomationElementDialogParams["type"],
      localize: LocalizeFunc,
      services: HomeAssistant["services"],
      manifests?: DomainManifestLookup
    ): AddAutomationElementListItem[] => {
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
      } else if (type === "condition") {
        items.push(
          ...this._conditions(localize, this._conditionDescriptions, manifests)
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
    ): {
      titleKey?: LocalizeKeys;
      groups: AddAutomationElementListItem[];
    }[] => {
      const generatedCollections: any = [];

      collections.forEach((collection) => {
        let collectionGroups = Object.entries(collection.groups);
        const groups: AddAutomationElementListItem[] = [];

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
      domains: Set<string> | undefined,
      localize: LocalizeFunc,
      services: HomeAssistant["services"],
      manifests?: DomainManifestLookup
    ): AddAutomationElementListItem[] => {
      if (type === "trigger" && isDynamic(group)) {
        return this._triggers(localize, this._triggerDescriptions, group);
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
  ): AddAutomationElementListItem[] => {
    if (!services || !manifests) {
      return [];
    }
    const result: AddAutomationElementListItem[] = [];
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
  ): AddAutomationElementListItem[] => {
    if (!triggers || !manifests) {
      return [];
    }
    const result: AddAutomationElementListItem[] = [];
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
    ): AddAutomationElementListItem[] => {
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

  private _conditionGroups = (
    localize: LocalizeFunc,
    conditions: ConditionDescriptions,
    manifests: DomainManifestLookup | undefined,
    domains: Set<string> | undefined,
    type: "helper" | "other" | undefined
  ): AddAutomationElementListItem[] => {
    if (!conditions || !manifests) {
      return [];
    }
    const result: AddAutomationElementListItem[] = [];
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
    ): AddAutomationElementListItem[] => {
      if (!conditions) {
        return [];
      }
      const result: AddAutomationElementListItem[] = [];

      for (const condition of Object.keys(conditions)) {
        const domain = getConditionDomain(condition);

        if (group && group !== `${DYNAMIC_PREFIX}${domain}`) {
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
              this.hass.localize(
                `component.${dmn}.services.${service}.name`,
                this.hass.services[dmn][service].description_placeholders
              ) ||
              services[dmn][service]?.name ||
              service
            }`,
            description:
              this.hass.localize(
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

  private _getLabel = memoizeOne((id: string) =>
    this._labelRegistry?.find(({ label_id }) => label_id === id)
  );

  private _getDomainType(domain: string) {
    return ENTITY_DOMAINS_MAIN.has(domain) ||
      (this._manifests?.[domain].integration_type === "entity" &&
        !ENTITY_DOMAINS_OTHER.has(domain))
      ? "dynamicGroups"
      : this._manifests?.[domain].integration_type === "helper"
        ? "helpers"
        : "other";
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
  ): AddAutomationElementListItem => ({
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

  private _getDomainGroupedTriggerListItems(
    localize: LocalizeFunc,
    triggerIds: string[]
  ): { title: string; items: AddAutomationElementListItem[] }[] {
    const items: Record<
      string,
      { title: string; items: AddAutomationElementListItem[] }
    > = {};

    triggerIds.forEach((trigger) => {
      const domain = getTriggerDomain(trigger);

      if (!items[domain]) {
        items[domain] = {
          title: domainToName(localize, domain, this._manifests?.[domain]),
          items: [],
        };
      }

      items[domain].items.push(
        this._getTriggerListItem(localize, domain, trigger)
      );

      items[domain].items.sort((a, b) =>
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

  private _getDomainGroupedConditionListItems(
    localize: LocalizeFunc,
    conditionIds: string[]
  ): { title: string; items: AddAutomationElementListItem[] }[] {
    const items: Record<
      string,
      { title: string; items: AddAutomationElementListItem[] }
    > = {};

    conditionIds.forEach((condition) => {
      const domain = getConditionDomain(condition);
      if (!items[domain]) {
        items[domain] = {
          title: domainToName(localize, domain, this._manifests?.[domain]),
          items: [],
        };
      }

      items[domain].items.push(
        this._getConditionListItem(localize, domain, condition)
      );

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

        this._targetItems = this._getDomainGroupedTriggerListItems(
          this.hass.localize,
          items
        );
        return;
      }
      if (this._params!.type === "condition") {
        const items = await getConditionsForTarget(
          this.hass.callWS,
          this._selectedTarget
        );

        this._targetItems = this._getDomainGroupedConditionListItems(
          this.hass.localize,
          items
        );
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
          this.hass,
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
      css`
        ha-bottom-sheet {
          --ha-bottom-sheet-height: 90vh;
          --ha-bottom-sheet-height: calc(100dvh - var(--ha-space-12));
          --ha-bottom-sheet-max-height: var(--ha-bottom-sheet-height);
          --ha-bottom-sheet-max-width: 888px;
          --ha-bottom-sheet-padding: 0;
          --ha-bottom-sheet-surface-background: var(--card-background-color);
        }

        ha-wa-dialog {
          --dialog-content-padding: 0;
          --ha-dialog-min-height: min(
            800px,
            calc(
              100vh - max(
                  var(--safe-area-inset-bottom),
                  var(--ha-space-4)
                ) - max(var(--safe-area-inset-top), var(--ha-space-4))
            )
          );
          --ha-dialog-min-height: min(
            800px,
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

        ha-md-list {
          padding: 0;
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
          flex: 4;
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
          flex: 6;
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

        ha-wa-dialog ha-automation-add-items {
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
