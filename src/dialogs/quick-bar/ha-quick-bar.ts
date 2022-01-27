import "../../components/ha-textfield";
import { Layout1d, scroll } from "@lit-labs/virtualizer";
import "@material/mwc-list/mwc-list";
import type { List } from "@material/mwc-list/mwc-list";
import { SingleSelectedEvent } from "@material/mwc-list/mwc-list-foundation";
import "@material/mwc-list/mwc-list-item";
import type { ListItem } from "@material/mwc-list/mwc-list-item";
import {
  mdiClose,
  mdiConsoleLine,
  mdiEarth,
  mdiMagnify,
  mdiReload,
  mdiServerNetwork,
} from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { canShowPage } from "../../common/config/can_show_page";
import { componentsWithService } from "../../common/config/components_with_service";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeStateName } from "../../common/entity/compute_state_name";
import { domainIcon } from "../../common/entity/domain_icon";
import { navigate } from "../../common/navigate";
import "../../common/search/search-input";
import { caseInsensitiveStringCompare } from "../../common/string/compare";
import {
  fuzzyFilterSort,
  ScorableTextItem,
} from "../../common/string/filter/sequence-matching";
import { debounce } from "../../common/util/debounce";
import "../../components/ha-chip";
import "../../components/ha-circular-progress";
import "../../components/ha-header-bar";
import "../../components/ha-icon-button";
import { domainToName } from "../../data/integration";
import { getPanelNameTranslationKey } from "../../data/panel";
import { PageNavigation } from "../../layouts/hass-tabs-subpage";
import { configSections } from "../../panels/config/ha-panel-config";
import { haStyleDialog } from "../../resources/styles";
import { HomeAssistant } from "../../types";
import {
  ConfirmationDialogParams,
  showConfirmationDialog,
} from "../generic/show-dialog-box";
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

  @state() private _opened = false;

  @state() private _commandMode = false;

  @state() private _done = false;

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
    this._opened = true;
  }

  public closeDialog() {
    this._opened = false;
    this._done = false;
    this._focusSet = false;
    this._filter = "";
    this._search = "";
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._opened) {
      return html``;
    }

    let items: QuickBarItem[] | undefined = this._commandMode
      ? this._commandItems
      : this._entityItems;

    if (items && this._filter && this._filter !== " ") {
      items = this._filterItems(items, this._filter);
    }

    return html`
      <ha-dialog
        .heading=${true}
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
            .icon=${true}
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
                    ${this._narrow &&
                    html`
                      <mwc-button
                        .label=${this.hass!.localize("ui.common.close")}
                        @click=${this.closeDialog}
                      ></mwc-button>
                    `}
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
              <mwc-list
                @rangechange=${this._handleRangeChanged}
                @keydown=${this._handleListItemKeyDown}
                @selected=${this._handleSelected}
                style=${styleMap({
                  height: this._narrow
                    ? "calc(100vh - 56px)"
                    : `${Math.min(
                        items.length * (this._commandMode ? 56 : 72) + 26,
                        this._done ? 500 : 0
                      )}px`,
                })}
              >
                ${scroll({
                  items,
                  layout: Layout1d,
                  renderItem: (item: QuickBarItem, index) =>
                    this._renderItem(item, index),
                })}
              </mwc-list>
            `}
        ${!this._narrow && this._hint
          ? html`<div class="hint">${this._hint}</div>`
          : ""}
      </ha-dialog>
    `;
  }

  private _initializeItemsIfNeeded() {
    if (this._commandMode) {
      this._commandItems = this._commandItems || this._generateCommandItems();
    } else {
      this._entityItems = this._entityItems || this._generateEntityItems();
    }
  }

  private _handleOpened() {
    this.updateComplete.then(() => {
      this._done = true;
    });
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

  private _renderItem(item: QuickBarItem, index?: number) {
    if (!item) {
      return html``;
    }
    return isCommandItem(item)
      ? this._renderCommandItem(item, index)
      : this._renderEntityItem(item as EntityItem, index);
  }

  private _renderEntityItem(item: EntityItem, index?: number) {
    return html`
      <mwc-list-item
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
          : null}
      </mwc-list-item>
    `;
  }

  private _renderCommandItem(item: CommandItem, index?: number) {
    return html`
      <mwc-list-item
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
      </mwc-list-item>
    `;
  }

  private async processItemAndCloseDialog(item: QuickBarItem, index: number) {
    this._addSpinnerToCommandItem(index);

    await item.action();
    this.closeDialog();
  }

  private _handleSelected(ev: SingleSelectedEvent) {
    const index = ev.detail.index;
    if (index < 0) {
      return;
    }

    const item = ((ev.target as List).items[index] as any).item;
    this.processItemAndCloseDialog(item, index);
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
    return this.renderRoot.querySelector(`mwc-list-item[index="${index}"]`);
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
    const isFirstListItem =
      (ev.target as HTMLElement).getAttribute("index") === "0";
    this._focusListElement = ev.target as ListItem;
    if (ev.key === "ArrowUp") {
      if (isFirstListItem) {
        this._filterInputField?.focus();
      }
    }
    if (ev.key === "Backspace" || isSingleCharacter) {
      (ev.currentTarget as List).scrollTop = 0;
      this._filterInputField?.focus();
    }
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
        caseInsensitiveStringCompare(a.primaryText, b.primaryText)
      );
  }

  private _generateCommandItems(): CommandItem[] {
    return [
      ...this._generateReloadCommands(),
      ...this._generateServerControlCommands(),
      ...this._generateNavigationCommands(),
    ].sort((a, b) =>
      caseInsensitiveStringCompare(a.strings.join(" "), b.strings.join(" "))
    );
  }

  private _generateReloadCommands(): CommandItem[] {
    // Get all domains that have a direct "reload" service
    const reloadableDomains = componentsWithService(this.hass, "reload");

    const commands = reloadableDomains.map((domain) => ({
      primaryText:
        this.hass.localize(`ui.dialogs.quick-bar.commands.reload.${domain}`) ||
        this.hass.localize(
          "ui.dialogs.quick-bar.commands.reload.reload",
          "domain",
          domainToName(this.hass.localize, domain)
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

    return commands.map((command) => ({
      ...command,
      categoryKey: "reload",
      strings: [`${command.categoryText} ${command.primaryText}`],
    }));
  }

  private _generateServerControlCommands(): CommandItem[] {
    const serverActions = ["restart", "stop"];

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
        action: () => this.hass.callService("homeassistant", action),
      };

      return this._generateConfirmationCommand(
        {
          ...item,
          strings: [`${item.categoryText} ${item.primaryText}`],
        },
        this.hass.localize("ui.dialogs.generic.ok")
      );
    });
  }

  private _generateNavigationCommands(): CommandItem[] {
    const panelItems = this._generateNavigationPanelCommands();
    const sectionItems = this._generateNavigationConfigSectionCommands();

    return this._finalizeNavigationCommands([...panelItems, ...sectionItems]);
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
        if (!page.component) {
          continue;
        }
        const info = this._getNavigationInfoFromConfig(page);

        if (!info) {
          continue;
        }
        // Add to list, but only if we do not already have an entry for the same path and component
        if (
          items.some(
            (e) => e.path === info.path && e.component === info.component
          )
        ) {
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
    if (!page.component) {
      return undefined;
    }
    const caption = this.hass.localize(
      `ui.dialogs.quick-bar.commands.navigation.${page.component}`
    );

    if (page.translationKey && caption) {
      return { ...page, primaryText: caption };
    }

    return undefined;
  }

  private _generateConfirmationCommand(
    item: CommandItem,
    confirmText: ConfirmationDialogParams["confirmText"]
  ): CommandItem {
    return {
      ...item,
      action: () =>
        showConfirmationDialog(this, {
          confirmText,
          confirm: item.action,
        }),
    };
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
      haStyleDialog,
      css`
        .heading {
          display: flex;
          align-items: center;
          --mdc-theme-primary: var(--primary-text-color);
        }

        .heading ha-textfield {
          flex-grow: 1;
        }

        ha-dialog {
          --dialog-z-index: 8;
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

        ha-icon.entity,
        ha-svg-icon.entity {
          margin-left: 20px;
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
        }

        mwc-list-item {
          width: 100%;
        }

        mwc-list-item.command-item {
          text-transform: capitalize;
        }

        .hint {
          padding: 20px;
          font-style: italic;
          text-align: center;
        }

        .nothing-found {
          padding: 16px 0px;
          text-align: center;
        }

        div[slot="trailingIcon"] {
          display: flex;
          align-items: center;
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
