import "@material/mwc-button";
import "@material/mwc-list/mwc-list-item";
import "@polymer/paper-item/paper-item-body";
import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { formatDateTime } from "../../../../common/datetime/format_date_time";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeRTLDirection } from "../../../../common/util/compute_rtl";
import { debounce } from "../../../../common/util/debounce";
import "../../../../components/ha-alert";
import "../../../../components/ha-card";
import "../../../../components/ha-tip";
import {
  cloudLogout,
  CloudStatusLoggedIn,
  fetchCloudSubscriptionInfo,
  SubscriptionInfo,
} from "../../../../data/cloud";
import { showConfirmationDialog } from "../../../../dialogs/generic/show-dialog-box";
import "../../../../layouts/hass-subpage";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import { haStyle } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import "../../ha-config-section";
import "./cloud-remote-pref";
import "./cloud-tts-pref";
import "./cloud-webhooks";

@customElement("cloud-account")
export class CloudAccount extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public cloudStatus!: CloudStatusLoggedIn;

  @state() private _subscription?: SubscriptionInfo;

  @state() private _rtlDirection: "rtl" | "ltr" = "rtl";

  protected render() {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        header="Home Assistant Cloud"
      >
        <div class="content">
          <ha-config-section .isWide=${this.isWide}>
            <span slot="header">Home Assistant Cloud</span>
            <div slot="introduction">
              <p>
                ${this.hass.localize(
                  "ui.panel.config.cloud.account.thank_you_note"
                )}
              </p>
            </div>

            <ha-card
              outlined
              .header=${this.hass.localize(
                "ui.panel.config.cloud.account.nabu_casa_account"
              )}
            >
              <div class="account-row">
                <paper-item-body two-line>
                  ${this.cloudStatus.email.replace(
                    /(\w{3})[\w.-]+@([\w.]+\w)/,
                    "$1***@$2"
                  )}
                  <div secondary class="wrap">
                    ${this._subscription
                      ? this._subscription.human_description.replace(
                          "{periodEnd}",
                          this._subscription.plan_renewal_date
                            ? formatDateTime(
                                new Date(
                                  this._subscription.plan_renewal_date * 1000
                                ),
                                this.hass.locale,
                                this.hass.config
                              )
                            : ""
                        )
                      : this.hass.localize(
                          "ui.panel.config.cloud.account.fetching_subscription"
                        )}
                  </div>
                </paper-item-body>
              </div>

              ${this.cloudStatus.cloud === "connecting" &&
              this.cloudStatus.cloud_last_disconnect_reason
                ? html`
                    <ha-alert
                      alert-type="warning"
                      .title=${this.cloudStatus.cloud_last_disconnect_reason
                        .reason}
                    ></ha-alert>
                  `
                : ""}

              <div class="account-row">
                <paper-item-body>
                  ${this.hass.localize(
                    "ui.panel.config.cloud.account.connection_status"
                  )}
                </paper-item-body>
                <div class="status">
                  ${this.cloudStatus.cloud === "connected"
                    ? this.hass.localize(
                        "ui.panel.config.cloud.account.connected"
                      )
                    : this.cloudStatus.cloud === "disconnected"
                    ? this.hass.localize(
                        "ui.panel.config.cloud.account.not_connected"
                      )
                    : this.hass.localize(
                        "ui.panel.config.cloud.account.connecting"
                      )}
                </div>
              </div>

              <div class="card-actions">
                <a
                  href="https://account.nabucasa.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  <mwc-button>
                    ${this.hass.localize(
                      "ui.panel.config.cloud.account.manage_account"
                    )}
                  </mwc-button>
                </a>
                <mwc-button @click=${this._signOut} class="warning">
                  ${this.hass.localize(
                    "ui.panel.config.cloud.account.sign_out"
                  )}
                </mwc-button>
              </div>
            </ha-card>
          </ha-config-section>

          <ha-config-section .isWide=${this.isWide}>
            <span slot="header"
              >${this.hass.localize(
                "ui.panel.config.cloud.account.integrations"
              )}</span
            >
            <div slot="introduction">
              <p>
                ${this.hass.localize(
                  "ui.panel.config.cloud.account.integrations_introduction"
                )}
              </p>
              <p>
                ${this.hass.localize(
                  "ui.panel.config.cloud.account.integrations_introduction2"
                )}
                <a
                  href="https://www.nabucasa.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  ${this.hass.localize(
                    "ui.panel.config.cloud.account.integrations_link_all_features"
                  )}</a
                >.
              </p>
            </div>

            <cloud-remote-pref
              .hass=${this.hass}
              .cloudStatus=${this.cloudStatus}
              dir=${this._rtlDirection}
            ></cloud-remote-pref>

            <cloud-tts-pref
              .hass=${this.hass}
              .cloudStatus=${this.cloudStatus}
              dir=${this._rtlDirection}
            ></cloud-tts-pref>

            <ha-tip .hass=${this.hass}>
              <a href="/config/voice-assistants">
                ${this.hass.localize(
                  "ui.panel.config.cloud.account.tip_moved_voice_assistants"
                )}
              </a>
            </ha-tip>

            <cloud-webhooks
              .hass=${this.hass}
              .narrow=${this.narrow}
              .cloudStatus=${this.cloudStatus}
              dir=${this._rtlDirection}
            ></cloud-webhooks>
          </ha-config-section>
        </div>
      </hass-subpage>
    `;
  }

  firstUpdated() {
    this._fetchSubscriptionInfo();
  }

  protected updated(changedProps: PropertyValues) {
    if (changedProps.has("hass")) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      if (!oldHass || oldHass.locale !== this.hass.locale) {
        this._rtlDirection = computeRTLDirection(this.hass);
      }
    }
  }

  protected override hassSubscribe() {
    const googleCheck = debounce(
      () => {
        if (this.cloudStatus && !this.cloudStatus.google_registered) {
          fireEvent(this, "ha-refresh-cloud-status");
        }
      },
      10000,
      true
    );
    return [
      this.hass.connection.subscribeEvents(() => {
        if (!this.cloudStatus?.alexa_registered) {
          fireEvent(this, "ha-refresh-cloud-status");
        }
      }, "alexa_smart_home"),
      this.hass.connection.subscribeEvents(
        googleCheck,
        "google_assistant_command"
      ),
      this.hass.connection.subscribeEvents(
        googleCheck,
        "google_assistant_query"
      ),
      this.hass.connection.subscribeEvents(
        googleCheck,
        "google_assistant_sync"
      ),
    ];
  }

  private async _fetchSubscriptionInfo() {
    this._subscription = await fetchCloudSubscriptionInfo(this.hass);
    if (
      this._subscription.provider &&
      this.cloudStatus &&
      this.cloudStatus.cloud !== "connected"
    ) {
      fireEvent(this, "ha-refresh-cloud-status");
    }
  }

  private async _signOut() {
    showConfirmationDialog(this, {
      text: this.hass.localize(
        "ui.panel.config.cloud.account.sign_out_confirm"
      ),
      confirmText: this.hass!.localize("ui.common.yes"),
      dismissText: this.hass!.localize("ui.common.no"),
      confirm: () => this._logoutFromCloud(),
    });
  }

  private async _logoutFromCloud() {
    await cloudLogout(this.hass);
    fireEvent(this, "ha-refresh-cloud-status");
  }

  _computeRTLDirection(hass) {
    return computeRTLDirection(hass);
  }

  static get styles() {
    return [
      haStyle,
      css`
        [slot="introduction"] {
          margin: -1em 0;
        }
        [slot="introduction"] a {
          color: var(--primary-color);
        }
        .content {
          padding-bottom: 24px;
        }
        .account-row {
          display: flex;
          padding: 0 16px;
        }
        .card-actions {
          display: flex;
          flex-direction: row-reverse;
          justify-content: space-between;
        }
        mwc-button {
          align-self: center;
        }
        .wrap {
          white-space: normal;
        }
        .status {
          text-transform: capitalize;
          padding: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-account": CloudAccount;
  }
}
