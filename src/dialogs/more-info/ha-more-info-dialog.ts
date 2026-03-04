import {
  mdiChartBoxOutline,
  mdiClose,
  mdiCodeBraces,
  mdiCogOutline,
  mdiDevices,
  mdiDotsVertical,
  mdiFormatListBulletedSquare,
  mdiInformationOutline,
  mdiPencil,
  mdiPencilOff,
  mdiPencilOutline,
  mdiPlusBoxMultipleOutline,
  mdiTransitConnectionVariant,
} from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { cache } from "lit/directives/cache";
import { classMap } from "lit/directives/class-map";
import { keyed } from "lit/directives/keyed";
import { dynamicElement } from "../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../common/dom/fire_event";
import { stopPropagation } from "../../common/dom/stop_propagation";
import { computeAreaName } from "../../common/entity/compute_area_name";
import { computeDeviceName } from "../../common/entity/compute_device_name";
import { computeDomain } from "../../common/entity/compute_domain";
import {
  computeEntityEntryName,
  computeEntityName,
} from "../../common/entity/compute_entity_name";
import {
  getEntityContext,
  getEntityEntryContext,
} from "../../common/entity/context/get_entity_context";
import { shouldHandleRequestSelectedEvent } from "../../common/mwc/handle-request-selected-event";
import { navigate } from "../../common/navigate";
import { computeRTL } from "../../common/util/compute_rtl";
import { withViewTransition } from "../../common/util/view-transition";
import "../../components/ha-adaptive-dialog";
import "../../components/ha-dropdown";
import type { HaDropdownSelectEvent } from "../../components/ha-dropdown";
import "../../components/ha-dropdown-item";
import "../../components/ha-icon-button";
import "../../components/ha-icon-button-prev";
import "../../components/ha-related-items";
import type {
  EntityRegistryEntry,
  ExtEntityRegistryEntry,
} from "../../data/entity/entity_registry";
import { getExtendedEntityRegistryEntry } from "../../data/entity/entity_registry";
import { lightSupportsFavoriteColors } from "../../data/light";
import type { ItemType } from "../../data/search";
import { SearchableDomains } from "../../data/search";
import { getSensorNumericDeviceClasses } from "../../data/sensor";
import { ScrollableFadeMixin } from "../../mixins/scrollable-fade-mixin";
import {
  haStyleDialog,
  haStyleDialogFixedTop,
  haStyleScrollbar,
} from "../../resources/styles";
import "../../state-summary/state-card-content";
import type { HomeAssistant } from "../../types";
import {
  DOMAINS_WITH_MORE_INFO,
  EDITABLE_DOMAINS_WITH_ID,
  EDITABLE_DOMAINS_WITH_UNIQUE_ID,
  computeShowHistoryComponent,
  computeShowLogBookComponent,
} from "./const";
import "./controls/more-info-default";
import "./ha-more-info-add-to";
import "./ha-more-info-history-and-logbook";
import "./ha-more-info-info";
import "./ha-more-info-settings";
import "./more-info-content";

export interface MoreInfoDialogParams {
  entityId: string | null;
  view?: View;
  /** @deprecated Use `view` instead */
  tab?: View;
  large?: boolean;
  data?: Record<string, any>;
  parentElement?: LitElement;
}

type View = "info" | "history" | "settings" | "related" | "add_to";

interface ChildView {
  viewTag: string;
  viewTitle?: string;
  viewImport?: () => Promise<unknown>;
  viewParams?: any;
}

declare global {
  interface HASSDomEvents {
    "show-child-view": ChildView;
  }
  interface HASSDomEvents {
    "toggle-edit-mode": boolean;
  }
}

const DEFAULT_VIEW: View = "info";

@customElement("ha-more-info-dialog")
export class MoreInfoDialog extends ScrollableFadeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public large = false;

  @state() private _fill = false;

  @state() private _open = false;

  @state() private _parentEntityIds: string[] = [];

  @query(".content") private _contentElement?: HTMLDivElement;

  @query("ha-adaptive-dialog") private _dialogElement?: HTMLElement;

  @state() private _entityId?: string | null;

  @state() private _data?: Record<string, any>;

  @state() private _currView: View = DEFAULT_VIEW;

  @state() private _initialView: View = DEFAULT_VIEW;

  @state() private _childView?: ChildView;

  @state() private _entry?: ExtEntityRegistryEntry | null;

  @state() private _infoEditMode = false;

  @state() private _detailsYamlMode = false;

  @state() private _isEscapeEnabled = true;

  @state() private _sensorNumericDeviceClasses?: string[] = [];

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

    this._data = params.data;
    this._currView = params.view || DEFAULT_VIEW;
    this._initialView = params.view || DEFAULT_VIEW;
    this._childView = undefined;
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
    const dialog = this._dialogElement?.shadowRoot?.querySelector("ha-dialog");
    if (dialog) {
      fireEvent(dialog as HTMLElement, "dialog-set-fullscreen", false);
    }
    this._open = false;
  }

  private _dialogClosed() {
    this._entityId = undefined;
    this._parentEntityIds = [];
    this._entry = undefined;
    this._infoEditMode = false;
    this._detailsYamlMode = false;
    this._initialView = DEFAULT_VIEW;
    this._currView = DEFAULT_VIEW;
    this._childView = undefined;
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
        computeShowLogBookComponent(
          this.hass,
          this._entityId!,
          this._sensorNumericDeviceClasses
        ))
    );
  }

  private _shouldShowAddEntityTo(): boolean {
    return !!this.hass.auth.external?.config.hasEntityAddTo;
  }

  private _getDeviceId(): string | null {
    const entity = this.hass.entities[this._entityId!] as
      | EntityRegistryEntry
      | undefined;
    return entity?.device_id ?? null;
  }

  private _setView(view: View) {
    history.replaceState(
      {
        ...history.state,
        dialogParams: {
          ...history.state?.dialogParams,
          view,
        },
      },
      ""
    );
    this._currView = view;
  }

  private _goBack() {
    if (this._childView) {
      const dialog =
        this._dialogElement?.shadowRoot?.querySelector("ha-dialog");
      if (dialog) {
        fireEvent(dialog as HTMLElement, "dialog-set-fullscreen", false);
      }
      this._childView = undefined;
      this._detailsYamlMode = false;
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
    const view = ev.detail as ChildView;
    if (view.viewImport) {
      view.viewImport();
    }
    this._childView = view;
  }

  private _goToDevice(): void {
    const deviceId = this._getDeviceId();
    if (!deviceId) return;
    navigate(`/config/devices/device/${deviceId}`);
    this.closeDialog();
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

    navigate(`/config/${domain}/edit/${idToPassThroughUrl}`);
    this.closeDialog();
  }

  private _toggleInfoEditMode() {
    this._infoEditMode = !this._infoEditMode;
  }

  private _toggleDetailsYamlMode() {
    const dialog = this._dialogElement?.shadowRoot?.querySelector("ha-dialog");
    if (dialog) {
      fireEvent(dialog as HTMLElement, "dialog-set-fullscreen", false);
    }
    this._detailsYamlMode = !this._detailsYamlMode;
  }

  private _handleToggleInfoEditModeEvent(ev) {
    this._infoEditMode = ev.detail;
  }

  private _goToRelated(): void {
    this._setView("related");
  }

  private _handleMenuAction(ev: HaDropdownSelectEvent) {
    const action = ev.detail?.item?.value;
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
        this._showDetails();
        break;
    }
  }

  private _showDetails(): void {
    import("./ha-more-info-details");
    this._childView = {
      viewTag: "ha-more-info-details",
      viewTitle: this.hass.localize("ui.dialogs.more_info_control.details"),
      viewParams: { entityId: this._entityId },
    };
  }

  private _goToAddEntityTo(ev) {
    // Only check for request-selected events (from menu items), not regular clicks (from icon button)
    if (ev.type === "request-selected" && !shouldHandleRequestSelectedEvent(ev))
      return;
    this._setView("add_to");
  }

  private _breadcrumbClick(ev: Event) {
    ev.stopPropagation();
    this._setView("related");
  }

  private async _loadNumericDeviceClasses() {
    const deviceClasses = await getSensorNumericDeviceClasses(this.hass);
    this._sensorNumericDeviceClasses = deviceClasses.numeric_device_classes;
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

    const isDefaultView = this._currView === DEFAULT_VIEW && !this._childView;
    const isSpecificInitialView =
      this._initialView !== DEFAULT_VIEW && !this._childView;
    const showCloseIcon =
      (isDefaultView &&
        this._parentEntityIds.length === 0 &&
        !this._childView) ||
      (isSpecificInitialView && !this._childView);

    const context = stateObj
      ? getEntityContext(
          stateObj,
          this.hass.entities,
          this.hass.devices,
          this.hass.areas,
          this.hass.floors
        )
      : this._entry
        ? getEntityEntryContext(
            this._entry,
            this.hass.entities,
            this.hass.devices,
            this.hass.areas,
            this.hass.floors
          )
        : undefined;

    const entityName = stateObj
      ? computeEntityName(stateObj, this.hass.entities, this.hass.devices)
      : this._entry
        ? computeEntityEntryName(this._entry, this.hass.devices)
        : entityId;

    const deviceName = context?.device
      ? computeDeviceName(context.device)
      : undefined;
    const areaName = context?.area ? computeAreaName(context.area) : undefined;

    const breadcrumb = [areaName, deviceName, entityName].filter(
      (v): v is string => Boolean(v)
    );
    const title = this._childView?.viewTitle || breadcrumb.pop() || entityId;

    const isRTL = computeRTL(this.hass);

    return html`
      <ha-adaptive-dialog
        .hass=${this.hass}
        .open=${this._open}
        .width=${this._fill ? "full" : this.large ? "large" : "medium"}
        @closed=${this._dialogClosed}
        @opened=${this._handleOpened}
        ?prevent-scrim-close=${!this._isEscapeEnabled}
        flexcontent
      >
        ${showCloseIcon
          ? html`
              <ha-icon-button
                slot="headerNavigationIcon"
                @click=${this.closeDialog}
                .label=${this.hass.localize("ui.common.close")}
                .path=${mdiClose}
              ></ha-icon-button>
            `
          : html`
              <ha-icon-button-prev
                slot="headerNavigationIcon"
                @click=${this._goBack}
                .label=${this.hass.localize(
                  "ui.dialogs.more_info_control.back_to_info"
                )}
              ></ha-icon-button-prev>
            `}
        <span slot="headerTitle" @click=${this._enlarge} class="title">
          ${breadcrumb.length > 0
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
            : nothing}
          <p class="main">${title}</p>
        </span>
        ${isDefaultView
          ? html`
              ${this._shouldShowHistory(domain)
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
                : nothing}
              ${!__DEMO__ && isAdmin
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

                      ${deviceId
                        ? html`
                            <ha-dropdown-item value="device">
                              <ha-svg-icon
                                slot="icon"
                                .path=${deviceType === "service"
                                  ? mdiTransitConnectionVariant
                                  : mdiDevices}
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
                        : nothing}
                      ${this._shouldShowEditIcon(domain, stateObj)
                        ? html`
                            <ha-dropdown-item value="edit">
                              <ha-svg-icon
                                slot="icon"
                                .path=${mdiPencilOutline}
                              ></ha-svg-icon>
                              ${this.hass.localize(
                                "ui.dialogs.more_info_control.edit"
                              )}
                            </ha-dropdown-item>
                          `
                        : nothing}
                      ${this._entry &&
                      stateObj &&
                      domain === "light" &&
                      lightSupportsFavoriteColors(stateObj)
                        ? html`
                            <ha-dropdown-item value="toggle_edit">
                              <ha-svg-icon
                                slot="icon"
                                .path=${this._infoEditMode
                                  ? mdiPencilOff
                                  : mdiPencil}
                              ></ha-svg-icon>
                              ${this._infoEditMode
                                ? this.hass.localize(
                                    `ui.dialogs.more_info_control.exit_edit_mode`
                                  )
                                : this.hass.localize(
                                    `ui.dialogs.more_info_control.${domain}.edit_mode`
                                  )}
                            </ha-dropdown-item>
                          `
                        : nothing}
                      <ha-dropdown-item value="related">
                        <ha-svg-icon
                          slot="icon"
                          .path=${mdiInformationOutline}
                        ></ha-svg-icon>
                        ${this.hass.localize(
                          "ui.dialogs.more_info_control.related"
                        )}
                      </ha-dropdown-item>
                      <ha-dropdown-item value="details">
                        <ha-svg-icon
                          slot="icon"
                          .path=${mdiFormatListBulletedSquare}
                        ></ha-svg-icon>
                        ${this.hass.localize(
                          "ui.dialogs.more_info_control.details"
                        )}
                      </ha-dropdown-item>
                      ${this._shouldShowAddEntityTo()
                        ? html`
                            <ha-dropdown-item value="add_to">
                              <ha-svg-icon
                                slot="icon"
                                .path=${mdiPlusBoxMultipleOutline}
                              ></ha-svg-icon>
                              ${this.hass.localize(
                                "ui.dialogs.more_info_control.add_entity_to"
                              )}
                            </ha-dropdown-item>
                          `
                        : nothing}
                    </ha-dropdown>
                  `
                : !__DEMO__ && this._shouldShowAddEntityTo()
                  ? html`
                      <ha-icon-button
                        slot="headerActionItems"
                        .label=${this.hass.localize(
                          "ui.dialogs.more_info_control.add_entity_to"
                        )}
                        .path=${mdiPlusBoxMultipleOutline}
                        @click=${this._goToAddEntityTo}
                      ></ha-icon-button>
                    `
                  : nothing}
            `
          : isSpecificInitialView
            ? html`
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

                  <ha-dropdown-item value="info">
                    <ha-svg-icon slot="icon" .path=${mdiInformationOutline}>
                    </ha-svg-icon>
                    ${this.hass.localize("ui.dialogs.more_info_control.info")}
                  </ha-dropdown-item>
                </ha-dropdown>
              `
            : this._childView?.viewTag === "ha-more-info-details"
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
              : nothing}
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
                @show-child-view=${this._showChildView}
                @entity-entry-updated=${this._entryUpdated}
                @toggle-edit-mode=${this._handleToggleInfoEditModeEvent}
                @hass-more-info=${this._handleMoreInfoEvent}
              >
                ${cache(
                  this._childView
                    ? html`
                        <div class="child-view">
                          ${dynamicElement(this._childView.viewTag, {
                            hass: this.hass,
                            entry: this._entry,
                            params: this._childView.viewParams,
                            yamlMode: this._detailsYamlMode,
                          })}
                        </div>
                      `
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
                        : this._currView === "settings"
                          ? html`
                              <ha-more-info-settings
                                .hass=${this.hass}
                                .entityId=${this._entityId}
                                .entry=${this._entry}
                              ></ha-more-info-settings>
                            `
                          : this._currView === "related"
                            ? html`
                                <ha-related-items
                                  .hass=${this.hass}
                                  .itemId=${entityId}
                                  .itemType=${SearchableDomains.has(domain)
                                    ? (domain as ItemType)
                                    : "entity"}
                                ></ha-related-items>
                              `
                            : this._currView === "add_to"
                              ? html`
                                  <ha-more-info-add-to
                                    .hass=${this.hass}
                                    .entityId=${entityId}
                                    @add-to-action-selected=${this._goBack}
                                  ></ha-more-info-add-to>
                                `
                              : nothing
                )}
              </div>
            `
          )}
          ${this.renderScrollableFades()}
        </div>
      </ha-adaptive-dialog>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this.addEventListener("close-dialog", () => this.closeDialog());
    this._loadNumericDeviceClasses();
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    const previousChildView = changedProps.get("_childView") as
      | ChildView
      | undefined;

    if (
      previousChildView?.viewTag === "ha-more-info-details" &&
      this._childView?.viewTag !== "ha-more-info-details"
    ) {
      const dialog =
        this._dialogElement?.shadowRoot?.querySelector("ha-dialog");
      if (dialog) {
        fireEvent(dialog as HTMLElement, "dialog-set-fullscreen", false);
      }
    }

    if (changedProps.has("_currView")) {
      this._childView = undefined;
      this._infoEditMode = false;
      this._detailsYamlMode = false;
    }
  }

  private _entryUpdated(ev: CustomEvent<ExtEntityRegistryEntry>) {
    this._entry = ev.detail;
  }

  private _enlarge() {
    withViewTransition(() => {
      this._fill = !this._fill;
    });
  }

  private _handleOpened() {
    window.addEventListener("dialog-closed", this._enableEscapeKeyClose);
    window.addEventListener("show-dialog", this._disableEscapeKeyClose);
  }

  private _handleMoreInfoEvent(ev) {
    ev.stopPropagation();
    const entityId = ev.detail.entityId;
    if (!entityId) {
      return;
    }
    this._parentEntityIds = [...this._parentEntityIds, this._entityId!];
    this._entityId = entityId;
    this._currView = DEFAULT_VIEW;
    this._childView = undefined;
    this._loadEntityRegistryEntry();
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
        }

        .content-wrapper.settings-view .fade-bottom {
          bottom: calc(
            var(--ha-space-14) +
              max(var(--safe-area-inset-bottom), var(--ha-space-4))
          );
        }

        .child-view {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        ha-more-info-history-and-logbook {
          padding: var(--ha-space-2) var(--ha-space-6) var(--ha-space-6)
            var(--ha-space-6);
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
