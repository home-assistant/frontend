import type { HassEntity } from "home-assistant-js-websocket";
import "@material/mwc-button";
import "@material/mwc-tab";
import "@material/mwc-tab-bar";
import { mdiClose, mdiPencil } from "@mdi/js";
import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { cache } from "lit/directives/cache";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeStateName } from "../../common/entity/compute_state_name";
import { navigate } from "../../common/navigate";
import "../../components/ha-dialog";
import "../../components/ha-header-bar";
import "../../components/ha-icon-button";
import "../../components/ha-related-items";
import { haStyleDialog } from "../../resources/styles";
import "../../state-summary/state-card-content";
import { HomeAssistant } from "../../types";
import {
  EDITABLE_DOMAINS_WITH_ID,
  EDITABLE_DOMAINS,
  DOMAINS_WITH_MORE_INFO,
  computeShowHistoryComponent,
  computeShowLogBookComponent,
} from "./const";
import "./controls/more-info-default";
import "./ha-more-info-info";
import "./ha-more-info-settings";
import "./ha-more-info-history-and-logbook";
import "./more-info-content";

export interface MoreInfoDialogParams {
  entityId: string | null;
  tab?: Tab;
}

type Tab = "info" | "history" | "settings" | "related";

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
    if (EDITABLE_DOMAINS.includes(domain)) {
      return true;
    }
    if (domain === "person" && stateObj.attributes.editable !== "false") {
      return true;
    }

    return false;
  }

  protected render() {
    if (!this._entityId) {
      return html``;
    }
    const entityId = this._entityId;
    const stateObj = this.hass.states[entityId];

    const domain = computeDomain(entityId);
    const name = stateObj ? computeStateName(stateObj) : entityId;
    const tabs = this._getTabs(entityId, this.hass.user!.is_admin);

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
            <ha-icon-button
              slot="navigationIcon"
              dialogAction="cancel"
              .label=${this.hass.localize(
                "ui.dialogs.more_info_control.dismiss"
              )}
              .path=${mdiClose}
            ></ha-icon-button>
            <div
              slot="title"
              class="main-title"
              .title=${name}
              @click=${this._enlarge}
            >
              ${name}
            </div>
            ${this.shouldShowEditIcon(domain, stateObj)
              ? html`
                  <ha-icon-button
                    slot="actionItems"
                    .label=${this.hass.localize(
                      "ui.dialogs.more_info_control.edit"
                    )}
                    .path=${mdiPencil}
                    @click=${this._gotoEdit}
                  ></ha-icon-button>
                `
              : ""}
          </ha-header-bar>

          ${tabs.length > 1
            ? html`
                <mwc-tab-bar
                  .activeIndex=${tabs.indexOf(this._currTab)}
                  @MDCTabBar:activated=${this._handleTabChanged}
                >
                  ${tabs.map(
                    (tab) => html`
                      <mwc-tab
                        .label=${this.hass.localize(
                          `ui.dialogs.more_info_control.${tab}`
                        )}
                      ></mwc-tab>
                    `
                  )}
                </mwc-tab-bar>
              `
            : ""}
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
              : html`
                  <ha-related-items
                    class="content"
                    .hass=${this.hass}
                    .itemId=${entityId}
                    itemType="entity"
                  ></ha-related-items>
                `
          )}
        </div>
      </ha-dialog>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this.addEventListener("close-dialog", () => this.closeDialog());
  }

  protected willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (!this._entityId) {
      return;
    }
    const tabs = this._getTabs(this._entityId, this.hass.user!.is_admin);
    if (!tabs.includes(this._currTab)) {
      this._currTab = tabs[0];
    }
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has("_currTab")) {
      this.setAttribute("tab", this._currTab);
    }
  }

  private _getTabs(entityId: string, isAdmin: boolean): Tab[] {
    const domain = computeDomain(entityId);
    const tabs: Tab[] = ["info"];

    // Info and history are combined in info when there are no
    // dedicated more-info controls. If not combined, add a history tab.
    if (
      DOMAINS_WITH_MORE_INFO.includes(domain) &&
      (computeShowHistoryComponent(this.hass, entityId) ||
        computeShowLogBookComponent(this.hass, entityId))
    ) {
      tabs.push("history");
    }

    if (isAdmin) {
      tabs.push("settings");
      tabs.push("related");
    }

    return tabs;
  }

  private _enlarge() {
    this.large = !this.large;
  }

  private _gotoEdit() {
    const stateObj = this.hass.states[this._entityId!];
    const domain = computeDomain(this._entityId!);
    let idToPassThroughUrl = stateObj.entity_id;
    if (EDITABLE_DOMAINS_WITH_ID.includes(domain) || domain === "person") {
      idToPassThroughUrl = stateObj.attributes.id;
    }

    navigate(`/config/${domain}/edit/${idToPassThroughUrl}`);
    this.closeDialog();
  }

  private _handleTabChanged(ev: CustomEvent): void {
    const newTab = this._getTabs(this._entityId!, this.hass.user!.is_admin)[
      ev.detail.index
    ];
    if (newTab === this._currTab) {
      return;
    }

    this._currTab = newTab;
  }

  static get styles() {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-surface-position: static;
          --dialog-content-position: static;
          --vertial-align-dialog: flex-start;
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

        :host([tab="settings"]) ha-dialog {
          --dialog-content-padding: 0px;
        }

        @media all and (min-width: 600px) and (min-height: 501px) {
          ha-dialog {
            --mdc-dialog-min-width: 560px;
            --mdc-dialog-max-width: 560px;
            --dialog-surface-margin-top: 40px;
            --mdc-dialog-max-height: calc(100% - 72px);
          }

          .main-title {
            overflow: hidden;
            text-overflow: ellipsis;
            cursor: default;
          }

          :host([large]) ha-dialog,
          ha-dialog[data-domain="camera"] {
            --mdc-dialog-min-width: 90vw;
            --mdc-dialog-max-width: 90vw;
          }
        }

        ha-dialog[data-domain="camera"] {
          --dialog-content-padding: 0;
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
