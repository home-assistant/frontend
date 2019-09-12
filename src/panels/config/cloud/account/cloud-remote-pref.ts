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

    if (!remote_certificate) {
      return html`
        <ha-card header="Remote Control">
          <div class="preparing">
            Remote access is being prepared. We will notify you when it's ready.
          </div>
        </ha-card>
      `;
    }

    return html`
      <ha-card header="Remote Control">
        <ha-switch
          .checked="${remote_connected}"
          @change="${this._toggleChanged}"
        ></ha-switch>
        <div class="card-content">
          Home Assistant Cloud provides a secure remote connection to your
          instance while away from home. Your instance
          ${remote_connected ? "is" : "will be"} available at
          <a href="https://${remote_domain}" target="_blank">
            https://${remote_domain}</a
          >.
        </div>
        <div class="card-actions">
          <a href="https://www.nabucasa.com/config/remote/" target="_blank">
            <mwc-button>Learn how it works</mwc-button>
          </a>
          ${remote_certificate
            ? html`
                <div class="spacer"></div>
                <mwc-button @click=${this._openCertInfo}>
                  Certificate Info
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
      ha-card > ha-switch {
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-remote-pref": CloudRemotePref;
  }
}
