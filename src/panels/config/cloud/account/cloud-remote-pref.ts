import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  CSSResult,
  css,
  property,
} from "lit-element";
import "@material/mwc-button";
import "@polymer/paper-item/paper-item-body";

import "../../../../components/ha-card";
import "../../../../components/ha-switch";

// tslint:disable-next-line
import { HaSwitch } from "../../../../components/ha-switch";
import { fireEvent } from "../../../../common/dom/fire_event";
import { HomeAssistant } from "../../../../types";
import {
  connectCloudRemote,
  disconnectCloudRemote,
  CloudStatusLoggedIn,
} from "../../../../data/cloud";
import { showCloudCertificateDialog } from "../dialog-cloud-certificate/show-dialog-cloud-certificate";

@customElement("cloud-remote-pref")
export class CloudRemotePref extends LitElement {
  @property() public hass?: HomeAssistant;
  @property() public cloudStatus?: CloudStatusLoggedIn;

  protected render(): TemplateResult {
    if (!this.cloudStatus) {
      return html``;
    }

    const {
      remote_connected,
      remote_domain,
      remote_certificate,
    } = this.cloudStatus;

    if (!remote_certificate) {
      return html`
        <ha-card
          header=${this.hass!.localize(
            "ui.panel.config.cloud.account.remote.title"
          )}
        >
          <div class="preparing">
            ${this.hass!.localize(
              "ui.panel.config.cloud.account.remote.access_is_being_prepared"
            )}
          </div>
        </ha-card>
      `;
    }

    return html`
      <ha-card
        header=${this.hass!.localize(
          "ui.panel.config.cloud.account.remote.title"
        )}
      >
        <div class="switch">
          <ha-switch
            .checked="${remote_connected}"
            @change="${this._toggleChanged}"
          ></ha-switch>
        </div>
        <div class="card-content">
          ${this.hass!.localize("ui.panel.config.cloud.account.remote.info")}
          ${remote_connected
            ? this.hass!.localize(
                "ui.panel.config.cloud.account.remote.instance_is_available"
              )
            : this.hass!.localize(
                "ui.panel.config.cloud.account.remote.instance_will_be_available"
              )}
          <a
            href="https://${remote_domain}"
            target="_blank"
            class="break-word"
            rel="noreferrer"
          >
            https://${remote_domain}</a
          >.
        </div>
        <div class="card-actions">
          <a
            href="https://www.nabucasa.com/config/remote/"
            target="_blank"
            rel="noreferrer"
          >
            <mwc-button
              >${this.hass!.localize(
                "ui.panel.config.cloud.account.remote.link_learn_how_it_works"
              )}</mwc-button
            >
          </a>
          ${remote_certificate
            ? html`
                <div class="spacer"></div>
                <mwc-button @click=${this._openCertInfo}>
                  ${this.hass!.localize(
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
        await connectCloudRemote(this.hass!);
      } else {
        await disconnectCloudRemote(this.hass!);
      }
      fireEvent(this, "ha-refresh-cloud-status");
    } catch (err) {
      alert(err.message);
      toggle.checked = !toggle.checked;
    }
  }

  static get styles(): CSSResult {
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-remote-pref": CloudRemotePref;
  }
}
