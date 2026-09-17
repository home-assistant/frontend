import "@home-assistant/webawesome/dist/components/divider/divider";
import {
  mdiBackupRestore,
  mdiChartBoxOutline,
  mdiClose,
  mdiCodeBraces,
  mdiCogOutline,
  mdiContentDuplicate,
  mdiDevices,
  mdiDotsVertical,
  mdiInformationOutline,
  mdiLinkVariant,
  mdiPencil,
  mdiPencilOff,
  mdiPencilOutline,
  mdiPlusBoxMultipleOutline,
  mdiTransitConnectionVariant,
} from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { cache } from "lit/directives/cache";
import { classMap } from "lit/directives/class-map";
import { keyed } from "lit/directives/keyed";
import type { RequestSelectedDetail } from "@material/mwc-list/mwc-list-item";
import { dynamicElement } from "../../common/dom/dynamic-element-directive";
import type { HASSDomEvent } from "../../common/dom/fire_event";
import { fireEvent } from "../../common/dom/fire_event";
import { mainWindow } from "../../common/dom/get_main_window";
import { stopPropagation } from "../../common/dom/stop_propagation";
import { computeDomain } from "../../common/entity/compute_domain";
import {
  computeEntityEntryNameList,
  computeEntityNameList,
} from "../../common/entity/compute_entity_name_display";
import { shouldHandleRequestSelectedEvent } from "../../common/mwc/handle-request-selected-event";
import {
  getHistoryState,
  navigate,
  replaceCurrentUrl,
  updateHistoryState,
} from "../../common/navigate";
import {
  createMoreInfoUrl,
  decodeMoreInfoUrl,
} from "../../common/url/more-info-query-params";
import type { LocalizeKeys } from "../../common/translations/localize";
import { computeRTL } from "../../common/util/compute_rtl";
import { withViewTransition } from "../../common/util/view-transition";
import "../../components/ha-adaptive-dialog";
import "../../components/ha-dropdown";
import type { HaDropdownSelectEvent } from "../../components/ha-dropdown";
import "../../components/ha-dropdown-item";
import "../../components/ha-icon-button";
import "../../components/ha-icon-button-prev";
import "./ha-more-info-related";
import type {
  EntityRegistryEntry,
  ExtEntityRegistryEntry,
} from "../../data/entity/entity_registry";
import {
  getExtendedEntityRegistryEntry,
  updateEntityRegistryEntry,
} from "../../data/entity/entity_registry";
import { DirtyStateProviderMixin } from "../../mixins/dirty-state-provider-mixin";
import type { EntitySettingsState } from "../../panels/config/entities/entity-registry-settings-editor";
import type { Helper } from "../../panels/config/helpers/const";
import { ScrollableFadeMixin } from "../../mixins/scrollable-fade-mixin";
import {
  haStyleDialog,
  haStyleDialogFixedTop,
  haStyleScrollbar,
} from "../../resources/styles";
import "../../state-summary/state-card-content";
import type { HomeAssistant } from "../../types";
import { showConfirmationDialog } from "../generic/show-dialog-box";
import {
  computeShowHistoryComponent,
  computeShowLogBookComponent,
  DOMAINS_WITH_MORE_INFO,
  EDITABLE_DOMAINS_WITH_ID,
  EDITABLE_DOMAINS_WITH_UNIQUE_ID,
  type MoreInfoView,
} from "./const";
import {
  computeNativeMoreInfoHeader,
  MORE_INFO_BREADCRUMB_NAME,
} from "./compute-more-info-header";
import type { MoreInfoNativeHeader } from "../../external_app/external_messaging";
import "./controls/more-info-default";
import type { FavoritesDialogContext } from "./favorites";
import { getFavoritesDialogHandler } from "./favorites";
import "./ha-more-info-add-to";
import "./ha-more-info-details";
import "./ha-more-info-history-and-logbook";
import "./ha-more-info-info";
import "./ha-more-info-settings";
import "./more-info-content";

export interface MoreInfoDialogParams {
  entityId: string | null;
  view?: MoreInfoView;
  /** @deprecated Use `view` instead */
  tab?: MoreInfoView;
  large?: boolean;
  data?: Record<string, any>;
  fromUrl?: boolean;
  returnUrl?: string;
  parentElement?: LitElement;
}

interface ChildView {
  viewTag: string;
  viewTitle?: string;
  viewImport?: () => Promise<unknown>;
  viewParams?: any;
  viewHeaderTag?: string;
  viewHeaderImport?: () => Promise<unknown>;
}

declare global {
  interface HASSDomEvents {
    "show-child-view": ChildView;
    "toggle-edit-mode": boolean;
    "close-child-view": undefined;
  }
}

const DEFAULT_VIEW: MoreInfoView = "info";

@customElement("ha-more-info-dialog")
export class MoreInfoDialog extends DirtyStateProviderMixin<
  EntitySettingsState | Helper | Record<string, string[]> | null,
  "entity-registry" | "helper" | "vacuum-segment-mapping"
>()(ScrollableFadeMixin(LitElement)) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public large = false;

  /**
   * Render as a frameless page filling the viewport instead of a dialog, for
   * an external app that embeds it in a native screen. Closing then sends
   * `more_info/close` on the external bus instead of hiding a dialog.
   */
  @property({ type: Boolean, reflect: true }) public standalone = false;

  /**
   * Leave out the header in standalone mode: the app draws the title and the
   * close button in its own screen chrome, from the `more_info/open` payload.
   */
  @property({ type: Boolean, attribute: "hide-header" }) public hideHeader =
    false;

  @state() private _fill = false;

  @state() private _open = false;

  @state() private _parentEntityIds: string[] = [];

  @query(".content") private _contentElement?: HTMLDivElement;

  @query("ha-adaptive-dialog") private _dialogElement?: HTMLElement;

  @state() private _entityId?: string | null;

  /** The entity currently shown; the dialog may have followed a related one. */
  public get entityId(): string | null | undefined {
    return this._entityId;
  }

  @state() private _data?: Record<string, any>;

  private _returnUrl?: string;

  @state() private _currView: MoreInfoView = DEFAULT_VIEW;

  @state() private _initialView: MoreInfoView = DEFAULT_VIEW;

  @state() private _childViewStack: ChildView[] = [];

  private get _childView(): ChildView | undefined {
    return this._childViewStack[this._childViewStack.length - 1];
  }

  @state() private _entry?: ExtEntityRegistryEntry | null;

  @state() private _infoEditMode = false;

  @state() private _detailsYamlMode = false;

  @state() private _isEscapeEnabled = true;

  /** The header as last described to the app; see `_sendNativeHeader`. */
  private _sentNativeHeader?: string;

  protected scrollFadeThreshold = 24;

  protected get scrollableElement(): HTMLElement | null {
    return this._contentElement || null;
  }

  public showDialog(params: MoreInfoDialogParams) {
    this._entityId = params.entityId;
    if (!this._entityId) {
      this.closeDialog();
      return;
    }

    const view = params.view || params.tab || DEFAULT_VIEW;

    this._data = params.data;
    this._returnUrl = params.returnUrl;
    this._currView = view;
    this._initialView = view;
    this._childViewStack = [];
    this._infoEditMode = false;
    this._detailsYamlMode = false;

    this.large = params.large ?? false;
    this._fill = false;
    this._open = true;
    this._loadEntityRegistryEntry();
  }

  private async _loadEntityRegistryEntry() {
    if (!this._entityId) {
      return;
    }
    try {
      this._entry = await getExtendedEntityRegistryEntry(
        this.hass,
        this._entityId
      );
    } catch (_e) {
      this._entry = null;
    }
  }

  public closeDialog() {
    if (this.standalone) {
      this._requestExternalClose();
      return;
    }
    const dialog = this._dialogElement?.shadowRoot?.querySelector("ha-dialog");
    if (dialog) {
      fireEvent(dialog as HTMLElement, "dialog-set-fullscreen", false);
    }
    this._open = false;
  }

  private _dialogClosed() {
    // Restore the pre-dialog URL only while the URL still carries this
    // dialog's deep-link params: navigate() waits for the close only up to
    // DIALOG_WAIT_TIMEOUT and may have committed a new URL already.
    if (
      this._returnUrl &&
      decodeMoreInfoUrl(mainWindow.location.search).entityId === this._entityId
    ) {
      replaceCurrentUrl(this._returnUrl);
    }
    this._entityId = undefined;
    this._parentEntityIds = [];
    this._entry = undefined;
    this._infoEditMode = false;
    this._detailsYamlMode = false;
    this._initialView = DEFAULT_VIEW;
    this._currView = DEFAULT_VIEW;
    this._childViewStack = [];
    this._returnUrl = undefined;
    this._isEscapeEnabled = true;
    window.removeEventListener("dialog-closed", this._enableEscapeKeyClose);
    window.removeEventListener("show-dialog", this._disableEscapeKeyClose);
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _shouldShowEditIcon(
    domain: string,
    stateObj: HassEntity | undefined
  ): boolean {
    if (__DEMO__ || !stateObj) {
      return false;
    }
    if (EDITABLE_DOMAINS_WITH_ID.includes(domain) && stateObj.attributes.id) {
      return true;
    }
    if (EDITABLE_DOMAINS_WITH_UNIQUE_ID.includes(domain)) {
      return true;
    }
    if (domain === "person" && stateObj.attributes.editable !== "false") {
      return true;
    }

    return false;
  }

  private _shouldShowHistory(domain: string): boolean {
    return (
      DOMAINS_WITH_MORE_INFO.includes(domain) &&
      (computeShowHistoryComponent(this.hass, this._entityId!) ||
        computeShowLogBookComponent(this.hass, this._entityId!))
    );
  }

  private _shouldShowAddEntityTo(): boolean {
    return (
      !!this.hass.user?.is_admin ||
      !!this.hass.auth.external?.config.hasEntityAddTo
    );
  }

  private _getDeviceId(): string | null {
    const entity = this.hass.entities[this._entityId!] as
      EntityRegistryEntry | undefined;
    return entity?.device_id ?? null;
  }

  private _setView(view: MoreInfoView) {
    updateHistoryState({
      dialogParams: {
        ...getHistoryState()?.dialogParams,
        view,
      },
    });
    this._currView = view;
    this._syncUrl();
  }

  private _syncUrl() {
    if (!this._returnUrl || !this._entityId) {
      return;
    }
    replaceCurrentUrl(
      createMoreInfoUrl(this._returnUrl, {
        entityId: this._entityId,
        view: this._currView,
      })
    );
  }

  private _goBack() {
    if (this._childView) {
      const dialog =
        this._dialogElement?.shadowRoot?.querySelector("ha-dialog");
      if (dialog) {
        fireEvent(dialog as HTMLElement, "dialog-set-fullscreen", false);
      }
      this._childViewStack = this._childViewStack.slice(0, -1);
      this._detailsYamlMode = false;
      return;
    }
    if (
      this._initialView !== DEFAULT_VIEW &&
      this._currView === this._initialView
    ) {
      this._resetInitialView();
      return;
    }
    if (this._initialView !== this._currView) {
      this._setView(this._initialView);
      return;
    }
    if (this._parentEntityIds.length > 0) {
      this._entityId = this._parentEntityIds.pop();
      this._currView = DEFAULT_VIEW;
      this._loadEntityRegistryEntry();
      this._syncUrl();
    }
  }

  private _resetInitialView() {
    this._initialView = DEFAULT_VIEW;
    this._setView(DEFAULT_VIEW);
  }

  private _goToHistory() {
    this._setView("history");
  }

  private _goToSettings(): void {
    this._setView("settings");
  }

  private _showChildView(ev: CustomEvent): void {
    this._pushChildView(ev.detail as ChildView);
  }

  private _pushChildView(view: ChildView): void {
    if (view.viewImport) {
      view.viewImport();
    }
    if (view.viewHeaderImport) {
      view.viewHeaderImport();
    }
    this._childViewStack = [...this._childViewStack, view];
  }

  private _goToDevice(): void {
    const deviceId = this._getDeviceId();
    if (!deviceId) return;
    this._leaveTo(`/config/devices/device/${deviceId}`);
  }

  /**
   * Navigate to a page of the app. The standalone page is replaced by the app
   * at that route, so there is no dialog to close.
   */
  private _leaveTo(path: string) {
    navigate(path);
    if (!this.standalone) {
      this.closeDialog();
    }
  }

  private _goToEdit() {
    const stateObj = this.hass.states[this._entityId!];
    const domain = computeDomain(this._entityId!);
    let idToPassThroughUrl = stateObj.entity_id;
    if (EDITABLE_DOMAINS_WITH_ID.includes(domain) || domain === "person") {
      idToPassThroughUrl = stateObj.attributes.id;
    }
    if (EDITABLE_DOMAINS_WITH_UNIQUE_ID.includes(domain)) {
      if (!this._entry) {
        return;
      }
      idToPassThroughUrl = this._entry.unique_id;
    }

    this._leaveTo(`/config/${domain}/edit/${idToPassThroughUrl}`);
  }

  private _toggleInfoEditMode() {
    withViewTransition(() => {
      this._infoEditMode = !this._infoEditMode;
    });
  }

  private _toggleDetailsYamlMode() {
    const dialog = this._dialogElement?.shadowRoot?.querySelector("ha-dialog");
    if (dialog) {
      fireEvent(dialog as HTMLElement, "dialog-set-fullscreen", false);
    }
    this._detailsYamlMode = !this._detailsYamlMode;
  }

  private _handleToggleInfoEditModeEvent(ev) {
    withViewTransition(() => {
      this._infoEditMode = ev.detail;
    });
  }

  private _goToRelated(): void {
    this._setView("related");
  }

  private _getFavoritesContext(): FavoritesDialogContext | undefined {
    const entityId = this._entityId;
    const stateObj =
      entityId && (this.hass.states[entityId] as HassEntity | undefined);

    if (!this._entry || !stateObj) {
      return undefined;
    }

    return {
      host: this,
      hass: this.hass,
      entry: this._entry,
      stateObj,
    };
  }

  private _handleMenuAction(ev: HaDropdownSelectEvent) {
    this._performMenuAction(ev.detail?.item?.value);
  }

  /**
   * Answers a tap on the app's native header (`more_info/action`) with what the
   * dialog's own button or menu item would do; ids are those `more_info/header`
   * named. See `computeNativeMoreInfoHeader`.
   */
  public performHeaderAction(id: string) {
    switch (id) {
      case "close":
        this.closeDialog();
        break;
      case "back":
        this._goBack();
        break;
      case "history":
        this._goToHistory();
        break;
      case "settings":
        this._goToSettings();
        break;
      case "toggle_yaml":
        this._toggleDetailsYamlMode();
        break;
      default:
        this._performMenuAction(id);
    }
  }

  private _performMenuAction(action: string | undefined) {
    switch (action) {
      case "device":
        this._goToDevice();
        break;
      case "edit":
        this._goToEdit();
        break;
      case "toggle_edit":
        this._toggleInfoEditMode();
        break;
      case "reset_favorites":
        this._resetFavorites();
        break;
      case "copy_favorites":
        this._copyFavorites();
        break;
      case "related":
        this._goToRelated();
        break;
      case "add_to":
        this._setView("add_to");
        break;
      case "info":
        this._resetInitialView();
        break;
      case "details":
        this._setView("details");
        break;
      default:
        break;
    }
  }

  private async _resetFavorites() {
    const favoritesContext = this._getFavoritesContext();

    if (!favoritesContext) {
      return;
    }

    const favoritesHandler = getFavoritesDialogHandler(
      favoritesContext.stateObj
    );

    if (!favoritesHandler) {
      return;
    }

    const labels = favoritesHandler.getLabels(this.hass);

    if (
      !(await showConfirmationDialog(this, {
        title: labels.reset,
        text: labels.resetText,
        dismissText: this.hass.localize("ui.common.cancel"),
        confirmText: this.hass.localize("ui.common.reset"),
        destructive: true,
      }))
    ) {
      return;
    }

    const result = await updateEntityRegistryEntry(
      this.hass,
      favoritesContext.entry.entity_id,
      {
        options_domain: favoritesHandler.domain,
        options: favoritesHandler.getResetOptions(favoritesContext.stateObj),
      }
    );
    this._entry = result.entity_entry;
  }

  private async _copyFavorites() {
    const favoritesContext = this._getFavoritesContext();

    if (!favoritesContext) {
      return;
    }

    const favoritesHandler = getFavoritesDialogHandler(
      favoritesContext.stateObj
    );

    if (!favoritesHandler) {
      return;
    }

    await favoritesHandler.copy(favoritesContext);
  }

  private _goToAddEntityTo(ev: CustomEvent<RequestSelectedDetail>) {
    // Only check for request-selected events (from menu items), not regular clicks (from icon button)
    if (
      ev.type === "request-selected" &&
      !shouldHandleRequestSelectedEvent(ev)
    ) {
      return;
    }
    this._setView("add_to");
  }

  private _breadcrumbClick(ev: Event) {
    ev.stopPropagation();
    this._setView("related");
  }

  private get _isDefaultView(): boolean {
    return this._currView === DEFAULT_VIEW && !this._childView;
  }

  /** Nothing to go back to: the header closes instead. */
  private get _showsCloseIcon(): boolean {
    return (
      this._isDefaultView &&
      this._parentEntityIds.length === 0 &&
      !this._childView
    );
  }

  /**
   * The header's title and the names above it. A view named by the current
   * view keeps the entity's own name in the breadcrumb; the entity's view
   * takes it as the title.
   */
  private _computeHeaderText(
    entityId: string,
    stateObj: HassEntity | undefined
  ): { breadcrumb: string[]; title: string } {
    const breadcrumb = (
      stateObj
        ? computeEntityNameList(
            stateObj,
            MORE_INFO_BREADCRUMB_NAME,
            this.hass.entities,
            this.hass.devices,
            this.hass.areas,
            this.hass.floors
          )
        : this._entry
          ? computeEntityEntryNameList(
              this._entry,
              MORE_INFO_BREADCRUMB_NAME,
              this.hass.entities,
              this.hass.devices,
              this.hass.areas,
              this.hass.floors
            )
          : [entityId]
    ).filter((v): v is string => Boolean(v));
    const viewTitle =
      this._currView === "details"
        ? this.hass.localize("ui.dialogs.more_info_control.details")
        : this._currView === "related"
          ? this.hass.localize("ui.dialogs.more_info_control.related")
          : this._currView === "add_to"
            ? this.hass.localize("ui.dialogs.more_info_control.add_to.item")
            : this._childView?.viewTitle;
    const defaultTitle = breadcrumb[breadcrumb.length - 1] || entityId;
    if (!viewTitle) {
      breadcrumb.pop();
    }
    return { breadcrumb, title: viewTitle || defaultTitle };
  }

  private _computeFavoritesState(stateObj: HassEntity | undefined) {
    const favoritesContext =
      this._entry && stateObj
        ? {
            host: this,
            hass: this.hass,
            entry: this._entry,
            stateObj,
          }
        : undefined;

    const favoritesHandler = favoritesContext
      ? getFavoritesDialogHandler(favoritesContext.stateObj)
      : undefined;

    return {
      favoritesLabels: favoritesHandler?.getLabels(this.hass),
      supportsFavorites: Boolean(favoritesHandler && favoritesContext),
      resetFavoritesDisabled:
        favoritesContext && favoritesHandler
          ? !favoritesHandler.hasCustomFavorites(favoritesContext.entry)
          : false,
      copyFavoritesDisabled:
        favoritesContext && favoritesHandler?.canCopy
          ? !favoritesHandler.canCopy(favoritesContext.entry)
          : false,
    };
  }

  /**
   * The header the page leaves out, described for the app that draws it
   * (`hasNativeMoreInfoHeader`), from the same state and conditions as the
   * header `render` would show.
   */
  private _computeNativeHeader(): MoreInfoNativeHeader | undefined {
    if (!this.standalone || !this.hideHeader || !this._entityId) {
      return undefined;
    }
    const entityId = this._entityId;
    const stateObj = this.hass.states[entityId] as HassEntity | undefined;
    const domain = computeDomain(entityId);
    const deviceId = this._getDeviceId();
    const { breadcrumb, title } = this._computeHeaderText(entityId, stateObj);
    const {
      favoritesLabels,
      supportsFavorites,
      resetFavoritesDisabled,
      copyFavoritesDisabled,
    } = this._computeFavoritesState(stateObj);
    const isRTL = computeRTL(
      this.hass.language,
      this.hass.translationMetadata.translations
    );
    return computeNativeMoreInfoHeader({
      localize: this.hass.localize,
      entityId,
      domain,
      title,
      subtitle: breadcrumb.length
        ? breadcrumb.join(isRTL ? " ◂ " : " ▸ ")
        : undefined,
      canGoBack: !this._showsCloseIcon,
      isDefaultView: this._isDefaultView,
      view: this._currView,
      hasChildViewHeader: !!this._childView?.viewHeaderTag,
      showHistory: this._shouldShowHistory(domain),
      isAdmin: !__DEMO__ && !!this.hass.user?.is_admin,
      showAddTo: !__DEMO__ && this._shouldShowAddEntityTo(),
      favorites:
        supportsFavorites && favoritesLabels
          ? {
              editMode: this._infoEditMode,
              editModeLabel: favoritesLabels.editMode,
              resetLabel: favoritesLabels.reset,
              copyLabel: favoritesLabels.copy,
              canReset: !resetFavoritesDisabled,
              canCopy: !copyFavoritesDisabled,
            }
          : undefined,
      device: deviceId
        ? { type: this.hass.devices[deviceId]?.entry_type || "device" }
        : undefined,
      showEdit: this._shouldShowEditIcon(domain, stateObj),
    });
  }

  protected render() {
    if (!this._entityId) {
      return nothing;
    }
    const entityId = this._entityId;
    const stateObj = this.hass.states[entityId] as HassEntity | undefined;

    const domain = computeDomain(entityId);

    const isAdmin = this.hass.user!.is_admin;

    const deviceId = this._getDeviceId();
    const deviceType =
      (deviceId && this.hass.devices[deviceId].entry_type) || "device";

    const isDefaultView = this._isDefaultView;
    const showCloseIcon = this._showsCloseIcon;

    const addToMenuItem = this.hass.localize(
      "ui.dialogs.more_info_control.add_to.item"
    );
    const { breadcrumb, title } = this._computeHeaderText(entityId, stateObj);

    const {
      favoritesLabels,
      supportsFavorites,
      resetFavoritesDisabled,
      copyFavoritesDisabled,
    } = this._computeFavoritesState(stateObj);

    const isRTL = computeRTL(
      this.hass.language,
      this.hass.translationMetadata.translations
    );

    // Closing the standalone page asks the external app to dismiss it; the
    // button would do nothing without one.
    const canClose = !this.standalone || !!this.hass.auth.external;

    const navigationIcon = !showCloseIcon
      ? html`
          <ha-icon-button-prev
            slot="headerNavigationIcon"
            @click=${this._goBack}
            .label=${this.hass.localize(
              "ui.dialogs.more_info_control.back_to_info"
            )}
          ></ha-icon-button-prev>
        `
      : canClose
        ? html`
            <ha-icon-button
              slot="headerNavigationIcon"
              @click=${this.closeDialog}
              .label=${this.hass.localize("ui.common.close")}
              .path=${mdiClose}
            ></ha-icon-button>
          `
        : nothing;

    const childViewContent = this._childView
      ? html`
          <div class="child-view">
            ${dynamicElement(this._childView.viewTag, {
              hass: this.hass,
              entry: this._entry,
              params: this._childView.viewParams,
            })}
          </div>
        `
      : nothing;

    return html`
      <ha-adaptive-dialog
        .open=${this._open}
        .standalone=${this.standalone}
        .withoutHeader=${this.standalone && this.hideHeader}
        .width=${this._fill ? "full" : this.large ? "large" : "medium"}
        @closed=${this._dialogClosed}
        @opened=${this._handleOpened}
        @show-child-view=${this._showChildView}
        .preventScrimClose=${
          ((this._currView === "settings" || this._childView) &&
            this.isDirtyState) ||
          !this._isEscapeEnabled
        }
        flexcontent
      >
        ${navigationIcon}
        <span slot="headerTitle" @click=${this._enlarge} class="title">
          ${
            breadcrumb.length > 0
              ? !__DEMO__ && isAdmin
                ? html`
                    <button class="breadcrumb" @click=${this._breadcrumbClick}>
                      ${breadcrumb.join(isRTL ? " ◂ " : " ▸ ")}
                    </button>
                  `
                : html`
                    <p class="breadcrumb">
                      ${breadcrumb.join(isRTL ? " ◂ " : " ▸ ")}
                    </p>
                  `
              : nothing
          }
          <p class="main">${title}</p>
        </span>
        ${
          isDefaultView
            ? html`
                ${
                  this._shouldShowHistory(domain)
                    ? html`
                        <ha-icon-button
                          slot="headerActionItems"
                          .label=${this.hass.localize(
                            "ui.dialogs.more_info_control.history"
                          )}
                          .path=${mdiChartBoxOutline}
                          @click=${this._goToHistory}
                        ></ha-icon-button>
                      `
                    : nothing
                }
                ${
                  !__DEMO__ && isAdmin
                    ? html`
                        <ha-icon-button
                          slot="headerActionItems"
                          .label=${this.hass.localize(
                            "ui.dialogs.more_info_control.settings"
                          )}
                          .path=${mdiCogOutline}
                          @click=${this._goToSettings}
                        ></ha-icon-button>
                        <ha-dropdown
                          slot="headerActionItems"
                          @closed=${stopPropagation}
                          @wa-select=${this._handleMenuAction}
                          placement="bottom-end"
                        >
                          <ha-icon-button
                            slot="trigger"
                            .label=${this.hass.localize("ui.common.menu")}
                            .path=${mdiDotsVertical}
                          ></ha-icon-button>

                          ${
                            this._shouldShowAddEntityTo()
                              ? html`
                                  <ha-dropdown-item value="add_to">
                                    <ha-svg-icon
                                      slot="icon"
                                      .path=${mdiPlusBoxMultipleOutline}
                                    ></ha-svg-icon>
                                    ${addToMenuItem}
                                  </ha-dropdown-item>

                                  <wa-divider></wa-divider>
                                `
                              : nothing
                          }
                          ${
                            supportsFavorites
                              ? html`
                                  <ha-dropdown-item value="toggle_edit">
                                    <ha-svg-icon
                                      slot="icon"
                                      .path=${
                                        this._infoEditMode
                                          ? mdiPencilOff
                                          : mdiPencil
                                      }
                                    ></ha-svg-icon>
                                    ${
                                      this._infoEditMode
                                        ? this.hass.localize(
                                            "ui.dialogs.more_info_control.exit_edit_mode"
                                          )
                                        : favoritesLabels?.editMode
                                    }
                                  </ha-dropdown-item>
                                  <ha-dropdown-item
                                    value="reset_favorites"
                                    .disabled=${resetFavoritesDisabled}
                                  >
                                    <ha-svg-icon
                                      slot="icon"
                                      .path=${mdiBackupRestore}
                                    ></ha-svg-icon>
                                    ${favoritesLabels?.reset}
                                  </ha-dropdown-item>
                                  <ha-dropdown-item
                                    value="copy_favorites"
                                    .disabled=${copyFavoritesDisabled}
                                  >
                                    <ha-svg-icon
                                      slot="icon"
                                      .path=${mdiContentDuplicate}
                                    ></ha-svg-icon>
                                    ${favoritesLabels?.copy}
                                  </ha-dropdown-item>
                                  <wa-divider></wa-divider>
                                `
                              : nothing
                          }
                          ${
                            deviceId
                              ? html`
                                  <ha-dropdown-item value="device">
                                    <ha-svg-icon
                                      slot="icon"
                                      .path=${
                                        deviceType === "service"
                                          ? mdiTransitConnectionVariant
                                          : mdiDevices
                                      }
                                    ></ha-svg-icon>
                                    ${this.hass.localize(
                                      "ui.dialogs.more_info_control.device_or_service_info",
                                      {
                                        type: this.hass.localize(
                                          `ui.dialogs.more_info_control.device_type.${deviceType}`
                                        ),
                                      }
                                    )}
                                  </ha-dropdown-item>
                                `
                              : nothing
                          }
                          ${
                            this._shouldShowEditIcon(domain, stateObj)
                              ? html`
                                  <ha-dropdown-item value="edit">
                                    <ha-svg-icon
                                      slot="icon"
                                      .path=${mdiPencilOutline}
                                    ></ha-svg-icon>
                                    ${
                                      this.hass.localize(
                                        `ui.dialogs.more_info_control.edit_domain.${domain}` as LocalizeKeys
                                      ) ||
                                      this.hass.localize(
                                        "ui.dialogs.more_info_control.edit"
                                      )
                                    }
                                  </ha-dropdown-item>
                                `
                              : nothing
                          }
                          <ha-dropdown-item value="related">
                            <ha-svg-icon
                              slot="icon"
                              .path=${mdiLinkVariant}
                            ></ha-svg-icon>
                            ${this.hass.localize(
                              "ui.dialogs.more_info_control.related"
                            )}
                          </ha-dropdown-item>
                          <ha-dropdown-item value="details">
                            <ha-svg-icon
                              slot="icon"
                              .path=${mdiInformationOutline}
                            ></ha-svg-icon>
                            ${this.hass.localize(
                              "ui.dialogs.more_info_control.details"
                            )}
                          </ha-dropdown-item>
                        </ha-dropdown>
                      `
                    : !__DEMO__ && this._shouldShowAddEntityTo()
                      ? html`
                          <ha-icon-button
                            slot="headerActionItems"
                            .label=${addToMenuItem}
                            .path=${mdiPlusBoxMultipleOutline}
                            @click=${this._goToAddEntityTo}
                          ></ha-icon-button>
                        `
                      : nothing
                }
              `
            : this._currView === "details"
              ? html`
                  <ha-icon-button
                    slot="headerActionItems"
                    .label=${this.hass.localize(
                      "ui.dialogs.more_info_control.toggle_yaml_mode"
                    )}
                    .path=${mdiCodeBraces}
                    @click=${this._toggleDetailsYamlMode}
                  ></ha-icon-button>
                `
              : this._childView?.viewHeaderTag
                ? dynamicElement(this._childView.viewHeaderTag, {
                    slot: "headerActionItems",
                    hass: this.hass,
                    params: this._childView.viewParams,
                  })
                : nothing
        }
        <div
          class=${classMap({
            "content-wrapper": true,
            "settings-view": this._currView === "settings",
          })}
        >
          ${keyed(
            this._entityId,
            html`
              <div
                class="content ha-scrollbar"
                tabindex="-1"
                @entity-entry-updated=${this._entryUpdated}
                @toggle-edit-mode=${this._handleToggleInfoEditModeEvent}
                @hass-more-info=${this._handleMoreInfoEvent}
              >
                ${
                  this._currView === "settings"
                    ? html`
                        <div ?hidden=${!!this._childView}>
                          <ha-more-info-settings
                            .hass=${this.hass}
                            .entityId=${this._entityId}
                            .entry=${this._entry}
                          ></ha-more-info-settings>
                        </div>
                        ${childViewContent}
                      `
                    : cache(
                        this._childView
                          ? childViewContent
                          : this._currView === "info"
                            ? html`
                                <ha-more-info-info
                                  .hass=${this.hass}
                                  .entityId=${this._entityId}
                                  .entry=${this._entry}
                                  .editMode=${this._infoEditMode}
                                  .data=${this._data}
                                ></ha-more-info-info>
                              `
                            : this._currView === "history"
                              ? html`
                                  <ha-more-info-history-and-logbook
                                    .hass=${this.hass}
                                    .entityId=${this._entityId}
                                  ></ha-more-info-history-and-logbook>
                                `
                              : this._currView === "related"
                                ? html`
                                    <ha-more-info-related
                                      .hass=${this.hass}
                                      .entry=${this._entry}
                                      .params=${{ entityId }}
                                    ></ha-more-info-related>
                                  `
                                : this._currView === "add_to"
                                  ? html`
                                      <ha-more-info-add-to
                                        .entityId=${entityId}
                                        @add-to-action-selected=${this._goBack}
                                      ></ha-more-info-add-to>
                                    `
                                  : this._currView === "details"
                                    ? html`
                                        <ha-more-info-details
                                          .hass=${this.hass}
                                          .entry=${this._entry}
                                          .params=${{ entityId }}
                                          .yamlMode=${this._detailsYamlMode}
                                        ></ha-more-info-details>
                                      `
                                    : nothing
                      )
                }
              </div>
            `
          )}
          ${this.renderScrollableFades()}
        </div>
      </ha-adaptive-dialog>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    this.addEventListener("close-dialog", () => this.closeDialog());
    this.addEventListener("close-child-view", () => this._goBack());
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    const previousView = changedProps.get("_currView") as
      MoreInfoView | undefined;

    if (previousView === "settings" && this._currView !== "settings") {
      this._discardDirtyStateChanges();
    }

    if (previousView === "details" && this._currView !== "details") {
      const dialog =
        this._dialogElement?.shadowRoot?.querySelector("ha-dialog");
      if (dialog) {
        fireEvent(dialog as HTMLElement, "dialog-set-fullscreen", false);
      }
    }

    if (
      this._currView === "settings" &&
      this._entry &&
      ((changedProps.has("_currView") &&
        changedProps.get("_currView") !== "settings") ||
        (changedProps.has("_entry") && !changedProps.get("_entry")))
    ) {
      this._initDirtyTracking({ type: "deep" });
    }

    if (changedProps.has("_currView")) {
      this._infoEditMode = false;
      this._detailsYamlMode = false;
    }

    if (changedProps.has("_entityId")) {
      this._reportShownEntityToExternalApp(
        changedProps.get("_entityId") as string | null | undefined
      );
    }

    this._sendNativeHeader();
  }

  /**
   * Tells the app what its header should show now. Every update describes the
   * header anew (view changes, edit mode, a related entity), so only a changed
   * description goes over the bus.
   */
  private _sendNativeHeader() {
    const external = this.hass.auth.external;
    if (!external) {
      return;
    }
    const header = this._computeNativeHeader();
    if (!header) {
      return;
    }
    const serialized = JSON.stringify(header);
    if (serialized === this._sentNativeHeader) {
      return;
    }
    this._sentNativeHeader = serialized;
    external.fireMessage({ type: "more_info/header", payload: header });
  }

  private _reportShownEntityToExternalApp(
    previousEntityId: string | null | undefined
  ) {
    const external = this.hass.auth.external;
    // The external app opened the standalone page itself, so it already knows.
    if (!external || this.standalone) {
      return;
    }
    if (this._entityId) {
      external.fireMessage({
        type: "more_info/opened",
        payload: { entity_id: this._entityId },
      });
    } else if (previousEntityId) {
      external.fireMessage({
        type: "more_info/closed",
        payload: { entity_id: previousEntityId },
      });
    }
  }

  private _requestExternalClose() {
    if (!this._entityId) {
      return;
    }
    this.hass.auth.external?.fireMessage({
      type: "more_info/close",
      payload: { entity_id: this._entityId },
    });
  }

  private _entryUpdated(ev: CustomEvent<ExtEntityRegistryEntry>) {
    this._entry = ev.detail;
  }

  private _enlarge() {
    if (this.standalone) {
      return;
    }
    withViewTransition(() => {
      this._fill = !this._fill;
    });
  }

  private _handleOpened() {
    window.addEventListener("dialog-closed", this._enableEscapeKeyClose);
    window.addEventListener("show-dialog", this._disableEscapeKeyClose);
  }

  private _handleMoreInfoEvent(ev: HASSDomEvent<MoreInfoDialogParams>) {
    ev.stopPropagation();
    const entityId = ev.detail.entityId;
    if (!entityId) {
      return;
    }
    const view = ev.detail.view || ev.detail.tab || DEFAULT_VIEW;
    if (entityId === this._entityId) {
      this._infoEditMode = false;
      this._detailsYamlMode = false;
      this._setView(view);
      return;
    }
    this._parentEntityIds = [...this._parentEntityIds, this._entityId!];
    this._entityId = entityId;
    this._currView = view === "details" ? view : DEFAULT_VIEW;
    this._initialView = view;
    this._infoEditMode = false;
    this._detailsYamlMode = false;
    this._childViewStack = [];
    this._loadEntityRegistryEntry();
    this._syncUrl();
  }

  private _enableEscapeKeyClose = () => {
    this._isEscapeEnabled = true;
  };

  private _disableEscapeKeyClose = () => {
    this._isEscapeEnabled = false;
  };

  static get styles() {
    return [
      ...super.styles,
      haStyleDialog,
      haStyleDialogFixedTop,
      haStyleScrollbar,
      css`
        :host {
          --ha-bottom-sheet-height: calc(
            100vh - max(var(--safe-area-inset-top), 48px)
          );
          --ha-bottom-sheet-height: calc(
            100dvh - max(var(--safe-area-inset-top), 48px)
          );
          --ha-bottom-sheet-max-height: var(--ha-bottom-sheet-height);
        }

        ha-adaptive-dialog {
          --dialog-content-padding: 0;
        }

        .content-wrapper {
          flex: 1 1 auto;
          min-height: 0;
          position: relative;
          display: flex;
          flex-direction: column;
        }

        .content {
          outline: none;
          flex: 1;
          overflow: auto;
          /* Keep the content width constant when the scrollbar toggles;
             otherwise width-dependent content can flicker at the overflow
             threshold (#53228). */
          scrollbar-gutter: stable;
        }

        .content-wrapper.settings-view .fade-bottom {
          bottom: calc(
            var(--ha-space-14) +
              max(var(--safe-area-inset-bottom), var(--ha-space-4))
          );
        }

        ha-more-info-history-and-logbook {
          padding: var(--ha-space-2) 0 var(--ha-space-6) 0;
          display: block;
        }

        .title {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          margin: 0 0 calc(var(--ha-space-2) * -1) 0;
        }

        .title p {
          margin: 0;
          min-width: 0;
          width: 100%;
          text-overflow: ellipsis;
          overflow: hidden;
        }

        .title .main {
          color: var(--primary-text-color);
          font-size: var(--ha-font-size-xl);
          line-height: var(--ha-line-height-condensed);
        }

        .title .breadcrumb {
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-m);
          font-family: var(--ha-font-family-heading, inherit);
          line-height: 16px;
          --mdc-icon-size: 16px;
          padding: var(--ha-space-1);
          margin: calc(var(--ha-space-1) * -1);
          margin-top: calc(var(--ha-space-2) * -1);
          background: none;
          border: none;
          outline: none;
          display: inline;
          border-radius: var(--ha-border-radius-md);
          transition: background-color 180ms ease-in-out;
          min-width: 0;
          max-width: 100%;
          text-overflow: ellipsis;
          overflow: hidden;
          text-align: left;
        }

        .title button.breadcrumb {
          cursor: pointer;
        }

        .title button.breadcrumb:focus-visible,
        .title button.breadcrumb:hover {
          background-color: rgba(var(--rgb-secondary-text-color), 0.08);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-dialog": MoreInfoDialog;
  }
}
