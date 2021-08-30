import "@material/mwc-button";
import "@polymer/paper-item/paper-item-body";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-card";
import "../../../../components/ha-switch";
// eslint-disable-next-line
import type { HaSwitch } from "../../../../components/ha-switch";
import {
  CloudStatusLoggedIn,
  connectCloudRemote,
  disconnectCloudRemote,
} from "../../../../data/cloud";
import type { HomeAssistant } from "../../../../types";
import { showCloudCertificateDialog } from "../dialog-cloud-certificate/show-dialog-cloud-certificate";

@customElement("cloud-remote-pref")
export class CloudRemotePref extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public cloudStatus?: CloudStatusLoggedIn;

  protected render(): TemplateResult {
    if (!this.cloudStatus) {
      return html``;
    }

    const { remote_enabled } = this.cloudStatus.prefs;

    const { remote_connected, remote_domain, remote_certificate } =
      this.cloudStatus;

    if (!remote_certificate) {
      return html`
        <ha-card
          header=${this.hass.localize(
            "ui.panel.config.cloud.account.remote.title"
          )}
        >
          <div class="preparing">
            ${this.hass.localize(
              "ui.panel.config.cloud.account.remote.access_is_being_prepared"
            )}
          </div>
        </ha-card>
      `;
    }

    return html`
      <ha-card
        header=${this.hass.localize(
          "ui.panel.config.cloud.account.remote.title"
        )}
      >
        <div class="connection-status">
          ${this.hass.localize(
            `ui.panel.config.cloud.account.remote.${
              remote_connected
                ? "connected"
                : remote_enabled
                ? "reconnecting"
                : "not_connected"
            }`
          )}
        </div>
        <div class="card-content">
          ${this.hass.localize("ui.panel.config.cloud.account.remote.info")}
          ${this.hass.localize(
            `ui.panel.config.cloud.account.remote.${
              remote_connected
                ? "instance_is_available"
                : "instance_will_be_available"
            }`
          )}
          <a
            href="https://${remote_domain}"
            target="_blank"
            class="break-word"
            rel="noreferrer"
          >
            https://${remote_domain}</a
          >.

          <div class="remote-enabled">
            <h3>
              ${this.hass.localize(
                "ui.panel.config.cloud.account.remote.remote_enabled.caption"
              )}
            </h3>
            <div class="remote-enabled-switch">
              <ha-switch
                .checked="${remote_enabled}"
                @change="${this._toggleChanged}"
              ></ha-switch>
            </div>
          </div>
          <p>
            ${this.hass.localize(
              "ui.panel.config.cloud.account.remote.remote_enabled.description"
            )}
          </p>
        </div>
        <div class="card-actions">
          <a
            href="https://www.nabucasa.com/config/remote/"
            target="_blank"
            rel="noreferrer"
          >
            <mwc-button
              >${this.hass.localize(
                "ui.panel.config.cloud.account.remote.link_learn_how_it_works"
              )}</mwc-button
            >
          </a>
          ${remote_certificate
            ? html`
                <div class="spacer"></div>
                <mwc-button @click=${this._openCertInfo}>
                  ${this.hass.localize(
                    "ui.panel.config.cloud.account.remote.certificate_info"
                  )}
                </mwc-button>
              `
            : ""}
        </div>
      </ha-card>
    `;
  }

  private _openCertInfo() {
    showCloudCertificateDialog(this, {
      certificateInfo: this.cloudStatus!.remote_certificate!,
    });
  }

  private async _toggleChanged(ev) {
    const toggle = ev.target as HaSwitch;

    try {
      if (toggle.checked) {
        await connectCloudRemote(this.hass);
      } else {
        await disconnectCloudRemote(this.hass);
      }
      fireEvent(this, "ha-refresh-cloud-status");
    } catch (err) {
      alert(err.message);
      toggle.checked = !toggle.checked;
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      .preparing {
        padding: 0 16px 16px;
      }
      a {
        color: var(--primary-color);
      }
      .break-word {
        overflow-wrap: break-word;
      }
      .connection-status {
        position: absolute;
        right: 24px;
        top: 24px;
      }
      :host([dir="rtl"]) .switch {
        right: auto;
        left: 24px;
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
      .remote-enabled {
        display: flex;
        margin-top: 1.5em;
      }
      .remote-enabled + p {
        margin-top: 0.5em;
      }
      h3 {
        margin: 0 0 8px 0;
      }
      .remote-enabled h3 {
        flex-grow: 1;
        margin: 0;
      }
      .remote-enabled-switch {
        margin-top: 0.25em;
        margin-right: 7px;
        margin-left: 0.5em;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-remote-pref": CloudRemotePref;
  }
}
