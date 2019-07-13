import {
  html,
  LitElement,
  TemplateResult,
  CSSResult,
  css,
  property,
} from "lit-element";
import "@material/mwc-button";
import "@polymer/paper-toggle-button/paper-toggle-button";
// tslint:disable-next-line
import { PaperToggleButtonElement } from "@polymer/paper-toggle-button/paper-toggle-button";

import "../../../../components/ha-card";

import { fireEvent } from "../../../../common/dom/fire_event";
import { HomeAssistant } from "../../../../types";
import { CloudStatusLoggedIn, updateCloudPref } from "../../../../data/cloud";
import { syncCloudAlexaEntities } from "../../../../data/alexa";

export class CloudAlexaPref extends LitElement {
  @property() public hass?: HomeAssistant;
  @property() public cloudStatus?: CloudStatusLoggedIn;
  @property() private _syncing = false;

  protected render(): TemplateResult | void {
    if (!this.cloudStatus) {
      return html``;
    }

    const { alexa_enabled, alexa_report_state } = this.cloudStatus!.prefs;

    return html`
      <ha-card header="Alexa">
        <paper-toggle-button
          .checked=${alexa_enabled}
          @change=${this._enabledToggleChanged}
        ></paper-toggle-button>
        <div class="card-content">
          With the Alexa integration for Home Assistant Cloud you'll be able to
          control all your Home Assistant devices via any Alexa-enabled device.
          <ul>
            <li>
              <a
                href="https://skills-store.amazon.com/deeplink/dp/B0772J1QKB?deviceType=app"
                target="_blank"
              >
                Enable the Home Assistant skill for Alexa
              </a>
            </li>
            <li>
              <a
                href="https://www.nabucasa.com/config/amazon_alexa/"
                target="_blank"
              >
                Config documentation
              </a>
            </li>
          </ul>
          <em
            >This integration requires an Alexa-enabled device like the Amazon
            Echo.</em
          >
          ${alexa_enabled
            ? html`
                <h3>Enable State Reporting</h3>
                <p>
                  If you enable state reporting, Home Assistant will send
                  <b>all</b> state changes of exposed entities to Amazon. This
                  allows you to always see the latest states in the Alexa app
                  and use the state changes to create routines.
                </p>
                <paper-toggle-button
                  .checked=${alexa_report_state}
                  @change=${this._reportToggleChanged}
                ></paper-toggle-button>
              `
            : ""}
        </div>
        <div class="card-actions">
          <mwc-button @click=${this._handleSync} .disabled=${this._syncing}>
            Sync Entities
          </mwc-button>
          <div class="spacer"></div>
          <a href="/config/cloud/alexa">
            <mwc-button>Manage Entities</mwc-button>
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
      alert(`Failed to sync entities: ${err.body.message}`);
    } finally {
      this._syncing = false;
    }
  }

  private async _enabledToggleChanged(ev) {
    const toggle = ev.target as PaperToggleButtonElement;
    try {
      await updateCloudPref(this.hass!, { alexa_enabled: toggle.checked! });
      fireEvent(this, "ha-refresh-cloud-status");
    } catch (err) {
      toggle.checked = !toggle.checked;
    }
  }

  private async _reportToggleChanged(ev) {
    const toggle = ev.target as PaperToggleButtonElement;
    try {
      await updateCloudPref(this.hass!, {
        alexa_report_state: toggle.checked!,
      });
      fireEvent(this, "ha-refresh-cloud-status");
    } catch (err) {
      alert(
        `Unable to ${toggle.checked ? "enable" : "disable"} report state. ${
          err.message
        }`
      );
      toggle.checked = !toggle.checked;
    }
  }

  static get styles(): CSSResult {
    return css`
      a {
        color: var(--primary-color);
      }
      ha-card > paper-toggle-button {
        margin: -4px 0;
        position: absolute;
        right: 8px;
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
      h3 {
        margin-bottom: 0;
      }
      h3 + p {
        margin-top: 0.5em;
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
