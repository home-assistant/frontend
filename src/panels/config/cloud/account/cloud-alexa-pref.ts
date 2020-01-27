import {
  html,
  LitElement,
  TemplateResult,
  CSSResult,
  css,
  property,
} from "lit-element";
import "@material/mwc-button";

import "../../../../components/ha-card";
import "../../../../components/ha-switch";

// tslint:disable-next-line: no-duplicate-imports
import { HaSwitch } from "../../../../components/ha-switch";
import { fireEvent } from "../../../../common/dom/fire_event";
import { HomeAssistant } from "../../../../types";
import { CloudStatusLoggedIn, updateCloudPref } from "../../../../data/cloud";
import { syncCloudAlexaEntities } from "../../../../data/alexa";

export class CloudAlexaPref extends LitElement {
  @property() public hass?: HomeAssistant;
  @property() public cloudStatus?: CloudStatusLoggedIn;
  @property() private _syncing = false;

  protected render(): TemplateResult {
    if (!this.cloudStatus) {
      return html``;
    }

    const { alexa_enabled, alexa_report_state } = this.cloudStatus!.prefs;

    return html`
      <ha-card
        header=${this.hass!.localize(
          "ui.panel.config.cloud.account.alexa.title"
        )}
      >
        <div class="switch">
          <ha-switch
            .checked=${alexa_enabled}
            @change=${this._enabledToggleChanged}
          ></ha-switch>
        </div>
        <div class="card-content">
          ${this.hass!.localize("ui.panel.config.cloud.account.alexa.info")}
          <ul>
            <li>
              <a
                href="https://skills-store.amazon.com/deeplink/dp/B0772J1QKB?deviceType=app"
                target="_blank"
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
              >
                ${this.hass!.localize(
                  "ui.panel.config.cloud.account.alexa.config_documentation"
                )}
              </a>
            </li>
          </ul>
          ${alexa_enabled
            ? html`
                <div class="state-reporting">
                  <h3>
                    ${this.hass!.localize(
                      "ui.panel.config.cloud.account.alexa.enable_state_reporting"
                    )}
                  </h3>
                  <div class="state-reporting-switch">
                    <ha-switch
                      .checked=${alexa_report_state}
                      @change=${this._reportToggleChanged}
                    ></ha-switch>
                  </div>
                </div>
                <p>
                  ${this.hass!.localize(
                    "ui.panel.config.cloud.account.alexa.info_state_reporting"
                  )}
                </p>
              `
            : ""}
        </div>
        <div class="card-actions">
          <mwc-button @click=${this._handleSync} .disabled=${this._syncing}>
            ${this.hass!.localize(
              "ui.panel.config.cloud.account.alexa.sync_entities"
            )}
          </mwc-button>
          <div class="spacer"></div>
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
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

  static get styles(): CSSResult {
    return css`
      a {
        color: var(--primary-color);
      }
      .switch {
        position: absolute;
        right: 24px;
        top: 32px;
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
      .state-reporting {
        display: flex;
        margin-top: 1.5em;
      }
      .state-reporting + p {
        margin-top: 0.5em;
      }
      .state-reporting h3 {
        flex-grow: 1;
        margin: 0;
      }
      .state-reporting-switch {
        margin-top: 0.25em;
        margin-right: 7px;
        margin-left: 0.5em;
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
