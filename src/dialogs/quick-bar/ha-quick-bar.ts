import "@material/mwc-list/mwc-list";
import type { ListItem } from "@material/mwc-list/mwc-list-item";
import {
  mdiClose,
  mdiConsoleLine,
  mdiEarth,
  mdiMagnify,
  mdiReload,
  mdiServerNetwork,
} from "@mdi/js";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { canShowPage } from "../../common/config/can_show_page";
import { componentsWithService } from "../../common/config/components_with_service";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeStateName } from "../../common/entity/compute_state_name";
import { domainIcon } from "../../common/entity/domain_icon";
import { navigate } from "../../common/navigate";
import { caseInsensitiveStringCompare } from "../../common/string/compare";
import {
  ScorableTextItem,
  fuzzyFilterSort,
} from "../../common/string/filter/sequence-matching";
import { debounce } from "../../common/util/debounce";
import "../../components/ha-chip";
import "../../components/ha-circular-progress";
import "../../components/ha-icon-button";
import "../../components/ha-list-item";
import "../../components/ha-textfield";
import { fetchHassioAddonsInfo } from "../../data/hassio/addon";
import { domainToName } from "../../data/integration";
import { getPanelNameTranslationKey } from "../../data/panel";
import { PageNavigation } from "../../layouts/hass-tabs-subpage";
import { configSections } from "../../panels/config/ha-panel-config";
import { haStyleDialog, haStyleScrollbar } from "../../resources/styles";
import { loadVirtualizer } from "../../resources/virtualizer";
import { HomeAssistant } from "../../types";
import { showConfirmationDialog } from "../generic/show-dialog-box";
import { QuickBarParams } from "./show-dialog-quick-bar";

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
  icon?: string;
}

const isCommandItem = (item: QuickBarItem): item is CommandItem =>
  (item as CommandItem).categoryKey !== undefined;

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

  @state() private _filter = "";

  @state() private _search = "";

  @state() private _open = false;

  @state() private _commandMode = false;

  @state() private _opened = false;

  @state() private _narrow = false;

  @state() private _hint?: string;

  @query("ha-textfield", false) private _filterInputField?: HTMLElement;

  private _focusSet = false;

  private _focusListElement?: ListItem | null;

  public async showDialog(params: QuickBarParams) {
    this._commandMode = params.commandMode || this._toggleIfAlreadyOpened();
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
    (commandMode: boolean, commandItems, entityItems, filter: string) => {
      const items = commandMode ? commandItems : entityItems;

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
      this._commandMode,
      this._commandItems,
      this._entityItems,
      this._filter
    );

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
            .placeholder=${this.hass.localize(
              "ui.dialogs.quick-bar.filter_placeholder"
            )}
            aria-label=${this.hass.localize(
              "ui.dialogs.quick-bar.filter_placeholder"
            )}
            .value=${this._commandMode ? `>${this._search}` : this._search}
            icon
            .iconTrailing=${this._search !== undefined || this._narrow}
            @input=${this._handleSearchChange}
            @keydown=${this._handleInputKeyDown}
            @focus=${this._setFocusFirstListItem}
          >
            ${this._commandMode
              ? html`
                  <ha-svg-icon
                    slot="leadingIcon"
                    class="prefix"
                    .path=${mdiConsoleLine}
                  ></ha-svg-icon>
                `
              : html`
                  <ha-svg-icon
                    slot="leadingIcon"
                    class="prefix"
                    .path=${mdiMagnify}
                  ></ha-svg-icon>
                `}
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
                          <mwc-button
                            .label=${this.hass!.localize("ui.common.close")}
                            @click=${this.closeDialog}
                          ></mwc-button>
                        `
                      : ""}
                  </div>
                `
              : ""}
          </ha-textfield>
        </div>
        ${!items
          ? html`<ha-circular-progress
              size="small"
              active
            ></ha-circular-progress>`
          : items.length === 0
          ? html`
              <div class="nothing-found">
                ${this.hass.localize("ui.dialogs.quick-bar.nothing_found")}
              </div>
            `
          : html`
              <mwc-list>
                ${this._opened
                  ? html`<lit-virtualizer
                      scroller
                      @keydown=${this._handleListItemKeyDown}
                      @rangechange=${this._handleRangeChanged}
                      @click=${this._handleItemClick}
                      class="ha-scrollbar"
                      style=${styleMap({
                        height: this._narrow
                          ? "calc(100vh - 56px)"
                          : `${Math.min(
                              items.length * (this._commandMode ? 56 : 72) + 26,
                              500
                            )}px`,
                      })}
                      .items=${items}
                      .renderItem=${this._renderItem}
                    >
                    </lit-virtualizer>`
                  : ""}
              </mwc-list>
            `}
        ${this._hint
          ? html`<ha-tip .hass=${this.hass}>${this._hint}</ha-tip>`
          : ""}
      </ha-dialog>
    `;
  }

  private async _initializeItemsIfNeeded() {
    if (this._commandMode) {
      this._commandItems =
        this._commandItems || (await this._generateCommandItems());
    } else {
      this._entityItems = this._entityItems || this._generateEntityItems();
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
    return isCommandItem(item)
      ? this._renderCommandItem(item, index)
      : this._renderEntityItem(item as EntityItem, index);
  };

  private _renderEntityItem(item: EntityItem, index?: number) {
    return html`
      <ha-list-item
        .twoline=${Boolean(item.altText)}
        .item=${item}
        index=${ifDefined(index)}
        graphic="icon"
      >
        ${item.iconPath
          ? html`<ha-svg-icon
              .path=${item.iconPath}
              class="entity"
              slot="graphic"
            ></ha-svg-icon>`
          : html`<ha-icon
              .icon=${item.icon}
              class="entity"
              slot="graphic"
            ></ha-icon>`}
        <span>${item.primaryText}</span>
        ${item.altText
          ? html`
              <span slot="secondary" class="item-text secondary"
                >${item.altText}</span
              >
            `
          : nothing}
      </ha-list-item>
    `;
  }

  private _renderCommandItem(item: CommandItem, index?: number) {
    return html`
      <ha-list-item
        .item=${item}
        index=${ifDefined(index)}
        class="command-item"
        hasMeta
      >
        <span>
          <ha-chip
            .label=${item.categoryText}
            hasIcon
            class="command-category ${item.categoryKey}"
          >
            ${item.iconPath
              ? html`<ha-svg-icon
                  .path=${item.iconPath}
                  slot="icon"
                ></ha-svg-icon>`
              : ""}
            ${item.categoryText}</ha-chip
          >
        </span>

        <span class="command-text">${item.primaryText}</span>
      </ha-list-item>
    `;
  }

  private async processItemAndCloseDialog(item: QuickBarItem, index: number) {
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
      this.processItemAndCloseDialog((firstItem as any).item, 0);
    } else if (ev.code === "ArrowDown") {
      ev.preventDefault();
      this._getItemAtIndex(0)?.focus();
      this._focusSet = true;
      this._focusListElement = this._getItemAtIndex(0);
    }
  }

  private _getItemAtIndex(index: number): ListItem | null {
    return this.renderRoot.querySelector(`ha-list-item[index="${index}"]`);
  }

  private _addSpinnerToCommandItem(index: number): void {
    const spinner = document.createElement("ha-circular-progress");
    spinner.size = "small";
    spinner.slot = "meta";
    spinner.active = true;
    this._getItemAtIndex(index)?.appendChild(spinner);
  }

  private _handleSearchChange(ev: CustomEvent): void {
    const newFilter = (ev.currentTarget as any).value;
    const oldCommandMode = this._commandMode;
    const oldSearch = this._search;
    let newCommandMode: boolean;
    let newSearch: string;

    if (newFilter.startsWith(">")) {
      newCommandMode = true;
      newSearch = newFilter.substring(1);
    } else {
      newCommandMode = false;
      newSearch = newFilter;
    }

    if (oldCommandMode === newCommandMode && oldSearch === newSearch) {
      return;
    }

    this._commandMode = newCommandMode;
    this._search = newSearch;

    if (this._hint) {
      this._hint = undefined;
    }

    if (oldCommandMode !== this._commandMode) {
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
      this.processItemAndCloseDialog(
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
    const listItem = ev.target.closest("ha-list-item");
    this.processItemAndCloseDialog(
      listItem.item,
      Number(listItem.getAttribute("index"))
    );
  }

  private _generateEntityItems(): EntityItem[] {
    return Object.keys(this.hass.states)
      .map((entityId) => {
        const entityState = this.hass.states[entityId];
        const entityItem = {
          primaryText: computeStateName(entityState),
          altText: entityId,
          icon: entityState.attributes.icon,
          iconPath: entityState.attributes.icon
            ? undefined
            : domainIcon(computeDomain(entityId), entityState),
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
        this.hass.localize(
          "ui.dialogs.quick-bar.commands.reload.reload",
          "domain",
          domainToName(localize, domain)
        ),
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
          "action",
          this.hass.localize(
            `ui.dialogs.quick-bar.commands.server_control.${action}`
          )
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

    return this._finalizeNavigationCommands([
      ...panelItems,
      ...sectionItems,
      ...supervisorItems,
    ]);
  }

  private _generateNavigationPanelCommands(): BaseNavigationCommand[] {
    return Object.keys(this.hass.panels)
      .filter((panelKey) => panelKey !== "_my_redirect")
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
        ...item,
        iconPath: mdiEarth,
        categoryText: this.hass.localize(
          `ui.dialogs.quick-bar.commands.types.${categoryKey}`
        ),
        action: () => navigate(item.path),
      };

      return {
        ...navItem,
        strings: [`${navItem.categoryText} ${navItem.primaryText}`],
        categoryKey,
      };
    });
  }

  private _toggleIfAlreadyOpened() {
    return this._opened ? !this._commandMode : false;
  }

  private _filterItems = memoizeOne(
    (items: QuickBarItem[], filter: string): QuickBarItem[] =>
      fuzzyFilterSort<QuickBarItem>(filter.trimLeft(), items)
  );

  static get styles() {
    return [
      haStyleScrollbar,
      haStyleDialog,
      css`
        mwc-list {
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
          --ha-chip-icon-color: #585858;
          --ha-chip-text-color: #212121;
        }

        .command-category.reload {
          --ha-chip-background-color: #cddc39;
        }

        .command-category.navigation {
          --ha-chip-background-color: var(--light-primary-color);
        }

        .command-category.server_control {
          --ha-chip-background-color: var(--warning-color);
        }

        span.command-text {
          margin-left: 8px;
          margin-inline-start: 8px;
          margin-inline-end: initial;
          direction: var(--direction);
        }

        ha-list-item {
          width: 100%;
          --mdc-list-item-graphic-margin: 20px;
        }

        ha-list-item.command-item {
          text-transform: capitalize;
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
