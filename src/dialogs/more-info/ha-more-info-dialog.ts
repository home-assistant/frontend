import "@material/mwc-button";
import "@material/mwc-icon-button";
import "../../components/ha-header-bar";
import "../../components/ha-dialog";
import "../../components/ha-svg-icon";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { DOMAINS_MORE_INFO_NO_HISTORY } from "../../common/const";
import { computeStateName } from "../../common/entity/compute_state_name";
import { navigate } from "../../common/navigate";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/state-history-charts";
import { removeEntityRegistryEntry } from "../../data/entity_registry";
import { showEntityEditorDialog } from "../../panels/config/entities/show-dialog-entity-editor";
import "../../state-summary/state-card-content";
import { showConfirmationDialog } from "../generic/show-dialog-box";
import "./more-info-content";
import {
  customElement,
  LitElement,
  property,
  internalProperty,
  css,
  html,
} from "lit-element";
import { haStyleDialog } from "../../resources/styles";
import { HomeAssistant } from "../../types";
import { getRecentWithCache } from "../../data/cached-history";
import { computeDomain } from "../../common/entity/compute_domain";
import { mdiClose, mdiCog, mdiPencil } from "@mdi/js";
import { HistoryResult } from "../../data/history";

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

  private _historyRefreshInterval?: number;

  public showDialog(params: MoreInfoDialogParams) {
    this._entityId = params.entityId;
    if (!this._entityId) {
      this.closeDialog();
    }
    this.large = false;
    this._stateHistory = undefined;
    if (this._computeShowHistoryComponent(this._entityId)) {
      this._getStateHistory();
      clearInterval(this._historyRefreshInterval);
      this._historyRefreshInterval = window.setInterval(() => {
        this._getStateHistory();
      }, 60 * 1000);
    }
  }

  public closeDialog() {
    this._entityId = undefined;
    this._stateHistory = undefined;
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
        <ha-header-bar slot="heading">
          <mwc-icon-button
            slot="navigationIcon"
            .label=${this.hass.localize("ui.dialogs.more_info_control.dismiss")}
            dialogAction="cancel"
          >
            <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
          </mwc-icon-button>
          <div slot="title" class="main-title" @click=${this._enlarge}>
            ${computeStateName(stateObj)}
          </div>
          ${this.hass.user!.is_admin
            ? html`<mwc-icon-button
                slot="actionItems"
                .label=${this.hass.localize(
                  "ui.dialogs.more_info_control.settings"
                )}
                @click=${this._gotoSettings}
              >
                <ha-svg-icon .path=${mdiCog}></ha-svg-icon>
              </mwc-icon-button>`
            : ""}
          ${this.hass.user!.is_admin &&
          ((EDITABLE_DOMAINS_WITH_ID.includes(domain) &&
            stateObj.attributes.id) ||
            EDITABLE_DOMAINS.includes(domain))
            ? html` <mwc-icon-button
                slot="actionItems"
                .label=${this.hass.localize(
                  "ui.dialogs.more_info_control.edit"
                )}
                @click=${this._gotoEdit}
              >
                <ha-svg-icon .path=${mdiPencil}></ha-svg-icon>
              </mwc-icon-button>`
            : ""}
        </ha-header-bar>
        <div class="content">
          ${DOMAINS_NO_INFO.includes(domain)
            ? ""
            : html`
                <state-card-content
                  .stateObj=${stateObj}
                  .hass=${this.hass}
                  in-dialog
                ></state-card-content>
              `}
          ${this._computeShowHistoryComponent(entityId)
            ? html`
                <state-history-charts
                  .hass=${this.hass}
                  .historyData=${this._stateHistory}
                  up-to-now
                  .isLoadingData=${!this._stateHistory}
                ></state-history-charts>
              `
            : ""}
          <more-info-content
            .stateObj=${stateObj}
            .hass=${this.hass}
          ></more-info-content>

          ${stateObj.attributes.restored
            ? html`<p>
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
                </mwc-button>`
            : ""}
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
          --mdc-theme-primary: var(--card-background-color);
          flex-shrink: 0;
          border-bottom: 1px solid
            var(--mdc-dialog-scroll-divider-color, rgba(0, 0, 0, 0.12));
        }

        @media all and (max-width: 450px), all and (max-height: 500px) {
          ha-header-bar {
            --mdc-theme-primary: var(--app-header-background-color);
            --mdc-theme-on-primary: var(--app-header-text-color, white);
            border-bottom: none;
          }
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

        state-history-charts {
          margin-top: 16px 0;
        }

        ha-dialog[data-domain="camera"] {
          --dialog-content-padding: 0;
        }
      `,
    ];
  }
}
