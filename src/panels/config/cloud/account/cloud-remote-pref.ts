import "@material/mwc-button";
import { mdiContentCopy } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { copyToClipboard } from "../../../../common/util/copy-clipboard";
import "../../../../components/ha-alert";
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
import { showToast } from "../../../../util/toast";
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
          outlined
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

    const urlParts = remote_domain!.split(".");
    const hiddenURL = `https://${urlParts[0].substring(0, 5)}XXX.${
      urlParts[1]
    }.${urlParts[2]}.${urlParts[3]}`;

    return html`
      <ha-card
        outlined
        header=${this.hass.localize(
          "ui.panel.config.cloud.account.remote.title"
        )}
      >
        <div class="switch">
          <ha-switch
            .checked=${remote_enabled}
            @change=${this._toggleChanged}
          ></ha-switch>
        </div>
        <div class="card-content">
          ${!remote_connected && remote_enabled
            ? html`
                <ha-alert
                  .title=${this.hass.localize(
                    `ui.panel.config.cloud.account.remote.reconnecting`
                  )}
                ></ha-alert>
              `
            : ""}
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
            ${hiddenURL}</a
          >.
          <ha-svg-icon
            .url=${`https://${remote_domain}`}
            .path=${mdiContentCopy}
            @click=${this._copyURL}
          ></ha-svg-icon>
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
          <div class="spacer"></div>
          <mwc-button @click=${this._openCertInfo}>
            ${this.hass.localize(
              "ui.panel.config.cloud.account.remote.certificate_info"
            )}
          </mwc-button>
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
    } catch (err: any) {
      alert(err.message);
      toggle.checked = !toggle.checked;
    }
  }

  private async _copyURL(ev): Promise<void> {
    const url = ev.currentTarget.url;
    await copyToClipboard(url);
    showToast(this, {
      message: this.hass.localize("ui.common.copied_clipboard"),
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      .preparing {
        padding: 0 16px 16px;
      }
      a {
        color: var(--primary-color);
      }
      .switch {
        position: absolute;
        right: 24px;
        top: 24px;
      }
      :host([dir="rtl"]) .switch {
        right: auto;
        left: 24px;
      }
      .warning {
        font-weight: bold;
        margin-bottom: 1em;
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
      ha-svg-icon {
        --mdc-icon-size: 18px;
        color: var(--secondary-text-color);
        cursor: pointer;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-remote-pref": CloudRemotePref;
  }
}
