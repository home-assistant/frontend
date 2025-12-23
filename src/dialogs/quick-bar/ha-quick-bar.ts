import {
  mdiDevices,
  mdiKeyboard,
  mdiNavigationVariant,
  mdiPuzzle,
  mdiReload,
  mdiServerNetwork,
  mdiStorePlus,
} from "@mdi/js";
import Fuse from "fuse.js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { canShowPage } from "../../common/config/can_show_page";
import { componentsWithService } from "../../common/config/components_with_service";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { fireEvent } from "../../common/dom/fire_event";
import { navigate } from "../../common/navigate";
import { caseInsensitiveStringCompare } from "../../common/string/compare";
import "../../components/ha-adaptive-dialog";
import "../../components/ha-picker-combo-box";
import type {
  HaPickerComboBox,
  PickerComboBoxItem,
} from "../../components/ha-picker-combo-box";
import "../../components/ha-spinner";
import "../../components/ha-combo-box-item";
import "../../components/entity/state-badge";
import "../../components/ha-domain-icon";
import "../../components/ha-icon";
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
import { domainToName } from "../../data/integration";
import { getPanelIcon, getPanelNameTranslationKey } from "../../data/panel";
import type { PageNavigation } from "../../layouts/hass-tabs-subpage";
import { configSections } from "../../panels/config/ha-panel-config";
import {
  multiTermSortedSearch,
  type FuseWeightedKey,
} from "../../resources/fuseMultiTerm";
import { loadVirtualizer } from "../../resources/virtualizer";
import type { HomeAssistant } from "../../types";
import { isIosApp } from "../../util/is_ios";
import { showConfirmationDialog } from "../generic/show-dialog-box";
import { showShortcutsDialog } from "../shortcuts/show-shortcuts-dialog";
import type { QuickBarParams, QuickBarSection } from "./show-dialog-quick-bar";

export const commandComboBoxKeys: FuseWeightedKey[] = [
  {
    name: "primary",
    weight: 10,
  },
  {
    name: "domain",
    weight: 8,
  },
  {
    name: "secondary",
    weight: 6,
  },
];

export const navigateComboBoxKeys: FuseWeightedKey[] = [
  {
    name: "primary",
    weight: 10,
  },
  {
    name: "path",
    weight: 8,
  },
  {
    name: "secondary",
    weight: 6,
  },
];

const SEPARATOR = "________";

interface NavigationComboBoxItem extends PickerComboBoxItem {
  path: string;
  image?: string;
  iconColor?: string;
}

interface ActionCommandComboBoxItem extends PickerComboBoxItem {
  action: string;
  domain?: string;
}

interface BaseNavigationCommand {
  path: string;
  primary: string;
  icon_path?: string;
  iconPath?: string;
  iconColor?: string;
  image?: string;
}

interface NavigationInfo extends PageNavigation {
  primary: string;
}
@customElement("ha-quick-bar")
export class QuickBar extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _open = false;

  @state() private _loading = true;

  @state() private _hint?: string;

  @state() private _selectedSection?: QuickBarSection;

  @state() private _opened = false;

  @query("ha-picker-combo-box") private _comboBox?: HaPickerComboBox;

  private _configEntryLookup: Record<string, ConfigEntry> = {};

  private _addons?: HassioAddonInfo[];

  private get _showEntityId() {
    return this.hass.userData?.showEntityIdPicker;
  }

  private _translationsLoaded = false;

  connectedCallback(): void {
    super.connectedCallback();
    if (!this._translationsLoaded) {
      this._fetchTranslations();
      this._translationsLoaded = true;
    }
    this._initialize();
  }

  public async showDialog(params: QuickBarParams) {
    this._selectedSection = params.mode;
    this._hint = params.hint;
    this._open = true;
  }

  public closeDialog() {
    this._open = false;
    return true;
  }

  protected willUpdate() {
    if (!this.hasUpdated) {
      loadVirtualizer();
    }
  }

  private _getItemsMemoized = memoizeOne(
    (
      configEntryLookup: Record<string, ConfigEntry>,
      filter?: string,
      section?: QuickBarSection
    ) => {
      const items: (string | PickerComboBoxItem)[] = [];

      if (!section || section === "entity") {
        let entityItems = this._getEntitiesMemoized(this.hass).sort(
          this._sortBySortingLabel
        );

        if (filter) {
          entityItems = this._filterGroup(
            "entity",
            entityItems,
            filter,
            entityComboBoxKeys
          ) as EntityComboBoxItem[];
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
        ).sort(this._sortBySortingLabel);

        if (filter) {
          deviceItems = this._filterGroup(
            "device",
            deviceItems,
            filter,
            deviceComboBoxKeys
          );
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
        let areaItems = this._getAreasMemoized(this.hass).sort(
          this._sortBySortingLabel
        );

        if (filter) {
          areaItems = this._filterGroup(
            "area",
            areaItems,
            filter,
            areaComboBoxKeys
          );
        }

        if (!section && areaItems.length) {
          // show group title
          items.push(
            this.hass.localize("ui.components.target-picker.type.areas")
          );
        }

        items.push(...areaItems);
      }

      if (!section || section === "navigate") {
        let navigateItems = this._generateNavigationCommands().sort(
          this._sortBySortingLabel
        );

        if (filter) {
          navigateItems = this._filterGroup(
            "navigate",
            navigateItems,
            filter,
            navigateComboBoxKeys
          ) as NavigationComboBoxItem[];
        }

        if (!section && navigateItems.length) {
          // show group title
          items.push(this.hass.localize("ui.dialogs.quick-bar.navigate_title"));
        }

        items.push(...navigateItems);
      }

      if (this.hass.user?.is_admin && (!section || section === "command")) {
        let commandItems = [
          ...this._generateReloadCommands(),
          ...this._generateServerControlCommands(),
        ].sort(this._sortBySortingLabel);

        if (filter) {
          commandItems = this._filterGroup(
            "command",
            commandItems,
            filter,
            commandComboBoxKeys
          ) as ActionCommandComboBoxItem[];
        }

        if (!section && commandItems.length) {
          // show group title
          items.push(this.hass.localize("ui.dialogs.quick-bar.commands_title"));
        }

        items.push(...commandItems);
      }

      return items;
    }
  );

  private _getItems = (searchString: string, section: string) => {
    this._selectedSection = section as QuickBarSection | undefined;
    return this._getItemsMemoized(
      this._configEntryLookup,
      searchString,
      this._selectedSection
    );
  };

  protected render() {
    if (!this._open) {
      return nothing;
    }

    const sections = [
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
      "separator" as const,
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
    ];

    return html`
      <ha-adaptive-dialog
        .hass=${this.hass}
        aria-label=${this.hass.localize("ui.dialogs.quick-bar.title")}
        .open=${this._open}
        hideActions
        @wa-show=${this._showTriggered}
        @wa-after-show=${this._dialogOpened}
        @closed=${this._dialogClosed}
      >
        <div slot="header"></div>
        ${!this._loading && this._opened
          ? html`<ha-picker-combo-box
              .hass=${this.hass}
              @index-selected=${this._handleItemSelected}
              .notFoundLabel=${this.hass.localize(
                "ui.dialogs.quick-bar.nothing_found"
              )}
              .getItems=${this._getItems}
              .rowRenderer=${this._renderRow}
              mode="dialog"
              .sections=${sections}
              .selectedSection=${this._selectedSection}
              .sectionTitleFunction=${this._sectionTitleFunction}
            ></ha-picker-combo-box>`
          : nothing}
        ${this._hint
          ? html`<ha-tip slot="footer" .hass=${this.hass}
              >${this._hint}</ha-tip
            >`
          : nothing}
      </ha-adaptive-dialog>
    `;
  }

  private _renderRow = (
    item:
      | NavigationComboBoxItem
      | ActionCommandComboBoxItem
      | EntityComboBoxItem
      | DevicePickerItem
  ) => {
    if (!item) {
      return nothing;
    }

    const iconPath = item.icon_path || mdiDevices;

    return html`
      <ha-combo-box-item
        tabindex="-1"
        type="button"
        style="--mdc-icon-size: 32px;"
      >
        ${"stateObj" in item && item.stateObj
          ? html`
              <state-badge
                slot="start"
                .stateObj=${(item as EntityComboBoxItem).stateObj}
                .hass=${this.hass}
              ></state-badge>
            `
          : "domain" in item && item.domain
            ? html`
                <ha-domain-icon
                  slot="start"
                  .hass=${this.hass}
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
                  />
                `
              : item.icon
                ? html`<ha-icon slot="start" .icon=${item.icon}></ha-icon>`
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
                      <ha-svg-icon slot="start" .path=${iconPath}></ha-svg-icon>
                    `}
        <span slot="headline">${item.primary}</span>
        ${item.secondary
          ? html`<span slot="supporting-text">${item.secondary}</span>`
          : nothing}
        ${"stateObj" in item && !!this._showEntityId
          ? html`
              <span slot="supporting-text" class="code">
                ${item.stateObj?.entity_id}
              </span>
            `
          : nothing}
        ${"domain_name" in item &&
        (!("stateObj" in item) || !this._showEntityId)
          ? html`
              <div slot="trailing-supporting-text" class="domain">
                ${(item as EntityComboBoxItem).domain_name}
              </div>
            `
          : nothing}
      </ha-combo-box-item>
    `;
  };

  private async _fetchTranslations() {
    await this.hass.loadBackendTranslation("title");
  }

  private async _initialize() {
    try {
      const configEntries = await getConfigEntries(this.hass);
      this._configEntryLookup = Object.fromEntries(
        configEntries.map((entry) => [entry.entry_id, entry])
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error fetching config entries for quick bar", err);
    }

    if (this.hass.user?.is_admin && isComponentLoaded(this.hass, "hassio")) {
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

  private async _handleItemSelected(ev: CustomEvent<{ index: number }>) {
    if (this._comboBox && this._comboBox.virtualizerElement) {
      const index = ev.detail.index;
      const item = this._comboBox.virtualizerElement.items[
        index
      ] as PickerComboBoxItem;

      if (item && "stateObj" in item) {
        this.closeDialog();
        fireEvent(this, "hass-more-info", {
          entityId: item.search_labels!.entityId,
        });
        return;
      }

      if (item && item.id.startsWith(`device${SEPARATOR}`)) {
        this.closeDialog();
        navigate(`/config/devices/device/${item.id.split(SEPARATOR)[1]}`);
        return;
      }

      if (item && item.id.startsWith(`area${SEPARATOR}`)) {
        this.closeDialog();
        navigate(`/config/areas/area/${item.id.split(SEPARATOR)[1]}`);
        return;
      }

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

      if (item && "path" in item) {
        this.closeDialog();

        if (!item.path) {
          showShortcutsDialog(this);
          return;
        }

        navigate((item as NavigationComboBoxItem).path);
      }
    }
  }

  private _getRowSpinner = memoizeOne(() => {
    const spinner = document.createElement("ha-spinner");
    spinner.size = "small";
    spinner.style.marginRight = "16px";
    spinner.style.position = "absolute";
    spinner.style.right = "0";
    return spinner;
  });

  private _getEntitiesMemoized = memoizeOne((hass: HomeAssistant) =>
    getEntities(
      hass,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      `entity${SEPARATOR}`
    )
  );

  private _getDevicesMemoized = memoizeOne(
    (hass: HomeAssistant, configEntryLookup: Record<string, ConfigEntry>) =>
      getDevices(
        hass,
        configEntryLookup,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        `device${SEPARATOR}`
      )
  );

  private _getAreasMemoized = memoizeOne((hass: HomeAssistant) =>
    getAreas(
      hass.areas,
      hass.floors,
      hass.devices,
      hass.entities,
      hass.states,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      `area${SEPARATOR}`
    )
  );

  private _generateReloadCommands(): ActionCommandComboBoxItem[] {
    // Get all domains that have a direct "reload" service
    const reloadableDomains = componentsWithService(this.hass, "reload");

    const commands = reloadableDomains.map((domain) => ({
      primary:
        this.hass.localize(`ui.dialogs.quick-bar.commands.reload.${domain}`) ||
        this.hass.localize("ui.dialogs.quick-bar.commands.reload.reload", {
          domain: domainToName(this.hass.localize, domain),
        }),
      domain,
      action: "reload",
      icon_path: mdiReload,
      secondary: this.hass.localize(
        `ui.dialogs.quick-bar.commands.types.reload`
      ),
    }));

    // Add "frontend.reload_themes"
    commands.push({
      primary: this.hass.localize(
        "ui.dialogs.quick-bar.commands.reload.themes"
      ),
      domain: "frontend",
      action: "reload_themes",
      icon_path: mdiReload,
      secondary: this.hass.localize(
        "ui.dialogs.quick-bar.commands.types.reload"
      ),
    });

    // Add "homeassistant.reload_core_config"
    commands.push({
      primary: this.hass.localize("ui.dialogs.quick-bar.commands.reload.core"),
      domain: "homeassistant",
      action: "reload_core_config",
      icon_path: mdiReload,
      secondary: this.hass.localize(
        "ui.dialogs.quick-bar.commands.types.reload"
      ),
    });

    // Add "homeassistant.reload_all"
    commands.push({
      primary: this.hass.localize("ui.dialogs.quick-bar.commands.reload.all"),
      domain: "homeassistant",
      action: "reload_all",
      icon_path: mdiReload,
      secondary: this.hass.localize(
        "ui.dialogs.quick-bar.commands.types.reload"
      ),
    });

    return commands.map((command, index) => ({
      ...command,
      id: `command_${index}_${command.primary}`,
      sorting_label: `${command.primary}_${command.secondary}_${command.domain}`,
    }));
  }

  private _generateServerControlCommands(): ActionCommandComboBoxItem[] {
    const serverActions = ["restart", "stop"] as const;

    return serverActions.map((action, index) => {
      const primary = this.hass.localize(
        "ui.dialogs.quick-bar.commands.server_control.perform_action",
        {
          action: this.hass.localize(
            `ui.dialogs.quick-bar.commands.server_control.${action}`
          ),
        }
      );

      const secondary = this.hass.localize(
        "ui.dialogs.quick-bar.commands.types.server_control"
      );

      return {
        id: `server_control_${index}_${action}`,
        primary,
        domain: "homeassistant",
        icon_path: mdiServerNetwork,
        secondary,
        sorting_label: `${primary}_${secondary}_${action}`,
        action,
      };
    });
  }

  private _generateNavigationCommands(): NavigationComboBoxItem[] {
    const panelItems = this._generateNavigationPanelCommands();
    const sectionItems = this._generateNavigationConfigSectionCommands();
    const supervisorItems: BaseNavigationCommand[] = [];
    if (this.hass.user?.is_admin && isComponentLoaded(this.hass, "hassio")) {
      supervisorItems.push({
        path: "/hassio/store",
        icon_path: mdiStorePlus,
        primary: this.hass.localize(
          "ui.dialogs.quick-bar.commands.navigation.addon_store"
        ),
      });
      supervisorItems.push({
        path: "/hassio/dashboard",
        icon_path: mdiPuzzle,
        primary: this.hass.localize(
          "ui.dialogs.quick-bar.commands.navigation.addon_dashboard"
        ),
      });
      if (this._addons) {
        for (const addon of this._addons.filter((a) => a.version)) {
          supervisorItems.push({
            path: `/hassio/addon/${addon.slug}`,
            image: addon.icon
              ? `/api/hassio/addons/${addon.slug}/icon`
              : undefined,
            primary: this.hass.localize(
              "ui.dialogs.quick-bar.commands.navigation.addon_info",
              { addon: addon.name }
            ),
          });
        }
      }
    }

    const additionalItems = [
      {
        path: "",
        primary: this.hass.localize(
          "ui.dialogs.quick-bar.commands.navigation.shortcuts"
        ),
        icon_path: mdiKeyboard,
      },
    ];

    return this._finalizeNavigationCommands([
      ...panelItems,
      ...sectionItems,
      ...supervisorItems,
      ...additionalItems,
    ]);
  }

  private _generateNavigationPanelCommands(): BaseNavigationCommand[] {
    return Object.entries(this.hass.panels)
      .filter(
        ([panelKey]) => panelKey !== "_my_redirect" && panelKey !== "hassio"
      )
      .map(([_panelKey, panel]) => {
        const translationKey = getPanelNameTranslationKey(panel);
        const icon = getPanelIcon(panel) || "mdi:view-dashboard";

        const primary =
          this.hass.localize(translationKey) || panel.title || panel.url_path;

        let image: string | undefined;

        if (this._addons) {
          const addon = this._addons.find(
            ({ slug }) => slug === panel.url_path
          );
          if (addon) {
            image = addon.icon
              ? `/api/hassio/addons/${addon.slug}/icon`
              : undefined;
          }
        }

        return {
          primary,
          icon,
          image,
          path: `/${panel.url_path}`,
        };
      });
  }

  private _generateNavigationConfigSectionCommands(): BaseNavigationCommand[] {
    if (!this.hass.user?.is_admin) {
      return [];
    }

    const items: NavigationInfo[] = [];

    Object.values(configSections).forEach((sectionPages) => {
      sectionPages.forEach((page) => {
        if (!canShowPage(this.hass, page)) {
          return;
        }

        const info = this._getNavigationInfoFromConfig(page);

        if (!info) {
          return;
        }
        // Add to list, but only if we do not already have an entry for the same path and component
        if (items.some((e) => e.path === info.path)) {
          return;
        }

        items.push(info);
      });
    });

    return items;
  }

  private _getNavigationInfoFromConfig(
    page: PageNavigation
  ): NavigationInfo | undefined {
    const path = page.path.substring(1);

    let name = path.substring(path.indexOf("/") + 1);
    name = name.indexOf("/") > -1 ? name.substring(0, name.indexOf("/")) : name;

    const caption =
      (name &&
        this.hass.localize(
          `ui.dialogs.quick-bar.commands.navigation.${name}`
        )) ||
      // @ts-expect-error
      (page.translationKey && this.hass.localize(page.translationKey));

    if (caption) {
      return { ...page, primary: caption };
    }

    return undefined;
  }

  private _finalizeNavigationCommands(
    items: BaseNavigationCommand[]
  ): NavigationComboBoxItem[] {
    return items.map((item, index) => {
      const secondary = this.hass.localize(
        "ui.dialogs.quick-bar.commands.types.navigation"
      );
      return {
        id: `navigation_${index}_${item.path}`,
        icon_path: item.iconPath || mdiNavigationVariant,
        secondary,
        sorting_label: `${item.primary}_${secondary}`,
        ...item,
      };
    });
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

    const type =
      "action" in firstItem
        ? this.hass.localize("ui.dialogs.quick-bar.commands_title")
        : "path" in firstItem
          ? this.hass.localize("ui.dialogs.quick-bar.navigate_title")
          : "stateObj" in firstItem
            ? this.hass.localize("ui.components.target-picker.type.entities")
            : this.hass.localize("ui.components.target-picker.type.devices");

    return type;
  };

  private _sortBySortingLabel = (entityA, entityB) =>
    caseInsensitiveStringCompare(
      (entityA as PickerComboBoxItem).sorting_label!,
      (entityB as PickerComboBoxItem).sorting_label!,
      this.hass.locale.language
    );

  private _createFuseIndex = (states, keys: FuseWeightedKey[]) =>
    Fuse.createIndex(keys, states);

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
    searchTerm: string,
    weightedKeys: FuseWeightedKey[]
  ) {
    const fuseIndex = this._fuseIndexes[type](items);

    return multiTermSortedSearch(
      items,
      searchTerm,
      weightedKeys,
      (item: PickerComboBoxItem) => item.id,
      fuseIndex
    );
  }

  // be sure to reload ha-picker-combo-box when adaptive-dialog mode changes
  private _showTriggered = () => {
    this._opened = false;
  };

  private _dialogClosed = () => {
    this._selectedSection = undefined;
    this._opened = false;
    this._open = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  };

  private _dialogOpened = async () => {
    this._opened = true;
    requestAnimationFrame(() => {
      if (this.hass && isIosApp(this.hass)) {
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

  static styles = css`
    :host {
      --ha-dialog-min-height: 80vh;
      --ha-dialog-min-height: 80dvh;
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
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-quick-bar": QuickBar;
  }
}
