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
import { cache } from "lit-html/directives/cache";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import {
  DOMAINS_MORE_INFO_NO_HISTORY,
  DOMAINS_WITH_MORE_INFO,
} from "../../common/const";
import { dynamicElement } from "../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeStateName } from "../../common/entity/compute_state_name";
import { stateMoreInfoType } from "../../common/entity/state_more_info_type";
import { navigate } from "../../common/navigate";
import "../../components/ha-dialog";
import "../../components/ha-header-bar";
import "../../components/ha-svg-icon";
import { removeEntityRegistryEntry } from "../../data/entity_registry";
import { showEntityEditorDialog } from "../../panels/config/entities/show-dialog-entity-editor";
import { haStyleDialog } from "../../resources/styles";
import "../../state-summary/state-card-content";
import { HomeAssistant } from "../../types";
import { showConfirmationDialog } from "../generic/show-dialog-box";
import "./ha-more-info-history";
import "./ha-more-info-logbook";

const DOMAINS_NO_INFO = ["camera", "configurator"];
const EDITABLE_DOMAINS_WITH_ID = ["scene", "automation"];
const EDITABLE_DOMAINS = ["script"];

const MORE_INFO_CONTROL_IMPORT = {
  alarm_control_panel: () => import("./controls/more-info-alarm_control_panel"),
  automation: () => import("./controls/more-info-automation"),
  camera: () => import("./controls/more-info-camera"),
  climate: () => import("./controls/more-info-climate"),
  configurator: () => import("./controls/more-info-configurator"),
  counter: () => import("./controls/more-info-counter"),
  cover: () => import("./controls/more-info-cover"),
  fan: () => import("./controls/more-info-fan"),
  group: () => import("./controls/more-info-group"),
  humidifier: () => import("./controls/more-info-humidifier"),
  input_datetime: () => import("./controls/more-info-input_datetime"),
  light: () => import("./controls/more-info-light"),
  lock: () => import("./controls/more-info-lock"),
  media_player: () => import("./controls/more-info-media_player"),
  person: () => import("./controls/more-info-person"),
  script: () => import("./controls/more-info-script"),
  sun: () => import("./controls/more-info-sun"),
  timer: () => import("./controls/more-info-timer"),
  vacuum: () => import("./controls/more-info-vacuum"),
  water_heater: () => import("./controls/more-info-water_heater"),
  weather: () => import("./controls/more-info-weather"),
  hidden: () => {},
  default: () => import("./controls/more-info-default"),
};

export interface MoreInfoDialogParams {
  entityId: string | null;
}

@customElement("ha-more-info-dialog")
export class MoreInfoDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public large = false;

  @internalProperty() private _entityId?: string | null;

  @internalProperty() private _moreInfoType?: string;

  @internalProperty() private _currTabIndex = 0;

  public showDialog(params: MoreInfoDialogParams) {
    this._entityId = params.entityId;
    if (!this._entityId) {
      this.closeDialog();
    }
    this.large = false;
  }

  public closeDialog() {
    this._entityId = undefined;
    this._currTabIndex = 0;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected updated(changedProperties) {
    if (!this.hass || !this._entityId || !changedProperties.has("_entityId")) {
      return;
    }
    const stateObj = this.hass.states[this._entityId];
    if (!stateObj) {
      return;
    }
    if (stateObj.attributes && "custom_ui_more_info" in stateObj.attributes) {
      this._moreInfoType = stateObj.attributes.custom_ui_more_info;
    } else {
      const type = stateMoreInfoType(stateObj);
      this._moreInfoType = `more-info-${type}`;
      MORE_INFO_CONTROL_IMPORT[type]();
    }
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
        <div slot="heading" class="heading">
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
          ${DOMAINS_WITH_MORE_INFO.includes(domain) &&
          this._computeShowHistoryComponent(entityId)
            ? html`
                <mwc-tab-bar
                  .activeIndex=${this._currTabIndex}
                  @MDCTabBar:activated=${this._handleTabChanged}
                >
                  <mwc-tab
                    .label=${this.hass.localize(
                      "ui.dialogs.more_info_control.details"
                    )}
                  ></mwc-tab>
                  <mwc-tab
                    .label=${this.hass.localize(
                      "ui.dialogs.more_info_control.history"
                    )}
                  ></mwc-tab>
                </mwc-tab-bar>
              `
            : ""}
        </div>
        <div class="content">
          ${cache(
            this._currTabIndex === 0
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
                  ${DOMAINS_WITH_MORE_INFO.includes(domain) ||
                  !this._computeShowHistoryComponent(entityId)
                    ? ""
                    : html`<ha-more-info-history
                          .hass=${this.hass}
                          .entityId=${this._entityId}
                        ></ha-more-info-history>
                        <ha-more-info-logbook
                          .hass=${this.hass}
                          .entityId=${this._entityId}
                        ></ha-more-info-logbook>`}
                  ${this._moreInfoType
                    ? dynamicElement(this._moreInfoType, {
                        hass: this.hass,
                        stateObj,
                      })
                    : ""}
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
                        <mwc-button
                          class="warning"
                          @click=${this._removeEntity}
                        >
                          ${this.hass.localize(
                            "ui.dialogs.more_info_control.restored.remove_action"
                          )}
                        </mwc-button>
                      `
                    : ""}
                `
              : html`
                  <ha-more-info-history
                    .hass=${this.hass}
                    .entityId=${this._entityId}
                  ></ha-more-info-history>
                  <ha-more-info-logbook
                    .hass=${this.hass}
                    .entityId=${this._entityId}
                  ></ha-more-info-logbook>
                `
          )}
        </div>
      </ha-dialog>
    `;
  }

  private _enlarge() {
    this.large = !this.large;
  }

  private _computeShowHistoryComponent(entityId) {
    return (
      (isComponentLoaded(this.hass, "history") ||
        isComponentLoaded(this.hass, "logbook")) &&
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
          display: block;
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
        ha-more-info-history,
        ha-more-info-logbook:not(:last-child) {
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
