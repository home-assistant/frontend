import type { ListItem } from "@material/mwc-list/mwc-list-item";
import {
  mdiClose,
  mdiConsoleLine,
  mdiDevices,
  mdiEarth,
  mdiKeyboard,
  mdiMagnify,
  mdiReload,
  mdiServerNetwork,
} from "@mdi/js";
import Fuse from "fuse.js";
import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { canShowPage } from "../../common/config/can_show_page";
import { componentsWithService } from "../../common/config/components_with_service";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { fireEvent } from "../../common/dom/fire_event";
import { computeAreaName } from "../../common/entity/compute_area_name";
import {
  computeDeviceName,
  computeDeviceNameDisplay,
} from "../../common/entity/compute_device_name";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeEntityName } from "../../common/entity/compute_entity_name";
import { computeStateName } from "../../common/entity/compute_state_name";
import { getDeviceContext } from "../../common/entity/context/get_device_context";
import { getEntityContext } from "../../common/entity/context/get_entity_context";
import { navigate } from "../../common/navigate";
import { caseInsensitiveStringCompare } from "../../common/string/compare";
import type { ScorableTextItem } from "../../common/string/filter/sequence-matching";
import { computeRTL } from "../../common/util/compute_rtl";
import { debounce } from "../../common/util/debounce";
import "../../components/ha-icon-button";
import "../../components/ha-label";
import "../../components/ha-button";
import "../../components/ha-list";
import "../../components/ha-md-list-item";
import "../../components/ha-spinner";
import "../../components/ha-textfield";
import "../../components/ha-tip";
import { getConfigEntries } from "../../data/config_entries";
import { fetchHassioAddonsInfo } from "../../data/hassio/addon";
import { domainToName } from "../../data/integration";
import { getPanelNameTranslationKey } from "../../data/panel";
import type { PageNavigation } from "../../layouts/hass-tabs-subpage";
import { configSections } from "../../panels/config/ha-panel-config";
import { HaFuse } from "../../resources/fuse";
import { haStyleDialog, haStyleScrollbar } from "../../resources/styles";
import { loadVirtualizer } from "../../resources/virtualizer";
import type { HomeAssistant } from "../../types";
import { brandsUrl } from "../../util/brands-url";
import { showConfirmationDialog } from "../generic/show-dialog-box";
import { showShortcutsDialog } from "../shortcuts/show-shortcuts-dialog";
import { QuickBarMode, type QuickBarParams } from "./show-dialog-quick-bar";

interface QuickBarItem extends ScorableTextItem {
  primaryText: string;
  iconPath?: string;
  action(data?: any): void;
}

interface CommandItem extends QuickBarItem {
  categoryKey: "reload" | "navigation" | "server_control";
  categoryText: string;
}

interface EntityItem extends QuickBarItem {
  altText: string;
  icon?: TemplateResult;
  translatedDomain: string;
  entityId: string;
  friendlyName: string;
}

interface DeviceItem extends QuickBarItem {
  deviceId: string;
  domain?: string;
  translatedDomain?: string;
  area?: string;
}

const isCommandItem = (item: QuickBarItem): item is CommandItem =>
  (item as CommandItem).categoryKey !== undefined;

const isDeviceItem = (item: QuickBarItem): item is DeviceItem =>
  (item as DeviceItem).deviceId !== undefined;

interface QuickBarNavigationItem extends CommandItem {
  path: string;
}

type NavigationInfo = PageNavigation & Pick<QuickBarItem, "primaryText">;

type BaseNavigationCommand = Pick<
  QuickBarNavigationItem,
  "primaryText" | "path"
>;

@customElement("ha-quick-bar")
export class QuickBar extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _commandItems?: CommandItem[];

  @state() private _entityItems?: EntityItem[];

  @state() private _deviceItems?: DeviceItem[];

  @state() private _filter = "";

  @state() private _search = "";

  @state() private _open = false;

  @state() private _opened = false;

  @state() private _narrow = false;

  @state() private _hint?: string;

  @state() private _mode = QuickBarMode.Entity;

  @query("ha-textfield", false) private _filterInputField?: HTMLElement;

  private _focusSet = false;

  private _focusListElement?: ListItem | null;

  public async showDialog(params: QuickBarParams) {
    this._mode = params.mode || QuickBarMode.Entity;
    this._hint = params.hint;
    this._narrow = matchMedia(
      "all and (max-width: 450px), all and (max-height: 500px)"
    ).matches;
    this._initializeItemsIfNeeded();
    this._open = true;
  }

  public closeDialog() {
    this._open = false;
    this._opened = false;
    this._focusSet = false;
    this._filter = "";
    this._search = "";
    this._entityItems = undefined;
    this._commandItems = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected willUpdate() {
    if (!this.hasUpdated) {
      loadVirtualizer();
    }
  }

  private _getItems = memoizeOne(
    (
      mode: QuickBarMode,
      commandItems,
      entityItems,
      deviceItems,
      filter: string
    ) => {
      let items = entityItems;

      if (mode === QuickBarMode.Command) {
        items = commandItems;
      } else if (mode === QuickBarMode.Device) {
        items = deviceItems;
      }

      if (items && filter && filter !== " ") {
        return this._filterItems(items, filter);
      }
      return items;
    }
  );

  protected render() {
    if (!this._open) {
      return nothing;
    }

    const items: QuickBarItem[] | undefined = this._getItems(
      this._mode,
      this._commandItems,
      this._entityItems,
      this._deviceItems,
      this._filter
    );

    const translationKey =
      this._mode === QuickBarMode.Device
        ? "filter_placeholder_devices"
        : "filter_placeholder";
    const placeholder = this.hass.localize(
      `ui.dialogs.quick-bar.${translationKey}`
    );

    const commandMode = this._mode === QuickBarMode.Command;
    const deviceMode = this._mode === QuickBarMode.Device;
    const icon = commandMode
      ? mdiConsoleLine
      : deviceMode
        ? mdiDevices
        : mdiMagnify;
    const searchPrefix = commandMode ? ">" : deviceMode ? "#" : "";

    return html`
      <ha-dialog
        .heading=${this.hass.localize("ui.dialogs.quick-bar.title")}
        open
        @opened=${this._handleOpened}
        @closed=${this.closeDialog}
        hideActions
      >
        <div slot="heading" class="heading">
          <ha-textfield
            dialogInitialFocus
            .placeholder=${placeholder}
            aria-label=${placeholder}
            .value="${searchPrefix}${this._search}"
            icon
            .iconTrailing=${this._search !== undefined || this._narrow}
            @input=${this._handleSearchChange}
            @keydown=${this._handleInputKeyDown}
            @focus=${this._setFocusFirstListItem}
          >
            <ha-svg-icon
              slot="leadingIcon"
              class="prefix"
              .path=${icon}
            ></ha-svg-icon>
            ${this._search || this._narrow
              ? html`
                  <div slot="trailingIcon">
                    ${this._search &&
                    html`<ha-icon-button
                      @click=${this._clearSearch}
                      .label=${this.hass!.localize("ui.common.clear")}
                      .path=${mdiClose}
                    ></ha-icon-button>`}
                    ${this._narrow
                      ? html`
                          <ha-button
                            appearance="plain"
                            size="small"
                            @click=${this.closeDialog}
                          >
                            ${this.hass!.localize("ui.common.close")}
                          </ha-button>
                        `
                      : ""}
                  </div>
                `
              : ""}
          </ha-textfield>
        </div>
        ${!items
          ? html`<ha-spinner size="small"></ha-spinner>`
          : items.length === 0
            ? html`
                <div class="nothing-found">
                  ${this.hass.localize("ui.dialogs.quick-bar.nothing_found")}
                </div>
              `
            : html`
                <ha-list>
                  ${this._opened
                    ? html`<lit-virtualizer
                        tabindex="-1"
                        scroller
                        @keydown=${this._handleListItemKeyDown}
                        @rangechange=${this._handleRangeChanged}
                        @click=${this._handleItemClick}
                        class="ha-scrollbar"
                        style=${styleMap({
                          height: this._narrow
                            ? "calc(100vh - 56px - var(--safe-area-inset-top, 0px) - var(--safe-area-inset-bottom, 0px))"
                            : `calc(${Math.min(
                                items.length * (commandMode ? 56 : 72) + 26,
                                500
                              )}px - var(--safe-area-inset-top, 0px) - var(--safe-area-inset-bottom, 0px))`,
                        })}
                        .items=${items}
                        .renderItem=${this._renderItem}
                      >
                      </lit-virtualizer>`
                    : ""}
                </ha-list>
              `}
        ${this._hint
          ? html`<ha-tip .hass=${this.hass}>${this._hint}</ha-tip>`
          : ""}
      </ha-dialog>
    `;
  }

  private async _initializeItemsIfNeeded() {
    if (this._mode === QuickBarMode.Command) {
      this._commandItems =
        this._commandItems || (await this._generateCommandItems());
    } else if (this._mode === QuickBarMode.Device) {
      this._deviceItems =
        this._deviceItems || (await this._generateDeviceItems());
    } else {
      this._entityItems =
        this._entityItems || (await this._generateEntityItems());
    }
  }

  private _handleOpened() {
    this._opened = true;
  }

  private async _handleRangeChanged(e) {
    if (this._focusSet) {
      return;
    }
    if (e.firstVisible > -1) {
      this._focusSet = true;
      await this.updateComplete;
      this._setFocusFirstListItem();
    }
  }

  private _renderItem = (item: QuickBarItem, index: number) => {
    if (!item) {
      return nothing;
    }

    if (isDeviceItem(item)) {
      return this._renderDeviceItem(item, index);
    }

    if (isCommandItem(item)) {
      return this._renderCommandItem(item, index);
    }

    return this._renderEntityItem(item as EntityItem, index);
  };

  private _renderDeviceItem(item: DeviceItem, index?: number) {
    return html`
      <ha-md-list-item
        class="two-line"
        .item=${item}
        index=${ifDefined(index)}
        tabindex="0"
        type="button"
      >
        ${item.domain
          ? html`<img
              slot="start"
              alt=""
              crossorigin="anonymous"
              referrerpolicy="no-referrer"
              src=${brandsUrl({
                domain: item.domain,
                type: "icon",
                darkOptimized: this.hass.themes?.darkMode,
              })}
            />`
          : nothing}
        <span slot="headline">${item.primaryText}</span>
        ${item.area
          ? html` <span slot="supporting-text">${item.area}</span> `
          : nothing}
        ${item.translatedDomain
          ? html`<div slot="trailing-supporting-text" class="domain">
              ${item.translatedDomain}
            </div>`
          : nothing}
      </ha-md-list-item>
    `;
  }

  private _renderEntityItem(item: EntityItem, index?: number) {
    const showEntityId = this.hass.userData?.showEntityIdPicker;

    return html`
      <ha-md-list-item
        class=${showEntityId ? "three-line" : "two-line"}
        .item=${item}
        index=${ifDefined(index)}
        tabindex="0"
        type="button"
      >
        ${item.iconPath
          ? html`
              <ha-svg-icon
                .path=${item.iconPath}
                class="entity"
                slot="start"
              ></ha-svg-icon>
            `
          : html`<span slot="start">${item.icon}</span>`}
        <span slot="headline">${item.primaryText}</span>
        ${item.altText
          ? html` <span slot="supporting-text">${item.altText}</span> `
          : nothing}
        ${item.entityId && showEntityId
          ? html`
              <span slot="supporting-text" class="code">${item.entityId}</span>
            `
          : nothing}
        ${item.translatedDomain && !showEntityId
          ? html`<div slot="trailing-supporting-text" class="domain">
              ${item.translatedDomain}
            </div>`
          : nothing}
      </ha-md-list-item>
    `;
  }

  private _renderCommandItem(item: CommandItem, index?: number) {
    return html`
      <ha-md-list-item
        .item=${item}
        index=${ifDefined(index)}
        hasMeta
        tabindex="0"
        type="button"
      >
        <span>
          <ha-label
            .label=${item.categoryText}
            class="command-category ${item.categoryKey}"
          >
            ${item.iconPath
              ? html`
                  <ha-svg-icon
                    .path=${item.iconPath}
                    slot="start"
                  ></ha-svg-icon>
                `
              : nothing}
            ${item.categoryText}
          </ha-label>
        </span>

        <span class="command-text">${item.primaryText}</span>
      </ha-md-list-item>
    `;
  }

  private async _processItemAndCloseDialog(item: QuickBarItem, index: number) {
    this._addSpinnerToCommandItem(index);

    await item.action();
    this.closeDialog();
  }

  private _handleInputKeyDown(ev: KeyboardEvent) {
    if (ev.code === "Enter") {
      const firstItem = this._getItemAtIndex(0);
      if (!firstItem || firstItem.style.display === "none") {
        return;
      }
      this._processItemAndCloseDialog((firstItem as any).item, 0);
    } else if (ev.code === "ArrowDown") {
      ev.preventDefault();
      this._getItemAtIndex(0)?.focus();
      this._focusSet = true;
      this._focusListElement = this._getItemAtIndex(0);
    }
  }

  private _getItemAtIndex(index: number): ListItem | null {
    return this.renderRoot.querySelector(`ha-md-list-item[index="${index}"]`);
  }

  private _addSpinnerToCommandItem(index: number): void {
    const div = document.createElement("div");
    div.slot = "meta";
    const spinner = document.createElement("ha-spinner");
    spinner.size = "small";
    div.appendChild(spinner);
    this._getItemAtIndex(index)?.appendChild(div);
  }

  private _handleSearchChange(ev: CustomEvent): void {
    const newFilter = (ev.currentTarget as any).value;
    const oldMode = this._mode;
    const oldSearch = this._search;
    let newMode: QuickBarMode;
    let newSearch: string;

    if (newFilter.startsWith(">")) {
      newMode = QuickBarMode.Command;
      newSearch = newFilter.substring(1);
    } else if (newFilter.startsWith("#")) {
      newMode = QuickBarMode.Device;
      newSearch = newFilter.substring(1);
    } else {
      newMode = QuickBarMode.Entity;
      newSearch = newFilter;
    }

    if (oldMode === newMode && oldSearch === newSearch) {
      return;
    }

    this._mode = newMode;
    this._search = newSearch;

    if (this._hint) {
      this._hint = undefined;
    }

    if (oldMode !== this._mode) {
      this._focusSet = false;
      this._initializeItemsIfNeeded();
      this._filter = this._search;
    } else {
      if (this._focusSet && this._focusListElement) {
        this._focusSet = false;
        // @ts-ignore
        this._focusListElement.rippleHandlers.endFocus();
      }
      this._debouncedSetFilter(this._search);
    }
  }

  private _clearSearch() {
    this._search = "";
    this._filter = "";
  }

  private _debouncedSetFilter = debounce((filter: string) => {
    this._filter = filter;
  }, 100);

  private _setFocusFirstListItem() {
    // @ts-ignore
    this._getItemAtIndex(0)?.rippleHandlers.startFocus();
    this._focusListElement = this._getItemAtIndex(0);
  }

  private _handleListItemKeyDown(ev: KeyboardEvent) {
    const isSingleCharacter = ev.key.length === 1;
    const index = (ev.target as HTMLElement).getAttribute("index");
    const isFirstListItem = index === "0";
    this._focusListElement = ev.target as ListItem;
    if (ev.key === "ArrowDown") {
      this._getItemAtIndex(Number(index) + 1)?.focus();
    }
    if (ev.key === "ArrowUp") {
      if (isFirstListItem) {
        this._filterInputField?.focus();
      } else {
        this._getItemAtIndex(Number(index) - 1)?.focus();
      }
    }
    if (ev.key === "Enter" || ev.key === " ") {
      this._processItemAndCloseDialog(
        (ev.target as any).item,
        Number((ev.target as HTMLElement).getAttribute("index"))
      );
    }
    if (ev.key === "Backspace" || isSingleCharacter) {
      (ev.currentTarget as HTMLElement).scrollTop = 0;
      this._filterInputField?.focus();
    }
  }

  private _handleItemClick(ev) {
    const listItem = ev.target.closest("ha-md-list-item");
    this._processItemAndCloseDialog(
      listItem.item,
      Number(listItem.getAttribute("index"))
    );
  }

  private async _generateDeviceItems(): Promise<DeviceItem[]> {
    const configEntries = await getConfigEntries(this.hass);
    const configEntryLookup = Object.fromEntries(
      configEntries.map((entry) => [entry.entry_id, entry])
    );

    return Object.values(this.hass.devices)
      .filter((device) => !device.disabled_by)
      .map((device) => {
        const deviceName = computeDeviceNameDisplay(device, this.hass);

        const { area } = getDeviceContext(device, this.hass);

        const areaName = area ? computeAreaName(area) : undefined;

        const deviceItem = {
          primaryText: deviceName,
          deviceId: device.id,
          area: areaName,
          action: () => navigate(`/config/devices/device/${device.id}`),
        };

        const configEntry = device.primary_config_entry
          ? configEntryLookup[device.primary_config_entry]
          : undefined;

        const domain = configEntry?.domain;
        const translatedDomain = domain
          ? domainToName(this.hass.localize, domain)
          : undefined;

        return {
          ...deviceItem,
          domain,
          translatedDomain,
          strings: [deviceName, areaName, domain, domainToName].filter(
            Boolean
          ) as string[],
        };
      })
      .sort((a, b) =>
        caseInsensitiveStringCompare(
          a.primaryText,
          b.primaryText,
          this.hass.locale.language
        )
      );
  }

  private async _generateEntityItems(): Promise<EntityItem[]> {
    const isRTL = computeRTL(this.hass);

    await this.hass.loadBackendTranslation("title");

    return Object.keys(this.hass.states)
      .map((entityId) => {
        const stateObj = this.hass.states[entityId];

        const { area, device } = getEntityContext(
          stateObj,
          this.hass.entities,
          this.hass.devices,
          this.hass.areas,
          this.hass.floors
        );

        const friendlyName = computeStateName(stateObj); // Keep this for search
        const entityName = computeEntityName(
          stateObj,
          this.hass.entities,
          this.hass.devices
        );
        const deviceName = device ? computeDeviceName(device) : undefined;
        const areaName = area ? computeAreaName(area) : undefined;

        const primary = entityName || deviceName || entityId;
        const secondary = [areaName, entityName ? deviceName : undefined]
          .filter(Boolean)
          .join(isRTL ? " ◂ " : " ▸ ");

        const translatedDomain = domainToName(
          this.hass.localize,
          computeDomain(entityId)
        );

        const entityItem = {
          primaryText: primary,
          altText: secondary,
          icon: html`
            <ha-state-icon
              .hass=${this.hass}
              .stateObj=${stateObj}
            ></ha-state-icon>
          `,
          translatedDomain: translatedDomain,
          entityId: entityId,
          friendlyName: friendlyName,
          action: () => fireEvent(this, "hass-more-info", { entityId }),
        };

        return {
          ...entityItem,
          strings: [entityItem.primaryText, entityItem.altText],
        };
      })
      .sort((a, b) =>
        caseInsensitiveStringCompare(
          a.primaryText,
          b.primaryText,
          this.hass.locale.language
        )
      );
  }

  private async _generateCommandItems(): Promise<CommandItem[]> {
    return [
      ...(await this._generateReloadCommands()),
      ...this._generateServerControlCommands(),
      ...(await this._generateNavigationCommands()),
    ].sort((a, b) =>
      caseInsensitiveStringCompare(
        a.strings.join(" "),
        b.strings.join(" "),
        this.hass.locale.language
      )
    );
  }

  private async _generateReloadCommands(): Promise<CommandItem[]> {
    // Get all domains that have a direct "reload" service
    const reloadableDomains = componentsWithService(this.hass, "reload");

    const localize = await this.hass.loadBackendTranslation(
      "title",
      reloadableDomains
    );

    const commands = reloadableDomains.map((domain) => ({
      primaryText:
        this.hass.localize(`ui.dialogs.quick-bar.commands.reload.${domain}`) ||
        this.hass.localize("ui.dialogs.quick-bar.commands.reload.reload", {
          domain: domainToName(localize, domain),
        }),
      action: () => this.hass.callService(domain, "reload"),
      iconPath: mdiReload,
      categoryText: this.hass.localize(
        `ui.dialogs.quick-bar.commands.types.reload`
      ),
    }));

    // Add "frontend.reload_themes"
    commands.push({
      primaryText: this.hass.localize(
        "ui.dialogs.quick-bar.commands.reload.themes"
      ),
      action: () => this.hass.callService("frontend", "reload_themes"),
      iconPath: mdiReload,
      categoryText: this.hass.localize(
        "ui.dialogs.quick-bar.commands.types.reload"
      ),
    });

    // Add "homeassistant.reload_core_config"
    commands.push({
      primaryText: this.hass.localize(
        "ui.dialogs.quick-bar.commands.reload.core"
      ),
      action: () =>
        this.hass.callService("homeassistant", "reload_core_config"),
      iconPath: mdiReload,
      categoryText: this.hass.localize(
        "ui.dialogs.quick-bar.commands.types.reload"
      ),
    });

    // Add "homeassistant.reload_all"
    commands.push({
      primaryText: this.hass.localize(
        "ui.dialogs.quick-bar.commands.reload.all"
      ),
      action: () => this.hass.callService("homeassistant", "reload_all"),
      iconPath: mdiReload,
      categoryText: this.hass.localize(
        "ui.dialogs.quick-bar.commands.types.reload"
      ),
    });

    return commands.map((command) => ({
      ...command,
      categoryKey: "reload",
      strings: [`${command.categoryText} ${command.primaryText}`],
    }));
  }

  private _generateServerControlCommands(): CommandItem[] {
    const serverActions = ["restart", "stop"] as const;

    return serverActions.map((action) => {
      const categoryKey: CommandItem["categoryKey"] = "server_control";

      const item = {
        primaryText: this.hass.localize(
          "ui.dialogs.quick-bar.commands.server_control.perform_action",
          {
            action: this.hass.localize(
              `ui.dialogs.quick-bar.commands.server_control.${action}`
            ),
          }
        ),
        iconPath: mdiServerNetwork,
        categoryText: this.hass.localize(
          `ui.dialogs.quick-bar.commands.types.${categoryKey}`
        ),
        categoryKey,
        action: async () => {
          const confirmed = await showConfirmationDialog(this, {
            title: this.hass.localize(
              `ui.dialogs.restart.${action}.confirm_title`
            ),
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
        },
      };

      return {
        ...item,
        strings: [`${item.categoryText} ${item.primaryText}`],
      };
    });
  }

  private async _generateNavigationCommands(): Promise<CommandItem[]> {
    const panelItems = this._generateNavigationPanelCommands();
    const sectionItems = this._generateNavigationConfigSectionCommands();
    const supervisorItems: BaseNavigationCommand[] = [];
    if (isComponentLoaded(this.hass, "hassio")) {
      const addonsInfo = await fetchHassioAddonsInfo(this.hass);
      supervisorItems.push({
        path: "/hassio/store",
        primaryText: this.hass.localize(
          "ui.dialogs.quick-bar.commands.navigation.addon_store"
        ),
      });
      supervisorItems.push({
        path: "/hassio/dashboard",
        primaryText: this.hass.localize(
          "ui.dialogs.quick-bar.commands.navigation.addon_dashboard"
        ),
      });
      for (const addon of addonsInfo.addons.filter((a) => a.version)) {
        supervisorItems.push({
          path: `/hassio/addon/${addon.slug}`,
          primaryText: this.hass.localize(
            "ui.dialogs.quick-bar.commands.navigation.addon_info",
            { addon: addon.name }
          ),
        });
      }
    }

    const additionalItems = [
      {
        path: "",
        primaryText: this.hass.localize(
          "ui.dialogs.quick-bar.commands.navigation.shortcuts"
        ),
        action: () => showShortcutsDialog(this),
        iconPath: mdiKeyboard,
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

        const primaryText =
          this.hass.localize(translationKey) || panel.title || panel.url_path;

        return {
          primaryText,
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
      return { ...page, primaryText: caption };
    }

    return undefined;
  }

  private _finalizeNavigationCommands(
    items: BaseNavigationCommand[]
  ): CommandItem[] {
    return items.map((item) => {
      const categoryKey: CommandItem["categoryKey"] = "navigation";

      const navItem = {
        iconPath: mdiEarth,
        categoryText: this.hass.localize(
          `ui.dialogs.quick-bar.commands.types.${categoryKey}`
        ),
        action: () => navigate(item.path),
        ...item,
      };

      return {
        ...navItem,
        strings: [`${navItem.categoryText} ${navItem.primaryText}`],
        categoryKey,
      };
    });
  }

  private _fuseIndex = memoizeOne((items: QuickBarItem[]) =>
    Fuse.createIndex(
      [
        "primaryText",
        "altText",
        "friendlyName",
        "translatedDomain",
        "entityId", // for technical search
      ],
      items
    )
  );

  private _filterItems = memoizeOne(
    (items: QuickBarItem[], filter: string): QuickBarItem[] => {
      const index = this._fuseIndex(items);
      const fuse = new HaFuse(items, {}, index);

      const results = fuse.multiTermsSearch(filter.trim());
      if (!results || !results.length) {
        return items;
      }
      return results.map((result) => result.item);
    }
  );

  static get styles() {
    return [
      haStyleScrollbar,
      haStyleDialog,
      css`
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
            --dialog-surface-position: fixed;
            --dialog-surface-top: 40px;
            --mdc-dialog-max-height: calc(100% - 72px);
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
          margin-left: 8px;
          margin-inline-start: 8px;
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
          --md-list-item-top-space: 8px;
          --md-list-item-bottom-space: 8px;
        }

        ha-md-list-item.three-line {
          width: 100%;
          --md-list-item-one-line-container-height: 72px;
          --md-list-item-two-line-container-height: 72px;
          --md-list-item-three-line-container-height: 72px;
          --md-list-item-top-space: 8px;
          --md-list-item-bottom-space: 8px;
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
          padding: 20px;
        }

        .nothing-found {
          padding: 16px 0px;
          text-align: center;
        }

        div[slot="trailingIcon"] {
          display: flex;
          align-items: center;
        }

        lit-virtualizer {
          contain: size layout !important;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-quick-bar": QuickBar;
  }
}
