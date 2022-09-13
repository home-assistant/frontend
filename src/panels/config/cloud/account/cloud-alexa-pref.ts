import "@material/mwc-button";
import { mdiHelpCircle } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-alert";
import "../../../../components/ha-card";
import "../../../../components/ha-settings-row";
import "../../../../components/ha-switch";
import type { HaSwitch } from "../../../../components/ha-switch";
import { syncCloudAlexaEntities } from "../../../../data/alexa";
import { CloudStatusLoggedIn, updateCloudPref } from "../../../../data/cloud";
import type { HomeAssistant } from "../../../../types";

export class CloudAlexaPref extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public cloudStatus?: CloudStatusLoggedIn;

  @state() private _syncing = false;

  protected render(): TemplateResult {
    if (!this.cloudStatus) {
      return html``;
    }

    const alexa_registered = this.cloudStatus.alexa_registered;
    const { alexa_enabled, alexa_report_state } = this.cloudStatus!.prefs;

    return html`
      <ha-card
        outlined
        header=${this.hass!.localize(
          "ui.panel.config.cloud.account.alexa.title"
        )}
      >
        <div class="header-actions">
          <a
            href="https://www.nabucasa.com/config/amazon_alexa/"
            target="_blank"
            rel="noreferrer"
            class="icon-link"
          >
            <ha-icon-button
              .label=${this.hass.localize(
                "ui.panel.config.cloud.account.alexa.link_learn_how_it_works"
              )}
              .path=${mdiHelpCircle}
            ></ha-icon-button>
          </a>
          <ha-switch
            .checked=${alexa_enabled}
            @change=${this._enabledToggleChanged}
          ></ha-switch>
        </div>
        <div class="card-content">
          <p>
            ${this.hass!.localize("ui.panel.config.cloud.account.alexa.info")}
          </p>
          ${!alexa_enabled
            ? ""
            : !alexa_registered
            ? html`
                <ha-alert
                  .title=${this.hass.localize(
                    "ui.panel.config.cloud.account.alexa.not_configured_title"
                  )}
                >
                  ${this.hass.localize(
                    "ui.panel.config.cloud.account.alexa.not_configured_text"
                  )}

                  <ul>
                    <li>
                      <a
                        href="https://skills-store.amazon.com/deeplink/dp/B0772J1QKB?deviceType=app"
                        target="_blank"
                        rel="noreferrer"
                      >
                        ${this.hass!.localize(
                          "ui.panel.config.cloud.account.alexa.enable_ha_skill"
                        )}
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://www.nabucasa.com/config/amazon_alexa/"
                        target="_blank"
                        rel="noreferrer"
                      >
                        ${this.hass!.localize(
                          "ui.panel.config.cloud.account.alexa.config_documentation"
                        )}
                      </a>
                    </li>
                  </ul>
                </ha-alert>
              `
            : html`
                <ha-settings-row>
                  <span slot="heading">
                    ${this.hass!.localize(
                      "ui.panel.config.cloud.account.alexa.enable_state_reporting"
                    )}
                  </span>
                  <span slot="description">
                    ${this.hass!.localize(
                      "ui.panel.config.cloud.account.alexa.info_state_reporting"
                    )}
                  </span>
                  <ha-switch
                    .checked=${alexa_report_state}
                    @change=${this._reportToggleChanged}
                  ></ha-switch>
                </ha-settings-row>
                <ha-settings-row>
                  <span slot="heading">
                    ${this.hass!.localize(
                      "ui.panel.config.cloud.account.alexa.sync_entities"
                    )}
                  </span>
                  <span slot="description">
                    ${this.hass!.localize(
                      "ui.panel.config.cloud.account.alexa.info_sync_entities"
                    )}
                  </span>
                  <mwc-button
                    @click=${this._handleSync}
                    .disabled=${this._syncing}
                  >
                    ${this.hass!.localize(
                      "ui.panel.config.cloud.account.alexa.button_sync_entities"
                    )}
                  </mwc-button>
                </ha-settings-row>
              `}
        </div>
        <div class="card-actions">
          <a href="/config/cloud/alexa">
            <mwc-button
              >${this.hass!.localize(
                "ui.panel.config.cloud.account.alexa.manage_entities"
              )}</mwc-button
            >
          </a>
        </div>
      </ha-card>
    `;
  }

  private async _handleSync() {
    this._syncing = true;
    try {
      await syncCloudAlexaEntities(this.hass!);
    } catch (err: any) {
      alert(
        `${this.hass!.localize(
          "ui.panel.config.cloud.account.alexa.sync_entities_error"
        )} ${err.body.message}`
      );
    } finally {
      this._syncing = false;
    }
  }

  private async _enabledToggleChanged(ev) {
    const toggle = ev.target as HaSwitch;
    try {
      await updateCloudPref(this.hass!, { alexa_enabled: toggle.checked! });
      fireEvent(this, "ha-refresh-cloud-status");
    } catch (err: any) {
      toggle.checked = !toggle.checked;
    }
  }

  private async _reportToggleChanged(ev) {
    const toggle = ev.target as HaSwitch;
    try {
      await updateCloudPref(this.hass!, {
        alexa_report_state: toggle.checked!,
      });
      fireEvent(this, "ha-refresh-cloud-status");
    } catch (err: any) {
      alert(
        `${this.hass!.localize(
          "ui.panel.config.cloud.account.alexa.state_reporting_error",
          "enable_disable",
          this.hass!.localize(
            toggle.checked
              ? "ui.panel.config.cloud.account.alexa.enable"
              : "ui.panel.config.cloud.account.alexa.disable"
          )
        )} ${err.message}`
      );
      toggle.checked = !toggle.checked;
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      a {
        color: var(--primary-color);
      }
      .header-actions {
        position: absolute;
        right: 24px;
        top: 24px;
        display: flex;
        flex-direction: row;
      }
      :host([dir="rtl"]) .header-actions {
        right: auto;
        left: 24px;
      }
      .header-actions .icon-link {
        margin-top: -16px;
        margin-inline-end: 8px;
        margin-right: 8px;
        direction: var(--direction);
        color: var(--secondary-text-color);
      }
      ha-settings-row {
        padding: 0;
      }
      .card-actions {
        display: flex;
      }
      .card-actions a {
        text-decoration: none;
      }
      .spacer {
        flex-grow: 1;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-alexa-pref": CloudAlexaPref;
  }
}

customElements.define("cloud-alexa-pref", CloudAlexaPref);
