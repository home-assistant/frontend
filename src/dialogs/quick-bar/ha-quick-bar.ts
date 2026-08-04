import { mdiCommentProcessingOutline, mdiDevices } from "@mdi/js";
import { consume } from "@lit/context";
import Fuse from "fuse.js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { NavigationFilterOptions } from "../../common/config/filter_navigation_pages";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { fireEvent } from "../../common/dom/fire_event";
import { navigate } from "../../common/navigate";
import { caseInsensitiveStringCompare } from "../../common/string/compare";
import "../../components/entity/state-badge";
import "../../components/ha-adaptive-dialog";
import "../../components/ha-combo-box-item";
import "../../components/ha-domain-icon";
import "../../components/ha-icon";
import "../../components/ha-picker-combo-box";
import type {
  HaPickerComboBox,
  PickerComboBoxIndexSelectedDetail,
  PickerComboBoxItem,
} from "../../components/ha-picker-combo-box";
import "../../components/ha-spinner";
import "../../components/ha-svg-icon";
import "../../components/ha-tip";
import { areaComboBoxKeys, getAreas } from "../../data/area/area_picker";
import { getConfigEntries, type ConfigEntry } from "../../data/config_entries";
import {
  deviceComboBoxKeys,
  getDevices,
  type DevicePickerItem,
} from "../../data/device/device_picker";
import {
  entityComboBoxKeys,
  getEntities,
  type EntityComboBoxItem,
} from "../../data/entity/entity_picker";
import {
  fetchHassioAddonsInfo,
  type HassioAddonInfo,
} from "../../data/hassio/addon";
import {
  commandComboBoxKeys,
  generateActionCommands,
  generateNavigationCommands,
  navigateComboBoxKeys,
  type ActionCommandComboBoxItem,
  type NavigationComboBoxItem,
} from "../../data/quick_bar";
import type { RelatedIdSets } from "../../common/search/related-context";
import { sortRelatedFirst } from "../../common/search/related-context";
import { relatedContext } from "../../data/context";
import {
  multiTermSortedSearch,
  type FuseWeightedKey,
} from "../../resources/fuseMultiTerm";
import { buttonLinkStyle } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { isIosApp } from "../../util/is_ios";
import { isMac } from "../../util/is_mac";
import { showConfirmationDialog } from "../generic/show-dialog-box";
import { showShortcutsDialog } from "../shortcuts/show-shortcuts-dialog";
import { showVoiceCommandDialog } from "../voice-command-dialog/show-ha-voice-command-dialog";
import {
  effectiveQuickBarMode,
  type QuickBarParams,
  type QuickBarSection,
} from "./show-dialog-quick-bar";

const SEPARATOR = "________";

interface AssistComboBoxItem extends PickerComboBoxItem {
  action: "assist";
  assistPrompt: string;
}

type QuickBarComboBoxItem =
  | NavigationComboBoxItem
  | ActionCommandComboBoxItem
  | EntityComboBoxItem
  | DevicePickerItem
  | AssistComboBoxItem;

@customElement("ha-quick-bar")
export class QuickBar extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state()
  @consume({ context: relatedContext, subscribe: true })
  private _relatedIdSets?: RelatedIdSets;

  @state() private _open = false;

  @state() private _loading = true;

  @state() private _showHint = false;

  @state() private _selectedSection?: QuickBarSection;

  @state() private _opened = false;

  @query("ha-picker-combo-box") private _comboBox?: HaPickerComboBox;

  private get _showEntityId() {
    return this.hass.userData?.showEntityIdPicker;
  }

  private _configEntryLookup: Record<string, ConfigEntry> = {};

  private _addons?: HassioAddonInfo[];

  private _navigationFilterOptions: NavigationFilterOptions = {};

  private _translationsLoaded = false;

  private _itemSelected = false;

  // #region lifecycle
  public async showDialog(params: QuickBarParams) {
    if (!this._translationsLoaded) {
      this._fetchTranslations();
      this._translationsLoaded = true;
    }
    this._initialize();
    this._selectedSection = effectiveQuickBarMode(this.hass.user, params.mode);
    this._showHint = params.showHint ?? false;

    this._open = true;
  }

  private async _fetchTranslations() {
    await this.hass.loadBackendTranslation("title");
  }

  private async _initialize() {
    try {
      const configEntries = await getConfigEntries(this.hass);
      this._configEntryLookup = Object.fromEntries(
        configEntries.map((entry) => [entry.entry_id, entry])
      );
      // Derive Bluetooth config entries status for navigation filtering
      this._navigationFilterOptions = {
        hasBluetoothConfigEntries: configEntries.some(
          (entry) => entry.domain === "bluetooth"
        ),
      };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error fetching config entries for quick bar", err);
    }

    if (
      this.hass.user?.is_admin &&
      isComponentLoaded(this.hass.config, "hassio")
    ) {
      try {
        const hassioAddonsInfo = await fetchHassioAddonsInfo(this.hass);
        this._addons = hassioAddonsInfo.addons;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Error fetching hassio addons for quick bar", err);
      }
    }

    this._loading = false;
  }

  protected updated(changedProps: PropertyValues) {
    if (changedProps.has("_loading") && !this._loading && this._opened) {
      requestAnimationFrame(() => {
        this._comboBox?.focus();
      });
    }
  }

  private _dialogOpened = async () => {
    this._opened = true;
    requestAnimationFrame(() => {
      if (this.hass && isIosApp(this.hass.auth.external)) {
        this.hass.auth.external!.fireMessage({
          type: "focus_element",
          payload: {
            element_id: "combo-box",
          },
        });
        return;
      }
      this._comboBox?.focus();
    });
  };

  // be sure to reload ha-picker-combo-box when adaptive-dialog mode changes
  private _showTriggered = () => {
    this._opened = false;
  };

  public closeDialog() {
    this._open = false;
    return true;
  }

  private _dialogClosed = () => {
    this._selectedSection = undefined;
    this._opened = false;
    this._open = false;
    this._itemSelected = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  };

  // #endregion lifecycle

  // #region render

  protected render() {
    if (!this._open && !this._opened) {
      return nothing;
    }

    const sections = [
      {
        id: "navigate",
        label: this.hass.localize("ui.dialogs.quick-bar.navigate_title"),
      },
      ...(this.hass.user?.is_admin
        ? [
            "separator" as const,
            {
              id: "command",
              label: this.hass.localize("ui.dialogs.quick-bar.commands_title"),
            },
          ]
        : []),
      "separator" as const,
      {
        id: "entity",
        label: this.hass.localize("ui.components.target-picker.type.entities"),
      },
      ...(this.hass.user?.is_admin
        ? [
            {
              id: "device",
              label: this.hass.localize(
                "ui.components.target-picker.type.devices"
              ),
            },
            {
              id: "area",
              label: this.hass.localize(
                "ui.components.target-picker.type.areas"
              ),
            },
          ]
        : []),
    ];

    return html`
      <ha-adaptive-dialog
        without-header
        flexcontent
        aria-label=${this.hass.localize("ui.dialogs.quick-bar.title")}
        .open=${this._open}
        hideActions
        @wa-show=${this._showTriggered}
        @wa-after-show=${this._dialogOpened}
        @closed=${this._dialogClosed}
      >
        ${
          !this._loading && this._opened
            ? html`<ha-picker-combo-box
                id="combo-box"
                @index-selected=${this._handleItemSelected}
                .notFoundLabel=${this.hass.localize(
                  "ui.dialogs.quick-bar.nothing_found"
                )}
                .label=${this.hass.localize("ui.dialogs.quick-bar.title")}
                .getItems=${this._getItems}
                .rowRenderer=${this._renderRow}
                mode="dialog"
                .sections=${sections}
                .selectedSection=${this._selectedSection}
                .sectionTitleFunction=${this._sectionTitleFunction}
                clearable
              ></ha-picker-combo-box>`
            : nothing
        }
        ${
          this._showHint
            ? html`<ha-tip slot="footer"
                >${this.hass.localize("ui.tips.key_shortcut_quick_search", {
                  keyboard_shortcut: html`<button
                    class="link"
                    @click=${this._openShortcutDialog}
                  >
                    ${this.hass.localize("ui.tips.keyboard_shortcut")}
                  </button>`,
                  modifier: isMac ? "⌘" : "Ctrl",
                })}</ha-tip
              >`
            : nothing
        }
      </ha-adaptive-dialog>
    `;
  }

  private _renderRow = (item: QuickBarComboBoxItem) => {
    if (!item) {
      return nothing;
    }

    const iconPath = item.icon_path || mdiDevices;

    return html`
      <ha-combo-box-item
        tabindex="-1"
        type="button"
        style="--mdc-icon-size: 24px;"
      >
        ${
          "stateObj" in item && item.stateObj
            ? html`
                <state-badge
                  slot="start"
                  .stateObj=${(item as EntityComboBoxItem).stateObj}
                ></state-badge>
              `
            : "domain" in item && item.domain
              ? html`
                  <ha-domain-icon
                    slot="start"
                    style="margin: var(--ha-space-1);"
                    .domain=${item.domain}
                    brand-fallback
                  ></ha-domain-icon>
                `
              : "image" in item && item.image
                ? html`
                    <img
                      slot="start"
                      alt=${item.primary ?? "Unknown"}
                      .src=${item.image}
                      style=${
                        "iconColor" in item && item.iconColor
                          ? `background-color: ${item.iconColor}; padding: 4px; border-radius: var(--ha-border-radius-circle); width: 24px; height: 24px`
                          : ""
                      }
                    />
                  `
                : item.icon
                  ? html`<ha-icon
                      style="margin: var(--ha-space-1);"
                      slot="start"
                      .icon=${item.icon}
                    ></ha-icon>`
                  : "iconColor" in item && item.iconColor
                    ? html`
                        <div
                          slot="start"
                          style=${`padding: 4px; border-radius: var(--ha-border-radius-circle); background-color: ${item.iconColor};`}
                        >
                          <ha-svg-icon
                            style="color: var(--white-color); --mdc-icon-size: 24px;"
                            .path=${iconPath}
                          ></ha-svg-icon>
                        </div>
                      `
                    : html`
                        <ha-svg-icon
                          style="margin: var(--ha-space-1);"
                          slot="start"
                          .path=${iconPath}
                        ></ha-svg-icon>
                      `
        }
        <span slot="headline">${item.primary}</span>
        ${
          item.secondary
            ? html`<span slot="supporting-text">${item.secondary}</span>`
            : nothing
        }
        ${
          "stateObj" in item && !!this._showEntityId
            ? html`
                <span slot="supporting-text" class="code">
                  ${item.stateObj?.entity_id}
                </span>
              `
            : nothing
        }
        ${
          "domain_name" in item &&
          (!("stateObj" in item) || !this._showEntityId)
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

  private _getRowSpinner = memoizeOne(() => {
    const spinner = document.createElement("ha-spinner");
    spinner.size = "small";
    spinner.style.marginRight = "16px";
    spinner.style.position = "absolute";
    spinner.style.right = "0";
    return spinner;
  });

  private _sectionTitleFunction = ({
    firstIndex,
    lastIndex,
    firstItem,
    secondItem,
    itemsCount,
  }: {
    firstIndex: number;
    lastIndex: number;
    firstItem: QuickBarComboBoxItem | string;
    secondItem: QuickBarComboBoxItem | string;
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

    const type =
      "action" in firstItem
        ? this.hass.localize("ui.dialogs.quick-bar.commands_title")
        : "path" in firstItem
          ? this.hass.localize("ui.dialogs.quick-bar.navigate_title")
          : "stateObj" in firstItem
            ? this.hass.localize("ui.components.target-picker.type.entities")
            : "domain" in firstItem
              ? this.hass.localize("ui.components.target-picker.type.devices")
              : this.hass.localize("ui.components.target-picker.type.areas");

    return type;
  };

  // #endregion render

  // #region data

  private _getItems = (searchString: string, section: string) => {
    this._selectedSection = section as QuickBarSection | undefined;
    return this._getItemsMemoized(
      this._configEntryLookup,
      this._relatedIdSets,
      searchString,
      this._selectedSection
    );
  };

  private _getItemsMemoized = memoizeOne(
    (
      configEntryLookup: Record<string, ConfigEntry>,
      relatedIdSets: RelatedIdSets | undefined,
      filter?: string,
      section?: QuickBarSection
    ) => {
      const items: (string | QuickBarComboBoxItem)[] = [];
      const prompt = filter?.trim();
      const assistItem =
        prompt &&
        (!section || section === "command") &&
        isComponentLoaded(this.hass.config, "conversation") &&
        !this.hass.auth.external?.config.hasAssist
          ? ({
              id: "ask-assist",
              action: "assist",
              primary: this.hass.localize("ui.dialogs.quick-bar.ask_assist", {
                query: prompt,
              }),
              icon_path: mdiCommentProcessingOutline,
              assistPrompt: prompt,
            } satisfies AssistComboBoxItem)
          : undefined;

      if (!section || section === "navigate") {
        let navigateItems = this._generateNavigationCommandsMemoized(
          this.hass,
          this._addons,
          this._navigationFilterOptions
        ).sort(this._sortBySortingLabel);

        if (filter) {
          navigateItems = this._filterGroup(
            "navigate",
            navigateItems,
            filter
          ) as NavigationComboBoxItem[];
        }

        if (!section && navigateItems.length) {
          // show group title
          items.push(this.hass.localize("ui.dialogs.quick-bar.navigate_title"));
        }

        items.push(...navigateItems);
      }

      if (!section || section === "command") {
        let commandItems = this.hass.user?.is_admin
          ? this._generateActionCommandsMemoized(this.hass).sort(
              this._sortBySortingLabel
            )
          : [];

        if (filter) {
          commandItems = this._filterGroup(
            "command",
            commandItems,
            filter
          ) as ActionCommandComboBoxItem[];
        }

        if (!section && (commandItems.length || assistItem)) {
          // show group title
          items.push(this.hass.localize("ui.dialogs.quick-bar.commands_title"));
        }

        items.push(...commandItems);
        if (assistItem) {
          items.push(assistItem);
        }
      }

      if (!section || section === "entity") {
        let entityItems = this._getEntitiesMemoized(this.hass);

        // Mark related items
        if (relatedIdSets?.entities.size) {
          entityItems = entityItems.map((item) => ({
            ...item,
            isRelated: relatedIdSets.entities.has(
              (item as EntityComboBoxItem).stateObj?.entity_id || ""
            ),
          }));
        }

        if (filter) {
          entityItems = sortRelatedFirst(
            this._filterGroup(
              "entity",
              entityItems,
              filter
            ) as EntityComboBoxItem[]
          );
        } else {
          entityItems = this._sortRelatedByLabel(entityItems);
        }

        if (!section && entityItems.length) {
          // show group title
          items.push(
            this.hass.localize("ui.components.target-picker.type.entities")
          );
        }

        items.push(...entityItems);
      }

      if (this.hass.user?.is_admin && (!section || section === "device")) {
        let deviceItems = this._getDevicesMemoized(
          this.hass,
          configEntryLookup
        );

        // Mark related items
        if (relatedIdSets?.devices.size) {
          deviceItems = deviceItems.map((item) => {
            const deviceId = item.id.split(SEPARATOR)[1];
            return {
              ...item,
              isRelated: relatedIdSets.devices.has(deviceId || ""),
            };
          });
        }

        if (filter) {
          deviceItems = sortRelatedFirst(
            this._filterGroup("device", deviceItems, filter)
          );
        } else {
          deviceItems = this._sortRelatedByLabel(deviceItems);
        }

        if (!section && deviceItems.length) {
          // show group title
          items.push(
            this.hass.localize("ui.components.target-picker.type.devices")
          );
        }

        items.push(...deviceItems);
      }

      if (this.hass.user?.is_admin && (!section || section === "area")) {
        let areaItems = this._getAreasMemoized(this.hass);

        // Mark related items
        if (relatedIdSets?.areas.size) {
          areaItems = areaItems.map((item) => {
            const areaId = item.id.split(SEPARATOR)[1];
            return {
              ...item,
              isRelated: relatedIdSets.areas.has(areaId || ""),
            };
          });
        }

        if (filter) {
          areaItems = sortRelatedFirst(
            this._filterGroup("area", areaItems, filter)
          );
        } else {
          areaItems = this._sortRelatedByLabel(areaItems);
        }

        if (!section && areaItems.length) {
          // show group title
          items.push(
            this.hass.localize("ui.components.target-picker.type.areas")
          );
        }

        items.push(...areaItems);
      }

      return items;
    }
  );

  private _getEntitiesMemoized = memoizeOne((hass: HomeAssistant) =>
    getEntities(hass, { idPrefix: `entity${SEPARATOR}` })
  );

  private _getDevicesMemoized = memoizeOne(
    (hass: HomeAssistant, configEntryLookup: Record<string, ConfigEntry>) =>
      getDevices(hass, configEntryLookup, { idPrefix: `device${SEPARATOR}` })
  );

  private _getAreasMemoized = memoizeOne((hass: HomeAssistant) =>
    getAreas(
      hass.areas,
      hass.floors,
      hass.devices,
      hass.entities,
      hass.states,
      {
        idPrefix: `area${SEPARATOR}`,
      }
    )
  );

  private _generateNavigationCommandsMemoized = memoizeOne(
    (
      hass: HomeAssistant,
      apps: HassioAddonInfo[] | undefined,
      filterOptions: NavigationFilterOptions
    ) => generateNavigationCommands(hass, apps, filterOptions)
  );

  private _generateActionCommandsMemoized = memoizeOne(generateActionCommands);

  private _createFuseIndex = (
    states: PickerComboBoxItem[],
    keys: FuseWeightedKey[]
  ) => Fuse.createIndex(keys, states);

  private _fuseIndexes = {
    entity: memoizeOne((states: PickerComboBoxItem[]) =>
      this._createFuseIndex(states, entityComboBoxKeys)
    ),
    device: memoizeOne((states: PickerComboBoxItem[]) =>
      this._createFuseIndex(states, deviceComboBoxKeys)
    ),
    area: memoizeOne((states: PickerComboBoxItem[]) =>
      this._createFuseIndex(states, areaComboBoxKeys)
    ),
    command: memoizeOne((states: PickerComboBoxItem[]) =>
      this._createFuseIndex(states, commandComboBoxKeys)
    ),
    navigate: memoizeOne((states: PickerComboBoxItem[]) =>
      this._createFuseIndex(states, navigateComboBoxKeys)
    ),
  };

  private _filterGroup(
    type: QuickBarSection,
    items: PickerComboBoxItem[],
    searchTerm: string
  ) {
    const fuseIndex = this._fuseIndexes[type](items);

    return multiTermSortedSearch(
      items,
      searchTerm,
      (item: PickerComboBoxItem) => item.id,
      fuseIndex
    );
  }

  private _sortBySortingLabel = (
    entityA: PickerComboBoxItem,
    entityB: PickerComboBoxItem
  ) =>
    caseInsensitiveStringCompare(
      entityA.sorting_label!,
      entityB.sorting_label!,
      this.hass.locale.language
    );

  private _sortRelatedByLabel = (items: PickerComboBoxItem[]) =>
    [...items].sort((a, b) => {
      if (a.isRelated && !b.isRelated) return -1;
      if (!a.isRelated && b.isRelated) return 1;
      return this._sortBySortingLabel(a, b);
    });

  // #endregion data

  // #region interaction

  private _navigate(path: string, newTab = false) {
    if (newTab) {
      window.open(path, "_blank", "noreferrer");
    } else {
      navigate(path);
    }
  }

  private async _handleItemSelected(
    ev: CustomEvent<PickerComboBoxIndexSelectedDetail>
  ) {
    if (
      !this._itemSelected &&
      this._comboBox &&
      this._comboBox.virtualizerElement
    ) {
      const { index, newTab } = ev.detail;
      const item = this._comboBox.virtualizerElement.items[
        index
      ] as QuickBarComboBoxItem;

      this._itemSelected = true;

      if (item && "assistPrompt" in item) {
        this.closeDialog();
        showVoiceCommandDialog(this, this.hass, {
          pipeline_id: "last_used",
          start_listening: false,
          prompt: item.assistPrompt,
          submit: true,
        });
        return;
      }

      // entity selected
      if (item && "stateObj" in item) {
        this.closeDialog();
        fireEvent(this, "hass-more-info", {
          entityId: item.search_labels!.entityId,
        });
        return;
      }

      // device selected
      if (item && item.id.startsWith(`device${SEPARATOR}`)) {
        const path = `/config/devices/device/${item.id.split(SEPARATOR)[1]}`;
        this.closeDialog();
        this._navigate(path, newTab);
        return;
      }

      // area selected
      if (item && item.id.startsWith(`area${SEPARATOR}`)) {
        const path = `/config/areas/area/${item.id.split(SEPARATOR)[1]}`;
        this.closeDialog();
        this._navigate(path, newTab);
        return;
      }

      // command selected
      if (item && "action" in item) {
        const actionItem = item as ActionCommandComboBoxItem;
        if (actionItem.action === "restart" || actionItem.action === "stop") {
          const confirmed = await showConfirmationDialog(this, {
            title: this.hass.localize(
              `ui.dialogs.restart.${actionItem.action}.confirm_title`
            ),
            text: this.hass.localize(
              `ui.dialogs.restart.${actionItem.action}.confirm_description`
            ),
            confirmText: this.hass.localize(
              `ui.dialogs.restart.${actionItem.action}.confirm_action`
            ),
            destructive: true,
          });
          if (!confirmed) {
            return;
          }

          this.hass.callService(actionItem.domain!, actionItem.action);
          this.closeDialog();
          return;
        }

        const element = this._comboBox.virtualizerElement.querySelector(
          `#list-item-${index}`
        ) as HTMLDivElement | null;

        if (element) {
          element.style.backgroundColor =
            "var(--ha-color-fill-primary-normal-resting)";
          element.prepend(this._getRowSpinner());
        }

        await this.hass.callService(actionItem.domain!, actionItem.action);

        this.closeDialog();
        return;
      }

      // navigation selected
      if (item && "path" in item) {
        this.closeDialog();

        if (!item.path) {
          showShortcutsDialog(this);
          return;
        }

        const path = (item as NavigationComboBoxItem).path;
        this._navigate(path, newTab);
      }
    }
  }

  private _openShortcutDialog(ev: Event): void {
    ev.preventDefault();
    showShortcutsDialog(this);
    this.closeDialog();
  }

  // #endregion interaction

  // #region styles

  static get styles(): CSSResultGroup {
    return [
      buttonLinkStyle,
      css`
        :host {
          --dialog-surface-margin-top: var(--ha-space-10);
          --ha-dialog-min-height: 620px;
          --ha-bottom-sheet-height: calc(
            100vh - max(var(--safe-area-inset-top), 48px)
          );
          --ha-bottom-sheet-height: calc(
            100dvh - max(var(--safe-area-inset-top), 48px)
          );
          --ha-bottom-sheet-max-height: calc(
            100vh - max(var(--safe-area-inset-top), 48px)
          );
          --ha-bottom-sheet-max-height: calc(
            100dvh - max(var(--safe-area-inset-top), 48px)
          );
          --dialog-content-padding: 0;
          --safe-area-inset-bottom: 0px;
          --ha-dialog-show-duration: var(--ha-animation-duration-instant);
        }

        ha-tip {
          display: flex;
          justify-content: center;
          align-items: center;
          color: var(--secondary-text-color);
          gap: var(--ha-space-1);
        }

        ha-tip a {
          color: var(--primary-color);
        }

        @media all and (max-width: 450px), all and (max-height: 690px) {
          ha-tip {
            display: none;
          }
        }
      `,
    ];
  }

  // #endregion styles
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-quick-bar": QuickBar;
  }
}
