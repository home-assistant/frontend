import { mdiKeyboard, mdiReload, mdiServerNetwork } from "@mdi/js";
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
import "../../components/ha-button";
import "../../components/ha-icon-button";
import "../../components/ha-label";
import "../../components/ha-list";
import "../../components/ha-md-list-item";
import "../../components/ha-picker-combo-box";
import type {
  HaPickerComboBox,
  PickerComboBoxItem,
} from "../../components/ha-picker-combo-box";
import "../../components/ha-spinner";
import "../../components/ha-textfield";
import "../../components/ha-tip";
import { getConfigEntries, type ConfigEntry } from "../../data/config_entries";
import {
  deviceComboBoxKeys,
  getDevices,
} from "../../data/device/device_picker";
import {
  entityComboBoxKeys,
  getEntities,
  type EntityComboBoxItem,
} from "../../data/entity/entity_picker";
import {
  fetchHassioAddonsInfo,
  type HassioAddonsInfo,
} from "../../data/hassio/addon";
import { domainToName } from "../../data/integration";
import { getPanelNameTranslationKey } from "../../data/panel";
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
import type { QuickBarParams } from "./show-dialog-quick-bar";

// TODO icons are missing, we need a render function!

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
}

interface ActionCommandComboBoxItem extends PickerComboBoxItem {
  action: string;
  domain?: string;
}

interface BaseNavigationCommand {
  path: string;
  primary: string;
  icon_path?: string;
}

interface NavigationInfo extends PageNavigation {
  primary: string;
}

type QuickBarSection = "entity" | "device" | "command";

@customElement("ha-quick-bar")
export class QuickBar extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _open = false;

  @state() private _loading = true;

  @state() private _hint?: string;

  @state() private _mode?: QuickBarSection;

  @state() private _opened = false;

  @query("ha-picker-combo-box") private _comboBox?: HaPickerComboBox;

  private _configEntryLookup: Record<string, ConfigEntry> = {};

  private _hassioAddonsInfo?: HassioAddonsInfo;

  private _commandItems: (
    | ActionCommandComboBoxItem
    | NavigationComboBoxItem
  )[] = [];

  connectedCallback(): void {
    super.connectedCallback();
    this._initialize();
  }

  public async showDialog(params: QuickBarParams) {
    this._mode = params.mode;
    this._hint = params.hint;
    this._open = true;
  }

  public closeDialog() {
    this._open = false;
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

      if (!section || section === "device") {
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

      if (!section || section === "command") {
        let commandItems = this._commandItems;

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
    this._mode = section as QuickBarSection | undefined;
    return this._getItemsMemoized(
      this._configEntryLookup,
      searchString,
      this._mode
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
      {
        id: "device",
        label: this.hass.localize("ui.components.target-picker.type.devices"),
      },
      "separator" as const,
      {
        id: "command",
        label: this.hass.localize("ui.dialogs.quick-bar.commands_title"),
      },
    ];

    return html`
      <ha-adaptive-dialog
        .hass=${this.hass}
        aria-label=${this.hass.localize("ui.dialogs.quick-bar.title")}
        .open=${this._open}
        hideActions
        @wa-after-show=${this._dialogOpened}
        @closed=${this._dialogClosed}
      >
        <div slot="header"></div>
        ${!this._loading && this._opened
          ? html`<ha-picker-combo-box
              .hass=${this.hass}
              @value-changed=${this._handleItemSelected}
              .notFoundLabel=${this.hass.localize(
                "ui.dialogs.quick-bar.nothing_found"
              )}
              .getItems=${this._getItems}
              mode="dialog"
              .sections=${sections}
              .selectedSection=${this._mode}
              .sectionTitleFunction=${this._sectionTitleFunction}
            ></ha-picker-combo-box>`
          : nothing}
        ${this._hint
          ? html`<ha-tip .hass=${this.hass}>${this._hint}</ha-tip>`
          : nothing}
      </ha-adaptive-dialog>
    `;
  }

  private async _initialize() {
    // TODO error handling, config entry subscription, what about addon changes?
    const [configEntries] = (await Promise.all(
      [
        getConfigEntries(this.hass),
        this.hass.loadBackendTranslation("title"),
        isComponentLoaded(this.hass, "hassio")
          ? [fetchHassioAddonsInfo(this.hass)]
          : false,
      ].filter(Boolean)
    )) as [ConfigEntry[]];

    this._configEntryLookup = Object.fromEntries(
      configEntries.map((entry) => [entry.entry_id, entry])
    );

    this._commandItems = this._generateCommandItems().sort(
      this._sortBySortingLabel
    );
    this._loading = false;
  }

  // private async _processItemAndCloseDialog(item: QuickBarItem, index: number) {
  //   this._addSpinnerToCommandItem(index);

  //   await item.action();
  //   this.closeDialog();
  // }

  // private _getItemAtIndex(index: number): ListItem | null {
  //   return this.renderRoot.querySelector(`ha-md-list-item[index="${index}"]`);
  // }

  // private _addSpinnerToCommandItem(index: number): void {
  //   const div = document.createElement("div");
  //   div.slot = "meta";
  //   const spinner = document.createElement("ha-spinner");
  //   spinner.size = "small";
  //   div.appendChild(spinner);
  //   this._getItemAtIndex(index)?.appendChild(div);
  // }

  private async _handleItemSelected(ev: CustomEvent<{ value: string }>) {
    const id = ev.detail.value;

    const items = this._getItemsMemoized(
      this._configEntryLookup,
      "",
      this._mode
    );

    const item = items.find(
      (listItem) => typeof listItem !== "string" && listItem.id === id
    ) as PickerComboBoxItem | undefined;

    if (item && "stateObj" in item) {
      this.closeDialog();
      fireEvent(this, "hass-more-info", {
        entityId: item.search_labels!.entityId,
      });
      return;
    }

    if (item && "domain_name" in item) {
      this.closeDialog();
      navigate(`/config/devices/device/${item.id.split(SEPARATOR)[1]}`);
      return;
    }

    if (item && item.search_labels && "action" in item.search_labels) {
      if (item.search_labels.action?.startsWith("reload")) {
        // TODO show some kind of progress!
        this.hass.callService(item.search_labels.domain!, "reload");
        return;
      }

      const action = item.search_labels.action as "restart" | "stop";

      const confirmed = await showConfirmationDialog(this, {
        title: this.hass.localize(`ui.dialogs.restart.${action}.confirm_title`),
        text: this.hass.localize(
          `ui.dialogs.restart.${action}.confirm_description`
        ),
        confirmText: this.hass.localize(
          `ui.dialogs.restart.${action}.confirm_action`
        ),
        destructive: true,
      });
      if (!confirmed) {
        return;
      }
      this.hass.callService("homeassistant", action);
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

  private _generateCommandItems(): (
    | ActionCommandComboBoxItem
    | NavigationComboBoxItem
  )[] {
    return [
      ...this._generateReloadCommands(),
      ...this._generateServerControlCommands(),
      ...this._generateNavigationCommands(),
    ];
  }

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
    if (isComponentLoaded(this.hass, "hassio")) {
      supervisorItems.push({
        path: "/hassio/store",
        primary: this.hass.localize(
          "ui.dialogs.quick-bar.commands.navigation.addon_store"
        ),
      });
      supervisorItems.push({
        path: "/hassio/dashboard",
        primary: this.hass.localize(
          "ui.dialogs.quick-bar.commands.navigation.addon_dashboard"
        ),
      });
      if (this._hassioAddonsInfo) {
        for (const addon of this._hassioAddonsInfo.addons.filter(
          (a) => a.version
        )) {
          supervisorItems.push({
            path: `/hassio/addon/${addon.slug}`,
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
    return Object.keys(this.hass.panels)
      .filter(
        (panelKey) => panelKey !== "_my_redirect" && panelKey !== "hassio"
      )
      .map((panelKey) => {
        const panel = this.hass.panels[panelKey];
        const translationKey = getPanelNameTranslationKey(panel);

        const primary =
          this.hass.localize(translationKey) || panel.title || panel.url_path;

        return {
          primary,
          path: `/${panel.url_path}`,
        };
      });
  }

  private _generateNavigationConfigSectionCommands(): BaseNavigationCommand[] {
    const items: NavigationInfo[] = [];

    for (const sectionKey of Object.keys(configSections)) {
      for (const page of configSections[sectionKey]) {
        if (!canShowPage(this.hass, page)) {
          continue;
        }

        const info = this._getNavigationInfoFromConfig(page);

        if (!info) {
          continue;
        }
        // Add to list, but only if we do not already have an entry for the same path and component
        if (items.some((e) => e.path === info.path)) {
          continue;
        }

        items.push(info);
      }
    }

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
      "action" in firstItem || "path" in firstItem
        ? "command"
        : "stateObj" in firstItem
          ? "entity"
          : "device";

    return type;
  };

  private _sortBySortingLabel = (entityA, entityB) =>
    caseInsensitiveStringCompare(
      (entityA as PickerComboBoxItem).sorting_label!,
      (entityB as PickerComboBoxItem).sorting_label!,
      this.hass?.locale.language ?? navigator.language
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
    command: memoizeOne((states: PickerComboBoxItem[]) =>
      this._createFuseIndex(states, commandComboBoxKeys)
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

  private _dialogClosed = () => {
    this._mode = undefined;
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
      --dialog-content-padding: 0;
    }

    ha-list {
      position: relative;
      --mdc-list-vertical-padding: 0;
    }
    .heading {
      display: flex;
      align-items: center;
      --mdc-theme-primary: var(--primary-text-color);
    }

    .heading ha-textfield {
      flex-grow: 1;
    }

    ha-dialog {
      --dialog-z-index: 9;
      --dialog-content-padding: 0;
    }

    @media (min-width: 800px) {
      ha-dialog {
        --mdc-dialog-max-width: 800px;
        --mdc-dialog-min-width: 500px;
        --mdc-dialog-max-height: calc(
          100vh - var(--ha-space-18) - var(--safe-area-inset-y)
        );
      }
    }

    @media all and (max-width: 450px), all and (max-height: 500px) {
      ha-textfield {
        --mdc-shape-small: 0;
      }
    }

    @media all and (max-width: 450px), all and (max-height: 690px) {
      .hint {
        display: none;
      }
    }

    ha-svg-icon.prefix {
      color: var(--primary-text-color);
    }

    ha-textfield ha-icon-button {
      --mdc-icon-button-size: 24px;
      color: var(--primary-text-color);
    }

    .command-category {
      --ha-label-icon-color: #585858;
      --ha-label-text-color: #212121;
    }

    .command-category.reload {
      --ha-label-background-color: #cddc39;
    }

    .command-category.navigation {
      --ha-label-background-color: var(--light-primary-color);
    }

    .command-category.server_control {
      --ha-label-background-color: var(--warning-color);
    }

    span.command-text {
      margin-left: var(--ha-space-2);
      margin-inline-start: var(--ha-space-2);
      margin-inline-end: initial;
      direction: var(--direction);
    }

    ha-md-list-item {
      width: 100%;
    }

    /* Fixed height for items because we are use virtualizer */
    ha-md-list-item.two-line {
      --md-list-item-one-line-container-height: 64px;
      --md-list-item-two-line-container-height: 64px;
      --md-list-item-top-space: var(--ha-space-2);
      --md-list-item-bottom-space: var(--ha-space-2);
    }

    ha-md-list-item.three-line {
      width: 100%;
      --md-list-item-one-line-container-height: 72px;
      --md-list-item-two-line-container-height: 72px;
      --md-list-item-three-line-container-height: 72px;
      --md-list-item-top-space: var(--ha-space-2);
      --md-list-item-bottom-space: var(--ha-space-2);
    }

    ha-md-list-item .code {
      font-family: var(--ha-font-family-code);
      font-size: var(--ha-font-size-xs);
    }

    ha-md-list-item .domain {
      font-size: var(--ha-font-size-s);
      font-weight: var(--ha-font-weight-normal);
      line-height: var(--ha-line-height-normal);
      align-self: flex-end;
      max-width: 30%;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
    }

    ha-md-list-item img {
      width: 32px;
      height: 32px;
    }

    ha-tip {
      padding: var(--ha-space-5);
    }

    .nothing-found {
      padding: var(--ha-space-4) 0;
      text-align: center;
    }

    div[slot="trailingIcon"] {
      display: flex;
      align-items: center;
    }

    lit-virtualizer {
      contain: size layout !important;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-quick-bar": QuickBar;
  }
}
