import "@material/mwc-button";
import "@material/mwc-icon-button";
import "@material/mwc-tab";
import "@material/mwc-tab-bar";
import { mdiClose, mdiCog, mdiPencil } from "@mdi/js";
import {
  css,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
} from "lit-element";
import { styleMap } from "lit-html/directives/style-map";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { DOMAINS_MORE_INFO_NO_HISTORY } from "../../common/const";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeStateName } from "../../common/entity/compute_state_name";
import { navigate } from "../../common/navigate";
import "../../components/ha-dialog";
import "../../components/ha-header-bar";
import "../../components/ha-svg-icon";
import "../../components/state-history-charts";
import { getRecentWithCache } from "../../data/cached-history";
import { removeEntityRegistryEntry } from "../../data/entity_registry";
import { HistoryResult } from "../../data/history";
import { getLogbookData, LogbookEntry } from "../../data/logbook";
import { fetchPersons } from "../../data/person";
import { fetchUsers } from "../../data/user";
import { showEntityEditorDialog } from "../../panels/config/entities/show-dialog-entity-editor";
import "../../panels/logbook/ha-logbook";
import { haStyleDialog } from "../../resources/styles";
import "../../state-summary/state-card-content";
import { HomeAssistant } from "../../types";
import { showConfirmationDialog } from "../generic/show-dialog-box";
import "./more-info-content";

const DOMAINS_NO_INFO = ["camera", "configurator"];
const EDITABLE_DOMAINS_WITH_ID = ["scene", "automation"];
const EDITABLE_DOMAINS = ["script"];

export interface MoreInfoDialogParams {
  entityId: string | null;
}

@customElement("ha-more-info-dialog")
export class MoreInfoDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public large = false;

  @internalProperty() private _stateHistory?: HistoryResult;

  @internalProperty() private _entityId?: string | null;

  @internalProperty() private _currTabIndex = 0;

  @internalProperty() private _entries: LogbookEntry[] = [];

  @internalProperty() private _userIdToName = {};

  @internalProperty() private _isLoading = false;

  private _fetchUserDone?: Promise<unknown>;

  private _historyRefreshInterval?: number;

  public showDialog(params: MoreInfoDialogParams) {
    this._entityId = params.entityId;
    if (!this._entityId) {
      this.closeDialog();
    }
    this.large = false;
    this._stateHistory = undefined;
    if (this._computeShowHistoryComponent(this._entityId)) {
      this._fetchUserDone = this._fetchUserNames();
      this._getStateHistory();
      this._getLogBookData();
      clearInterval(this._historyRefreshInterval);
      this._historyRefreshInterval = window.setInterval(() => {
        this._getStateHistory();
      }, 60 * 1000);
    }
  }

  public closeDialog() {
    this._entityId = undefined;
    this._stateHistory = undefined;
    this._currTabIndex = 0;
    this._entries = [];
    this._userIdToName = {};
    clearInterval(this._historyRefreshInterval);
    this._historyRefreshInterval = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._entityId) {
      return html``;
    }
    const entityId = this._entityId;
    const stateObj = this.hass.states[entityId];
    const domain = computeDomain(entityId);

    if (!stateObj) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${true}
        hideActions
        data-domain=${domain}
      >
        <div slot="heading">
          <ha-header-bar>
            <mwc-icon-button
              slot="navigationIcon"
              dialogAction="cancel"
              .label=${this.hass.localize(
                "ui.dialogs.more_info_control.dismiss"
              )}
            >
              <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
            </mwc-icon-button>
            <div slot="title" class="main-title" @click=${this._enlarge}>
              ${computeStateName(stateObj)}
            </div>
            ${this.hass.user!.is_admin
              ? html`
                  <mwc-icon-button
                    slot="actionItems"
                    .label=${this.hass.localize(
                      "ui.dialogs.more_info_control.settings"
                    )}
                    @click=${this._gotoSettings}
                  >
                    <ha-svg-icon .path=${mdiCog}></ha-svg-icon>
                  </mwc-icon-button>
                `
              : ""}
            ${this.hass.user!.is_admin &&
            ((EDITABLE_DOMAINS_WITH_ID.includes(domain) &&
              stateObj.attributes.id) ||
              EDITABLE_DOMAINS.includes(domain))
              ? html`
                  <mwc-icon-button
                    slot="actionItems"
                    .label=${this.hass.localize(
                      "ui.dialogs.more_info_control.edit"
                    )}
                    @click=${this._gotoEdit}
                  >
                    <ha-svg-icon .path=${mdiPencil}></ha-svg-icon>
                  </mwc-icon-button>
                `
              : ""}
          </ha-header-bar>
          <mwc-tab-bar
            .activeIndex=${this._currTabIndex}
            @MDCTabBar:activated=${this._handleTabChanged}
          >
            <mwc-tab
              .label=${this.hass.localize(
                "ui.dialogs.more_info_control.controls"
              )}
            ></mwc-tab>
            <mwc-tab
              .label=${this.hass.localize(
                "ui.dialogs.more_info_control.history"
              )}
            ></mwc-tab>
          </mwc-tab-bar>
        </div>
        <div class="content">
          ${this._currTabIndex === 0
            ? html`
                ${DOMAINS_NO_INFO.includes(domain)
                  ? ""
                  : html`
                      <state-card-content
                        in-dialog
                        .stateObj=${stateObj}
                        .hass=${this.hass}
                      ></state-card-content>
                    `}
                <more-info-content
                  .stateObj=${stateObj}
                  .hass=${this.hass}
                ></more-info-content>
                ${stateObj.attributes.restored
                  ? html`
                      <p>
                        ${this.hass.localize(
                          "ui.dialogs.more_info_control.restored.not_provided"
                        )}
                      </p>
                      <p>
                        ${this.hass.localize(
                          "ui.dialogs.more_info_control.restored.remove_intro"
                        )}
                      </p>
                      <mwc-button class="warning" @click=${this._removeEntity}>
                        ${this.hass.localize(
                          "ui.dialogs.more_info_control.restored.remove_action"
                        )}
                      </mwc-button>
                    `
                  : ""}
              `
            : html`
                ${this._computeShowHistoryComponent(entityId)
                  ? html`
                      <state-history-charts
                        up-to-now
                        .hass=${this.hass}
                        .historyData=${this._stateHistory}
                        .isLoadingData=${!this._stateHistory}
                      ></state-history-charts>
                      ${this._isLoading
                        ? html`
                            <div class="progress-wrapper">
                              <ha-circular-progress
                                active
                                alt=${this.hass.localize("ui.common.loading")}
                              ></ha-circular-progress>
                            </div>
                          `
                        : html`
                            <ha-logbook
                              style=${styleMap({
                                height: `${this._entries.length * 72}px`,
                              })}
                              .hass=${this.hass}
                              .entries=${this._entries}
                              .userIdToName=${this._userIdToName}
                            ></ha-logbook>
                          `}
                    `
                  : ""}
              `}
        </div>
      </ha-dialog>
    `;
  }

  private _enlarge() {
    this.large = !this.large;
  }

  private async _getStateHistory(): Promise<void> {
    if (!this._entityId) {
      return;
    }
    this._stateHistory = await getRecentWithCache(
      this.hass!,
      this._entityId,
      {
        refresh: 60,
        cacheKey: `more_info.${this._entityId}`,
        hoursToShow: 24,
      },
      this.hass!.localize,
      this.hass!.language
    );
  }

  private async _getLogBookData() {
    if (!this._entityId) {
      return;
    }
    this._isLoading = true;

    const yesterday = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
    const now = new Date();
    const [entries] = await Promise.all([
      getLogbookData(
        this.hass,
        yesterday.toISOString(),
        now.toISOString(),
        this._entityId
      ),
      this._fetchUserDone,
    ]);

    this._entries = entries.slice(0, 5);
    this._isLoading = false;
  }

  private async _fetchUserNames() {
    const userIdToName = {};

    // Start loading all the data
    const personProm = fetchPersons(this.hass);
    const userProm = this.hass.user!.is_admin && fetchUsers(this.hass);

    // Process persons
    const persons = await personProm;

    for (const person of persons.storage) {
      if (person.user_id) {
        userIdToName[person.user_id] = person.name;
      }
    }
    for (const person of persons.config) {
      if (person.user_id) {
        userIdToName[person.user_id] = person.name;
      }
    }

    // Process users
    if (userProm) {
      const users = await userProm;
      for (const user of users) {
        if (!(user.id in userIdToName)) {
          userIdToName[user.id] = user.name;
        }
      }
    }

    this._userIdToName = userIdToName;
  }

  private _computeShowHistoryComponent(entityId) {
    return (
      isComponentLoaded(this.hass, "history") &&
      !DOMAINS_MORE_INFO_NO_HISTORY.includes(computeDomain(entityId))
    );
  }

  private _removeEntity() {
    const entityId = this._entityId!;
    showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.dialogs.more_info_control.restored.confirm_remove_title"
      ),
      text: this.hass.localize(
        "ui.dialogs.more_info_control.restored.confirm_remove_text"
      ),
      confirmText: this.hass.localize("ui.common.yes"),
      dismissText: this.hass.localize("ui.common.no"),
      confirm: () => {
        removeEntityRegistryEntry(this.hass, entityId);
      },
    });
  }

  private _gotoSettings() {
    showEntityEditorDialog(this, {
      entity_id: this._entityId!,
    });
    this.closeDialog();
  }

  private _gotoEdit() {
    const stateObj = this.hass.states[this._entityId!];
    const domain = computeDomain(this._entityId!);
    navigate(
      this,
      `/config/${domain}/edit/${
        EDITABLE_DOMAINS_WITH_ID.includes(domain)
          ? stateObj.attributes.id
          : stateObj.entity_id
      }`
    );
    this.closeDialog();
  }

  private _handleTabChanged(ev: CustomEvent): void {
    const newTab = ev.detail.index;
    if (newTab === this._currTabIndex) {
      return;
    }

    this._currTabIndex = ev.detail.index;
  }

  static get styles() {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-surface-position: static;
          --dialog-content-position: static;
        }

        ha-header-bar {
          --mdc-theme-on-primary: var(--primary-text-color);
          --mdc-theme-primary: var(--mdc-theme-surface);
          flex-shrink: 0;
        }

        @media all and (max-width: 450px), all and (max-height: 500px) {
          ha-header-bar {
            --mdc-theme-primary: var(--app-header-background-color);
            --mdc-theme-on-primary: var(--app-header-text-color, white);
            border-bottom: none;
          }
        }

        mwc-tab-bar {
          border-bottom: 1px solid
            var(--mdc-dialog-scroll-divider-color, rgba(0, 0, 0, 0.12));
        }

        .progress-wrapper {
          height: 50px;
        }

        @media all and (min-width: 451px) and (min-height: 501px) {
          ha-dialog {
            --mdc-dialog-max-width: 90vw;
          }

          .content {
            width: 352px;
          }

          ha-header-bar {
            width: 400px;
          }

          .main-title {
            overflow: hidden;
            text-overflow: ellipsis;
            cursor: default;
          }

          ha-dialog[data-domain="camera"] .content,
          ha-dialog[data-domain="camera"] ha-header-bar {
            width: auto;
          }

          :host([large]) .content {
            width: calc(90vw - 48px);
          }

          :host([large]) ha-dialog[data-domain="camera"] .content,
          :host([large]) ha-header-bar {
            width: 90vw;
          }
        }

        ha-dialog[data-domain="camera"] {
          --dialog-content-padding: 0;
        }

        state-card-content,
        state-history-charts {
          display: block;
          margin-bottom: 16px;
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
