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
} from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { LitElement, PropertyValues, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { cache } from "lit/directives/cache";
import { dynamicElement } from "../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../common/dom/fire_event";
import { stopPropagation } from "../../common/dom/stop_propagation";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeStateName } from "../../common/entity/compute_state_name";
import { shouldHandleRequestSelectedEvent } from "../../common/mwc/handle-request-selected-event";
import { navigate } from "../../common/navigate";
import "../../components/ha-button-menu";
import "../../components/ha-dialog";
import "../../components/ha-dialog-header";
import "../../components/ha-icon-button";
import "../../components/ha-icon-button-prev";
import "../../components/ha-list-item";
import "../../components/ha-related-items";
import {
  EntityRegistryEntry,
  ExtEntityRegistryEntry,
  getExtendedEntityRegistryEntry,
} from "../../data/entity_registry";
import { lightSupportsFavoriteColors } from "../../data/light";
import { SearchableDomains } from "../../data/search";
import { haStyleDialog } from "../../resources/styles";
import "../../state-summary/state-card-content";
import { HomeAssistant } from "../../types";
import {
  DOMAINS_WITH_MORE_INFO,
  EDITABLE_DOMAINS_WITH_ID,
  EDITABLE_DOMAINS_WITH_UNIQUE_ID,
  computeShowHistoryComponent,
  computeShowLogBookComponent,
} from "./const";
import "./controls/more-info-default";
import "./ha-more-info-history-and-logbook";
import type { MoreInfoHistoryAndLogbook } from "./ha-more-info-history-and-logbook";
import "./ha-more-info-info";
import type { MoreInfoInfo } from "./ha-more-info-info";
import "./ha-more-info-settings";
import "./more-info-content";

export interface MoreInfoDialogParams {
  entityId: string | null;
  view?: View;
  /** @deprecated Use `view` instead */
  tab?: View;
}

type View = "info" | "history" | "settings" | "related";

type ChildView = {
  viewTag: string;
  viewTitle?: string;
  viewImport?: () => Promise<unknown>;
  viewParams?: any;
};

declare global {
  interface HASSDomEvents {
    "show-child-view": ChildView;
  }
  interface HASSDomEvents {
    "toggle-edit-mode": boolean;
  }
}

@customElement("ha-more-info-dialog")
export class MoreInfoDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public large = false;

  @state() private _entityId?: string | null;

  @state() private _currView: View = "info";

  @state() private _childView?: ChildView;

  @state() private _entry?: ExtEntityRegistryEntry | null;

  @state() private _infoEditMode = false;

  @query("ha-more-info-info, ha-more-info-history-and-logbook")
  private _history?: MoreInfoInfo | MoreInfoHistoryAndLogbook;

  public showDialog(params: MoreInfoDialogParams) {
    this._entityId = params.entityId;
    if (!this._entityId) {
      this.closeDialog();
      return;
    }
    this._currView = params.view || "info";
    this._childView = undefined;
    this.large = false;
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
    } catch (e) {
      this._entry = null;
    }
  }

  public closeDialog() {
    this._entityId = undefined;
    this._entry = undefined;
    this._childView = undefined;
    this._infoEditMode = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private shouldShowEditIcon(
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

  private shouldShowHistory(domain: string): boolean {
    return (
      DOMAINS_WITH_MORE_INFO.includes(domain) &&
      (computeShowHistoryComponent(this.hass, this._entityId!) ||
        computeShowLogBookComponent(this.hass, this._entityId!))
    );
  }

  private _getDeviceId(): string | null {
    const entity = this.hass.entities[this._entityId!] as
      | EntityRegistryEntry
      | undefined;
    return entity?.device_id ?? null;
  }

  private setView(view: View) {
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
    } else {
      this.setView("info");
    }
  }

  private _goToHistory() {
    this.setView("history");
  }

  private _goToSettings(): void {
    this.setView("settings");
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
    this.setView("related");
  }

  protected render() {
    if (!this._entityId) {
      return nothing;
    }
    const entityId = this._entityId;
    const stateObj = this.hass.states[entityId] as HassEntity | undefined;

    const domain = computeDomain(entityId);
    const name = (stateObj && computeStateName(stateObj)) || entityId;

    const isAdmin = this.hass.user!.is_admin;

    const deviceId = this._getDeviceId();

    const title = this._childView?.viewTitle ?? name;

    const isInfoView = this._currView === "info" && !this._childView;

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        @opened=${this._handleOpened}
        .heading=${title}
        hideActions
        flexContent
      >
        <ha-dialog-header slot="heading">
          ${isInfoView
            ? html`
                <ha-icon-button
                  slot="navigationIcon"
                  dialogAction="cancel"
                  .label=${this.hass.localize(
                    "ui.dialogs.more_info_control.dismiss"
                  )}
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
          <span slot="title" .title=${title} @click=${this._enlarge}>
            ${title}
          </span>
          ${isInfoView
            ? html`
                ${this.shouldShowHistory(domain)
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
                ${isAdmin
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
                        menuCorner="END"
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
                                  "ui.dialogs.more_info_control.device_info"
                                )}
                                <ha-svg-icon
                                  slot="graphic"
                                  .path=${mdiDevices}
                                ></ha-svg-icon>
                              </ha-list-item>
                            `
                          : nothing}
                        ${this.shouldShowEditIcon(domain, stateObj)
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
            : nothing}
        </ha-dialog-header>
        <div
          class="content"
          tabindex="-1"
          dialogInitialFocus
          @show-child-view=${this._showChildView}
          @entity-entry-updated=${this._entryUpdated}
          @toggle-edit-mode=${this._handleToggleInfoEditModeEvent}
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
                      ? domain
                      : "entity"}
                  ></ha-related-items>
                `
              : nothing
          )}
        </div>
      </ha-dialog>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this.addEventListener("close-dialog", () => this.closeDialog());
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

  private _enlarge() {
    this.large = !this.large;
  }

  private _handleOpened() {
    this._history?.resize({ aspectRatio: 2 });
  }

  static get styles() {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          /* Set the top top of the dialog to a fixed position, so it doesnt jump when the content changes size */
          --vertical-align-dialog: flex-start;
          --dialog-surface-margin-top: 40px;
          /* This is needed for the tooltip of the history charts to be positioned correctly */
          --dialog-surface-position: static;
          --dialog-content-position: static;
          --dialog-content-padding: 0;
          --chart-base-position: static;
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
          /* When in fullscreen dialog should be attached to top */
          ha-dialog {
            --dialog-surface-margin-top: 0px;
          }
        }

        @media all and (min-width: 600px) and (min-height: 501px) {
          ha-dialog {
            --mdc-dialog-min-width: 580px;
            --mdc-dialog-max-width: 580px;
            --mdc-dialog-max-height: calc(100% - 72px);
          }

          .main-title {
            cursor: default;
          }

          :host([large]) ha-dialog {
            --mdc-dialog-min-width: 90vw;
            --mdc-dialog-max-width: 90vw;
          }
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
