import {
  mdiChartBoxOutline,
  mdiClose,
  mdiCogOutline,
  mdiDevices,
  mdiDotsVertical,
  mdiPencilOutline,
  mdiSofaOutline,
} from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { cache } from "lit/directives/cache";
import { fireEvent } from "../../common/dom/fire_event";
import { stopPropagation } from "../../common/dom/stop_propagation";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeStateName } from "../../common/entity/compute_state_name";
import { shouldHandleRequestSelectedEvent } from "../../common/mwc/handle-request-selected-event";
import { navigate } from "../../common/navigate";
import "../../components/ha-button-menu";
import "../../components/ha-dialog";
import "../../components/ha-header-bar";
import "../../components/ha-icon-button";
import "../../components/ha-icon-button-prev";
import "../../components/ha-list-item";
import { DeviceRegistryEntry } from "../../data/device_registry";
import { EntityRegistryEntry } from "../../data/entity_registry";
import { haStyleDialog } from "../../resources/styles";
import "../../state-summary/state-card-content";
import { HomeAssistant } from "../../types";
import {
  computeShowHistoryComponent,
  computeShowLogBookComponent,
  DOMAINS_WITH_MORE_INFO,
  EDITABLE_DOMAINS_WITH_ID,
  EDITABLE_DOMAINS_WITH_UNIQUE_ID,
} from "./const";
import "./controls/more-info-default";
import "./ha-more-info-history-and-logbook";
import "./ha-more-info-info";
import "./ha-more-info-settings";
import "./more-info-content";

export interface MoreInfoDialogParams {
  entityId: string | null;
  tab?: Tab;
}

type Tab = "info" | "history" | "settings";

@customElement("ha-more-info-dialog")
export class MoreInfoDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public large = false;

  @state() private _entityId?: string | null;

  @state() private _currTab: Tab = "info";

  public showDialog(params: MoreInfoDialogParams) {
    this._entityId = params.entityId;
    if (!this._entityId) {
      this.closeDialog();
      return;
    }
    this._currTab = params.tab || "info";
    this.large = false;
  }

  public closeDialog() {
    this._entityId = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected shouldShowEditIcon(
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

  protected shouldShowHistory(domain: string): boolean {
    return (
      DOMAINS_WITH_MORE_INFO.includes(domain) &&
      (computeShowHistoryComponent(this.hass, this._entityId!) ||
        computeShowLogBookComponent(this.hass, this._entityId!))
    );
  }

  protected _getDeviceId(): string | null {
    const entity = this.hass.entities[this._entityId!] as
      | EntityRegistryEntry
      | undefined;
    return entity?.device_id ?? null;
  }

  protected _getAreaId(): string | null {
    const entity = this.hass.entities[this._entityId!] as
      | EntityRegistryEntry
      | undefined;
    if (!entity) return null;

    if (entity.area_id) return entity.area_id;

    if (!entity.device_id) return null;

    const device = this.hass.devices[entity.device_id] as
      | DeviceRegistryEntry
      | undefined;

    return device?.area_id ?? null;
  }

  private back() {
    this._currTab = "info";
  }

  private _goToHistory() {
    this._currTab = "history";
  }

  private _goToSettings(ev): void {
    if (!shouldHandleRequestSelectedEvent(ev)) return;
    this._currTab = "settings";
  }

  private _goToDevice(ev): void {
    if (!shouldHandleRequestSelectedEvent(ev)) return;
    const deviceId = this._getDeviceId();

    if (!deviceId) return;

    navigate(`/config/devices/device/${deviceId}`);
    this.closeDialog();
  }

  private _goToArea(ev): void {
    if (!shouldHandleRequestSelectedEvent(ev)) return;
    const areaId = this._getAreaId();

    if (!areaId) return;

    navigate(`/config/areas/area/${areaId}`);
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
      idToPassThroughUrl = this.hass.entities[this._entityId!].unique_id;
    }

    navigate(`/config/${domain}/edit/${idToPassThroughUrl}`);
    this.closeDialog();
  }

  protected render() {
    if (!this._entityId) {
      return null;
    }
    const entityId = this._entityId;
    const stateObj = this.hass.states[entityId];

    const domain = computeDomain(entityId);
    const name = (stateObj && computeStateName(stateObj)) || entityId;

    const isAdmin = this.hass.user!.is_admin;

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${name}
        hideActions
        data-domain=${domain}
      >
        <div slot="heading" class="heading">
          <ha-header-bar>
            ${this._currTab === "info"
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
                    @click=${this.back}
                    .label=${this.hass.localize(
                      "ui.dialogs.more_info_control.dismiss"
                    )}
                  ></ha-icon-button-prev>
                `}
            <div
              slot="title"
              class="main-title"
              .title=${name}
              @click=${this._enlarge}
            >
              ${name}
            </div>
            ${this._currTab === "info"
              ? html`
                  ${this.shouldShowHistory(domain)
                    ? html`
                        <ha-icon-button
                          slot="actionItems"
                          .label=${"History"}
                          .path=${mdiChartBoxOutline}
                          @click=${this._goToHistory}
                        ></ha-icon-button>
                      `
                    : null}
                  ${isAdmin
                    ? html`<ha-button-menu
                        corner="BOTTOM_END"
                        menuCorner="END"
                        slot="actionItems"
                        @closed=${stopPropagation}
                      >
                        <ha-icon-button
                          slot="trigger"
                          .label=${this.hass.localize("ui.common.menu")}
                          .path=${mdiDotsVertical}
                        ></ha-icon-button>

                        <ha-list-item
                          graphic="icon"
                          @request-selected=${this._goToSettings}
                        >
                          Settings
                          <ha-svg-icon
                            slot="graphic"
                            .path=${mdiCogOutline}
                          ></ha-svg-icon>
                        </ha-list-item>
                        ${this._getDeviceId()
                          ? html`
                              <ha-list-item
                                graphic="icon"
                                @request-selected=${this._goToDevice}
                              >
                                Device info
                                <ha-svg-icon
                                  slot="graphic"
                                  .path=${mdiDevices}
                                ></ha-svg-icon>
                              </ha-list-item>
                            `
                          : null}
                        ${this._getAreaId()
                          ? html`
                              <ha-list-item
                                graphic="icon"
                                @request-selected=${this._goToArea}
                              >
                                Area overview
                                <ha-svg-icon
                                  slot="graphic"
                                  .path=${mdiSofaOutline}
                                ></ha-svg-icon>
                              </ha-list-item>
                            `
                          : null}
                        ${this.shouldShowEditIcon(domain, stateObj)
                          ? html`
                              <ha-list-item
                                graphic="icon"
                                @request-selected=${this._goToEdit}
                              >
                                Edit
                                <ha-svg-icon
                                  slot="graphic"
                                  .path=${mdiPencilOutline}
                                ></ha-svg-icon>
                              </ha-list-item>
                            `
                          : null}
                      </ha-button-menu>`
                    : null}
                `
              : null}
          </ha-header-bar>
        </div>

        <div class="content" tabindex="-1" dialogInitialFocus>
          ${cache(
            this._currTab === "info"
              ? html`
                  <ha-more-info-info
                    .hass=${this.hass}
                    .entityId=${this._entityId}
                  ></ha-more-info-info>
                `
              : this._currTab === "history"
              ? html`
                  <ha-more-info-history-and-logbook
                    .hass=${this.hass}
                    .entityId=${this._entityId}
                  ></ha-more-info-history-and-logbook>
                `
              : this._currTab === "settings"
              ? html`
                  <ha-more-info-settings
                    .hass=${this.hass}
                    .entityId=${this._entityId}
                  ></ha-more-info-settings>
                `
              : null
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
    if (changedProps.has("_currTab")) {
      this.setAttribute("tab", this._currTab);
    }
  }

  private _enlarge() {
    this.large = !this.large;
  }

  static get styles() {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-surface-position: static;
          --dialog-content-position: static;
          --vertical-align-dialog: flex-start;
          --dialog-content-padding: 0;
          --content-padding: 24px;
        }

        ha-header-bar {
          --mdc-theme-on-primary: var(--primary-text-color);
          --mdc-theme-primary: var(--mdc-theme-surface);
          flex-shrink: 0;
          display: block;
        }
        .content {
          outline: none;
        }
        @media all and (max-width: 450px), all and (max-height: 500px) {
          ha-header-bar {
            --mdc-theme-primary: var(--app-header-background-color);
            --mdc-theme-on-primary: var(--app-header-text-color, white);
            border-bottom: none;
          }
        }

        .heading {
          border-bottom: 1px solid
            var(--mdc-dialog-scroll-divider-color, rgba(0, 0, 0, 0.12));
        }

        ha-dialog .content {
          padding: var(--content-padding);
        }

        :host([tab="settings"]) ha-dialog {
          --content-padding: 0;
        }

        :host([tab="info"]) ha-dialog[data-domain="camera"] {
          --content-padding: 0;
          /* max height of the video is full screen, minus the height of the header of the dialog and the padding of the dialog (mdc-dialog-max-height: calc(100% - 72px)) */
          --video-max-height: calc(100vh - 113px - 72px);
        }

        @media all and (min-width: 600px) and (min-height: 501px) {
          ha-dialog {
            --mdc-dialog-min-width: 560px;
            --mdc-dialog-max-width: 580px;
            --dialog-surface-margin-top: 40px;
            --mdc-dialog-max-height: calc(100% - 72px);
          }

          .main-title {
            overflow: hidden;
            text-overflow: ellipsis;
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
