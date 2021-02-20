import "@material/mwc-list/mwc-list";
import type { List } from "@material/mwc-list/mwc-list";
import { SingleSelectedEvent } from "@material/mwc-list/mwc-list-foundation";
import "@material/mwc-list/mwc-list-item";
import type { ListItem } from "@material/mwc-list/mwc-list-item";
import { mdiConsoleLine } from "@mdi/js";
import {
  css,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  query,
} from "lit-element";
import { ifDefined } from "lit-html/directives/if-defined";
import { styleMap } from "lit-html/directives/style-map";
import { scroll } from "lit-virtualizer";
import memoizeOne from "memoize-one";
import { canShowPage } from "../../common/config/can_show_page";
import { componentsWithService } from "../../common/config/components_with_service";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeStateName } from "../../common/entity/compute_state_name";
import { domainIcon } from "../../common/entity/domain_icon";
import { navigate } from "../../common/navigate";
import "../../common/search/search-input";
import { compare } from "../../common/string/compare";
import {
  fuzzyFilterSort,
  ScorableTextItem,
} from "../../common/string/filter/sequence-matching";
import { debounce } from "../../common/util/debounce";
import "../../components/ha-circular-progress";
import "../../components/ha-dialog";
import "../../components/ha-header-bar";
import { domainToName } from "../../data/integration";
import { getPanelIcon, getPanelNameTranslationKey } from "../../data/panel";
import { PageNavigation } from "../../layouts/hass-tabs-subpage";
import { configSections } from "../../panels/config/ha-panel-config";
import { haStyleDialog } from "../../resources/styles";
import { HomeAssistant } from "../../types";
import {
  ConfirmationDialogParams,
  showConfirmationDialog,
} from "../generic/show-dialog-box";
import { QuickBarParams } from "./show-dialog-quick-bar";

const DEFAULT_NAVIGATION_ICON = "hass:arrow-right-circle";
const DEFAULT_SERVER_ICON = "hass:server";

interface QuickBarItem extends ScorableTextItem {
  icon?: string;
  iconPath?: string;
  action(data?: any): void;
}

interface QuickBarNavigationItem extends QuickBarItem {
  path: string;
}

interface NavigationInfo extends PageNavigation {
  text: string;
}

@customElement("ha-quick-bar")
export class QuickBar extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _commandItems?: QuickBarItem[];

  @internalProperty() private _entityItems?: QuickBarItem[];

  @internalProperty() private _items?: QuickBarItem[] = [];

  @internalProperty() private _filter = "";

  @internalProperty() private _search = "";

  @internalProperty() private _opened = false;

  @internalProperty() private _commandMode = false;

  @internalProperty() private _done = false;

  @query("search-input", false) private _filterInputField?: HTMLElement;

  private _focusSet = false;

  public async showDialog(params: QuickBarParams) {
    this._commandMode = params.commandMode || this._toggleIfAlreadyOpened();
    this._initializeItemsIfNeeded();
    this._opened = true;
  }

  public closeDialog() {
    this._opened = false;
    this._done = false;
    this._focusSet = false;
    this._filter = "";
    this._search = "";
    this._items = [];
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected updated(changedProperties: PropertyValues) {
    if (
      this._opened &&
      (changedProperties.has("_filter") ||
        changedProperties.has("_commandMode"))
    ) {
      this._setFilteredItems();
    }
  }

  protected render() {
    if (!this._opened) {
      return html``;
    }

    return html`
      <ha-dialog
        .heading=${true}
        open
        @opened=${this._handleOpened}
        @closed=${this.closeDialog}
        hideActions
      >
        <search-input
          dialogInitialFocus
          no-label-float
          slot="heading"
          class="heading"
          @value-changed=${this._handleSearchChange}
          .label=${this.hass.localize(
            "ui.dialogs.quick-bar.filter_placeholder"
          )}
          .filter=${this._commandMode ? `>${this._search}` : this._search}
          @keydown=${this._handleInputKeyDown}
          @focus=${this._setFocusFirstListItem}
        >
          ${this._commandMode
            ? html`<ha-svg-icon
                slot="prefix"
                class="prefix"
                .path=${mdiConsoleLine}
              ></ha-svg-icon>`
            : ""}
        </search-input>
        ${!this._items
          ? html`<ha-circular-progress
              size="small"
              active
            ></ha-circular-progress>`
          : html`<mwc-list
              @rangechange=${this._handleRangeChanged}
              @keydown=${this._handleListItemKeyDown}
              @selected=${this._handleSelected}
              style=${styleMap({
                height: `${Math.min(
                  this._items.length * (this._commandMode ? 56 : 72) + 26,
                  this._done ? 500 : 0
                )}px`,
              })}
            >
              ${scroll({
                items: this._items,
                renderItem: (item: QuickBarItem, index?: number) =>
                  this._renderItem(item, index),
              })}
            </mwc-list>`}
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
    this._setFilteredItems();
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
    return html`
      <mwc-list-item
        .twoline=${Boolean(item.altText)}
        .item=${item}
        hasMeta
        index=${ifDefined(index)}
        graphic="icon"
        class=${this._commandMode ? "command-item" : ""}
      >
        ${item.iconPath
          ? html`<ha-svg-icon
              .path=${item.iconPath}
              slot="graphic"
            ></ha-svg-icon>`
          : html`<ha-icon .icon=${item.icon} slot="graphic"></ha-icon>`}
        ${item.text}
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

  private async processItemAndCloseDialog(item: QuickBarItem, index: number) {
    this._addSpinnerToCommandItem(index);

    await item.action();
    this.closeDialog();
  }

  private _handleSelected(ev: SingleSelectedEvent) {
    const index = ev.detail.index;
    const item = ((ev.target as List).items[index] as any).item;
    this.processItemAndCloseDialog(item, index);
  }

  private _handleInputKeyDown(ev: KeyboardEvent) {
    if (ev.code === "Enter") {
      if (!this._items?.length) {
        return;
      }

      this.processItemAndCloseDialog(this._items[0], 0);
    } else if (ev.code === "ArrowDown") {
      ev.preventDefault();
      this._getItemAtIndex(0)?.focus();
      this._getItemAtIndex(1)?.focus();
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
    const newFilter = ev.detail.value;
    const oldCommandMode = this._commandMode;

    if (newFilter.startsWith(">")) {
      this._commandMode = true;
      this._search = newFilter.substring(1);
    } else {
      this._commandMode = false;
      this._search = newFilter;
    }

    this._debouncedSetFilter(this._search);

    if (oldCommandMode !== this._commandMode) {
      this._items = undefined;
      this._focusSet = false;

      this._initializeItemsIfNeeded();
    }
  }

  private _debouncedSetFilter = debounce((filter: string) => {
    this._filter = filter;
  }, 100);

  private _setFocusFirstListItem() {
    // @ts-ignore
    this._getItemAtIndex(0)?.rippleHandlers.startFocus();
  }

  private _handleListItemKeyDown(ev: KeyboardEvent) {
    const isSingleCharacter = ev.key.length === 1;
    const isFirstListItem =
      (ev.target as HTMLElement).getAttribute("index") === "0";
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

  private _generateEntityItems(): QuickBarItem[] {
    return Object.keys(this.hass.states)
      .map((entityId) => ({
        text: computeStateName(this.hass.states[entityId]),
        altText: entityId,
        icon: domainIcon(computeDomain(entityId), this.hass.states[entityId]),
        action: () => fireEvent(this, "hass-more-info", { entityId }),
      }))
      .sort((a, b) => compare(a.text.toLowerCase(), b.text.toLowerCase()));
  }

  private _generateCommandItems(): QuickBarItem[] {
    return [
      ...this._generateReloadCommands(),
      ...this._generateServerControlCommands(),
      ...this._generateNavigationCommands(),
    ].sort((a, b) => compare(a.text.toLowerCase(), b.text.toLowerCase()));
  }

  private _generateReloadCommands(): QuickBarItem[] {
    const reloadableDomains = componentsWithService(this.hass, "reload").sort();

    return reloadableDomains.map((domain) => ({
      text:
        this.hass.localize(`ui.dialogs.quick-bar.commands.reload.${domain}`) ||
        this.hass.localize(
          "ui.dialogs.quick-bar.commands.reload.reload",
          "domain",
          domainToName(this.hass.localize, domain)
        ),
      icon: domainIcon(domain),
      action: () => this.hass.callService(domain, "reload"),
    }));
  }

  private _generateServerControlCommands(): QuickBarItem[] {
    const serverActions = ["restart", "stop"];

    return serverActions.map((action) =>
      this._generateConfirmationCommand(
        {
          text: this.hass.localize(
            "ui.dialogs.quick-bar.commands.server_control.perform_action",
            "action",
            this.hass.localize(
              `ui.dialogs.quick-bar.commands.server_control.${action}`
            )
          ),
          icon: DEFAULT_SERVER_ICON,
          action: () => this.hass.callService("homeassistant", action),
        },
        this.hass.localize("ui.dialogs.generic.ok")
      )
    );
  }

  private _generateNavigationCommands(): QuickBarItem[] {
    const panelItems = this._generateNavigationPanelCommands();
    const sectionItems = this._generateNavigationConfigSectionCommands();

    return this._withNavigationActions([...panelItems, ...sectionItems]);
  }

  private _generateNavigationPanelCommands(): Omit<
    QuickBarNavigationItem,
    "action"
  >[] {
    return Object.keys(this.hass.panels)
      .filter((panelKey) => panelKey !== "_my_redirect")
      .map((panelKey) => {
        const panel = this.hass.panels[panelKey];
        const translationKey = getPanelNameTranslationKey(panel);

        const text = this.hass.localize(
          "ui.dialogs.quick-bar.commands.navigation.navigate_to",
          "panel",
          this.hass.localize(translationKey) || panel.title || panel.url_path
        );

        return {
          text,
          icon: getPanelIcon(panel) || DEFAULT_NAVIGATION_ICON,
          path: `/${panel.url_path}`,
        };
      });
  }

  private _generateNavigationConfigSectionCommands(): Partial<
    QuickBarNavigationItem
  >[] {
    const items: NavigationInfo[] = [];

    for (const sectionKey of Object.keys(configSections)) {
      for (const page of configSections[sectionKey]) {
        if (canShowPage(this.hass, page)) {
          if (page.component) {
            const info = this._getNavigationInfoFromConfig(page);

            if (info) {
              items.push(info);
            }
          }
        }
      }
    }

    return items;
  }

  private _getNavigationInfoFromConfig(
    page: PageNavigation
  ): NavigationInfo | undefined {
    if (page.component) {
      const shortCaption = this.hass.localize(
        `ui.dialogs.quick-bar.commands.navigation.${page.component}`
      );

      if (page.translationKey && shortCaption) {
        const caption = this.hass.localize(
          "ui.dialogs.quick-bar.commands.navigation.navigate_to",
          "panel",
          shortCaption
        );

        return { ...page, text: caption };
      }
    }

    return undefined;
  }

  private _generateConfirmationCommand(
    item: QuickBarItem,
    confirmText: ConfirmationDialogParams["confirmText"]
  ): QuickBarItem {
    return {
      ...item,
      action: () =>
        showConfirmationDialog(this, {
          confirmText,
          confirm: item.action,
        }),
    };
  }

  private _withNavigationActions(items) {
    return items.map(({ text, icon, iconPath, path }) => ({
      text,
      icon,
      iconPath,
      action: () => navigate(this, path),
    }));
  }

  private _toggleIfAlreadyOpened() {
    return this._opened ? !this._commandMode : false;
  }

  private _setFilteredItems() {
    const items = this._commandMode ? this._commandItems : this._entityItems;
    this._items = this._filter
      ? this._filterItems(items || [], this._filter)
      : items;
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
          padding: 8px 20px 0px;
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

        ha-icon,
        ha-svg-icon {
          margin-left: 20px;
        }

        ha-svg-icon.prefix {
          margin: 8px;
          color: var(--primary-text-color);
        }

        .uni-virtualizer-host {
          display: block;
          position: relative;
          contain: strict;
          overflow: auto;
          height: 100%;
        }

        .uni-virtualizer-host > * {
          box-sizing: border-box;
        }

        mwc-list-item {
          width: 100%;
        }

        mwc-list-item.command-item {
          text-transform: capitalize;
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
