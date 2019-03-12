import {
  html,
  LitElement,
  PropertyDeclarations,
  TemplateResult,
  customElement,
  CSSResult,
  css,
} from "lit-element";
import "@material/mwc-button";
import "@polymer/paper-card/paper-card";
import "@polymer/paper-toggle-button/paper-toggle-button";
import "@polymer/paper-item/paper-item-body";
// tslint:disable-next-line
import { PaperToggleButtonElement } from "@polymer/paper-toggle-button/paper-toggle-button";
import "../../../components/buttons/ha-call-api-button";

import { fireEvent } from "../../../common/dom/fire_event";
import { HomeAssistant } from "../../../types";
import {
  connectCloudRemote,
  disconnectCloudRemote,
  CloudStatusLoggedIn,
} from "../../../data/cloud";
import format_date_time from "../../../common/datetime/format_date_time";

@customElement("cloud-remote-pref")
export class CloudRemotePref extends LitElement {
  public hass?: HomeAssistant;
  public cloudStatus?: CloudStatusLoggedIn;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      cloudStatus: {},
    };
  }

  protected render(): TemplateResult | void {
    if (!this.cloudStatus) {
      return html``;
    }

    const {
      remote_connected,
      remote_domain,
      remote_certificate,
    } = this.cloudStatus;

    return html`
      <paper-card heading="Remote Control">
        <paper-toggle-button
          .checked="${remote_connected}"
          @change="${this._toggleChanged}"
        ></paper-toggle-button>
        <div class="card-content">
          Home Assistant Cloud provides you with a secure remote connection to
          your instance while away from home. Your instance
          ${remote_connected ? "is" : "will be"} available at
          <a href="https://${remote_domain}" target="_blank">
            https://${remote_domain}</a
          >.
          ${!remote_certificate
            ? ""
            : html`
                <div class="data-row">
                  <paper-item-body two-line>
                    Certificate expiration date
                    <div secondary>Will be automatically renewed</div>
                  </paper-item-body>
                  <div class="data-value">
                    ${format_date_time(
                      new Date(remote_certificate.expire_date),
                      this.hass!.language
                    )}
                  </div>
                </div>
                <div class="data-row">
                  <paper-item-body>
                    Certificate fingerprint
                  </paper-item-body>
                  <div class="data-value">
                    ${remote_certificate.fingerprint}
                  </div>
                </div>
              `}
        </div>
        <div class="card-actions">
          <a href="https://www.nabucasa.com/config/remote/" target="_blank">
            <mwc-button>Learn how it works</mwc-button>
          </a>
        </div>
      </paper-card>
    `;
  }

  private async _toggleChanged(ev) {
    const toggle = ev.target as PaperToggleButtonElement;

    try {
      if (toggle.checked) {
        await connectCloudRemote(this.hass!);
      } else {
        await disconnectCloudRemote(this.hass!);
      }
      fireEvent(this, "ha-refresh-cloud-status");
    } catch (err) {
      toggle.checked = !toggle.checked;
    }
  }

  static get styles(): CSSResult {
    return css`
      .data-row {
        display: flex;
      }
      .data-value {
        padding: 16px 0;
      }
      a {
        color: var(--primary-color);
      }
      paper-card > paper-toggle-button {
        position: absolute;
        right: 8px;
        top: 16px;
      }
      ha-call-api-button {
        color: var(--primary-color);
        font-weight: 500;
      }
      .unlock {
        display: flex;
        flex-direction: row;
        padding-top: 16px;
      }
      .unlock > div {
        flex: 1;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-remote-pref": CloudRemotePref;
  }
}
