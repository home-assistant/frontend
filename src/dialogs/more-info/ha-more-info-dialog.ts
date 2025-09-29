import {
  mdiChartBoxOutline,
  mdiClose,
  mdiCogOutline,
  mdiDevices,
  mdiDotsVertical,
  mdiInformationOutline,
  mdiPencil,
  mdiPencilOff,
  mdiPencilOutline,
  mdiTransitConnectionVariant,
} from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { cache } from "lit/directives/cache";
import { join } from "lit/directives/join";
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
import "../../components/ha-button-menu";
import "../../components/ha-wa-dialog";
import "../../components/ha-icon-button";
import "../../components/ha-icon-button-prev";
import "../../components/ha-list-item";
import "../../components/ha-related-items";
import type {
  EntityRegistryEntry,
  ExtEntityRegistryEntry,
} from "../../data/entity_registry";
import { getExtendedEntityRegistryEntry } from "../../data/entity_registry";
import { lightSupportsFavoriteColors } from "../../data/light";
import type { ItemType } from "../../data/search";
import { SearchableDomains } from "../../data/search";
import { getSensorNumericDeviceClasses } from "../../data/sensor";
import { haStyleDialog } from "../../resources/styles";
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
import "./ha-more-info-history-and-logbook";
import "./ha-more-info-info";
import "./ha-more-info-settings";
import "./more-info-content";

export interface MoreInfoDialogParams {
  entityId: string | null;
  view?: View;
  /** @deprecated Use `view` instead */
  tab?: View;
  data?: Record<string, any>;
}

type View = "info" | "history" | "settings" | "related";

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
export class MoreInfoDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _parentEntityIds: string[] = [];

  @state() private _entityId?: string | null;

  @state() private _data?: Record<string, any>;

  @state() private _currView: View = DEFAULT_VIEW;

  @state() private _initialView: View = DEFAULT_VIEW;

  @state() private _childView?: ChildView;

  @state() private _entry?: ExtEntityRegistryEntry | null;

  @state() private _infoEditMode = false;

  @state() private _isEscapeEnabled = true;

  @state() private _sensorNumericDeviceClasses?: string[] = [];

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
    this._entityId = undefined;
    this._parentEntityIds = [];
    this._entry = undefined;
    this._infoEditMode = false;
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
      this._childView = undefined;
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

  private _goToDevice(ev): void {
    if (!shouldHandleRequestSelectedEvent(ev)) return;
    const deviceId = this._getDeviceId();

    if (!deviceId) return;

    navigate(`/config/devices/device/${deviceId}`);
    this.closeDialog();
  }

  private _goToEdit(ev) {
    if (!shouldHandleRequestSelectedEvent(ev)) return;
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

  private _toggleInfoEditMode(ev) {
    if (!shouldHandleRequestSelectedEvent(ev)) return;
    this._infoEditMode = !this._infoEditMode;
  }

  private _handleToggleInfoEditModeEvent(ev) {
    this._infoEditMode = ev.detail;
  }

  private _goToRelated(ev): void {
    if (!shouldHandleRequestSelectedEvent(ev)) return;
    this._setView("related");
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
      (isDefaultView && this._parentEntityIds.length === 0) ||
      isSpecificInitialView;

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

    return html`
      <ha-wa-dialog
        open
        @closed=${this.closeDialog}
        @opened=${this._handleOpened}
        .backLabel=${this.hass.localize(
          "ui.dialogs.more_info_control.back_to_info"
        )}
        .backAction=${showCloseIcon ? undefined : this._goBack}
        .headerTitle=${title}
        .scrimDismissable=${this._isEscapeEnabled}
        .dialogSizeOnTitleClick=${"full"}
        flexContent
      >
        ${showCloseIcon
          ? html`
              <ha-icon-button
                slot="navigationIcon"
                data-dialog="close"
                .label=${this.hass.localize("ui.common.close")}
                .path=${mdiClose}
              ></ha-icon-button>
            `
          : html`
              <ha-icon-button-prev
                slot="navigationIcon"
                @click=${this._goBack}
                .label=${this.hass.localize(
                  "ui.dialogs.more_info_control.back_to_info"
                )}
              ></ha-icon-button-prev>
            `}
        <span slot="title" @click=${this._toggleSize} class="title">
          ${breadcrumb.length > 0
            ? !__DEMO__ && isAdmin
              ? html`
                  <button
                    class="breadcrumb"
                    @click=${this._breadcrumbClick}
                    aria-label=${breadcrumb.join(" > ")}
                  >
                    ${join(breadcrumb, html`<ha-icon-next></ha-icon-next>`)}
                  </button>
                `
              : html`
                  <p class="breadcrumb">
                    ${join(breadcrumb, html`<ha-icon-next></ha-icon-next>`)}
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
                      slot="actionItems"
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
                      slot="actionItems"
                      .label=${this.hass.localize(
                        "ui.dialogs.more_info_control.settings"
                      )}
                      .path=${mdiCogOutline}
                      @click=${this._goToSettings}
                    ></ha-icon-button>
                    <ha-button-menu
                      corner="BOTTOM_END"
                      menu-corner="END"
                      slot="actionItems"
                      @closed=${stopPropagation}
                      fixed
                    >
                      <ha-icon-button
                        slot="trigger"
                        .label=${this.hass.localize("ui.common.menu")}
                        .path=${mdiDotsVertical}
                      ></ha-icon-button>

                      ${deviceId
                        ? html`
                            <ha-list-item
                              graphic="icon"
                              @request-selected=${this._goToDevice}
                            >
                              ${this.hass.localize(
                                "ui.dialogs.more_info_control.device_or_service_info",
                                {
                                  type: this.hass.localize(
                                    `ui.dialogs.more_info_control.device_type.${deviceType}`
                                  ),
                                }
                              )}
                              <ha-svg-icon
                                slot="graphic"
                                .path=${deviceType === "service"
                                  ? mdiTransitConnectionVariant
                                  : mdiDevices}
                              ></ha-svg-icon>
                            </ha-list-item>
                          `
                        : nothing}
                      ${this._shouldShowEditIcon(domain, stateObj)
                        ? html`
                            <ha-list-item
                              graphic="icon"
                              @request-selected=${this._goToEdit}
                            >
                              ${this.hass.localize(
                                "ui.dialogs.more_info_control.edit"
                              )}
                              <ha-svg-icon
                                slot="graphic"
                                .path=${mdiPencilOutline}
                              ></ha-svg-icon>
                            </ha-list-item>
                          `
                        : nothing}
                      ${this._entry &&
                      stateObj &&
                      domain === "light" &&
                      lightSupportsFavoriteColors(stateObj)
                        ? html`
                            <ha-list-item
                              graphic="icon"
                              @request-selected=${this._toggleInfoEditMode}
                            >
                              ${this._infoEditMode
                                ? this.hass.localize(
                                    `ui.dialogs.more_info_control.exit_edit_mode`
                                  )
                                : this.hass.localize(
                                    `ui.dialogs.more_info_control.${domain}.edit_mode`
                                  )}
                              <ha-svg-icon
                                slot="graphic"
                                .path=${this._infoEditMode
                                  ? mdiPencilOff
                                  : mdiPencil}
                              ></ha-svg-icon>
                            </ha-list-item>
                          `
                        : nothing}
                      <ha-list-item
                        graphic="icon"
                        @request-selected=${this._goToRelated}
                      >
                        ${this.hass.localize(
                          "ui.dialogs.more_info_control.related"
                        )}
                        <ha-svg-icon
                          slot="graphic"
                          .path=${mdiInformationOutline}
                        ></ha-svg-icon>
                      </ha-list-item>
                    </ha-button-menu>
                  `
                : nothing}
            `
          : isSpecificInitialView
            ? html`
                <ha-button-menu
                  corner="BOTTOM_END"
                  menu-corner="END"
                  slot="actionItems"
                  @closed=${stopPropagation}
                  fixed
                >
                  <ha-icon-button
                    slot="trigger"
                    .label=${this.hass.localize("ui.common.menu")}
                    .path=${mdiDotsVertical}
                  ></ha-icon-button>

                  <ha-list-item
                    graphic="icon"
                    @request-selected=${this._resetInitialView}
                  >
                    ${this.hass.localize("ui.dialogs.more_info_control.info")}
                    <ha-svg-icon
                      slot="graphic"
                      .path=${mdiInformationOutline}
                    ></ha-svg-icon>
                  </ha-list-item>
                </ha-button-menu>
              `
            : nothing}
        ${keyed(
          this._entityId,
          html`
            <div
              class="content"
              tabindex="-1"
              dialogInitialFocus
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
                        })}
                      </div>
                    `
                  : this._currView === "info"
                    ? html`
                        <ha-more-info-info
                          dialogInitialFocus
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
                          : nothing
              )}
            </div>
          `
        )}
      </ha-wa-dialog>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this.addEventListener("close-dialog", () => this.closeDialog());
    this._loadNumericDeviceClasses();
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has("_currView")) {
      this._childView = undefined;
      this._infoEditMode = false;
    }
  }

  private _entryUpdated(ev: CustomEvent<ExtEntityRegistryEntry>) {
    this._entry = ev.detail;
  }

  private _toggleSize() {
    this.shadowRoot?.querySelector("ha-wa-dialog")?.toggleWidth();
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
      haStyleDialog,
      css`
        ha-wa-dialog {
          /* Set the top top of the dialog to a fixed position, so it doesnt jump when the content changes size */
          --vertical-align-dialog: flex-start;
          --dialog-surface-margin-top: max(
            40px,
            var(--safe-area-inset-top, 0px)
          );
          --dialog-content-padding: 0;
        }

        .content {
          display: flex;
          flex-direction: column;
          outline: none;
          flex: 1;
        }

        .child-view {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        ha-more-info-history-and-logbook {
          padding: 8px 24px 24px 24px;
          display: block;
        }

        @media all and (max-width: 450px), all and (max-height: 500px) {
          ha-wa-dialog {
            --dialog-surface-margin-top: var(--safe-area-inset-top, 0px);
          }
        }

        @media all and (min-width: 600px) and (min-height: 501px) {
          .main-title {
            cursor: default;
          }
        }

        .title {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
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
          padding: 4px;
          margin: -4px;
          margin-top: -10px;
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
