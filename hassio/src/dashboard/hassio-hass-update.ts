import {
  LitElement,
  TemplateResult,
  html,
  //  CSSResult,
  //  css,
  property,
  customElement,
} from "lit-element";

import { HomeAssistant } from "../../../src/types";
import { HassioHomeAssistantInfo } from "../../../src/data/hassio";

import "@material/mwc-button";
import "@polymer/paper-card/paper-card";
import "../../../src/components/buttons/ha-call-api-button";
import "../components/hassio-card-content";
import "../resources/hassio-style";

@customElement("hassio-hass-update")
export class HassioHassUpdate extends LitElement {
  @property() public hass?: HomeAssistant;

  @property() public hassInfo: HassioHomeAssistantInfo;

  @property() public error?: string;

  protected render(): TemplateResult | void {
    if (this.hassInfo.version === this.hassInfo.last_version) {
      return html``;
    }

    return html`
      <style include="ha-style hassio-style">
        paper-card {
          display: block;
          margin-bottom: 32px;
        }
        .errors {
          color: var(--google-red-500);
          margin-top: 16px;
        }
        a {
          color: var(--primary-color);
        }
      </style>
      <div class="content">
        <div class="card-group">
          <paper-card heading="Home assistant update available! 🎉">
            <div class="card-content">
              Home Assistant ${this.hassInfo.last_version} is available and you
              are currently running Home Assistant ${this.hassInfo.version}.
              ${this.error
                ? html`
                    <div class="error">Error: ${this.error}</div>
                  `
                : ""}
            </div>
            <div class="card-actions">
              <ha-call-api-button
                .hass=${this.hass}
                path="hassio/homeassistant/update"
                @hass-api-called=${this.apiCalled}
              >
                Update
              </ha-call-api-button>
              <a
                href="${this.computeReleaseNotesUrl(this.hassInfo.version)}"
                target="_blank"
              >
                <mwc-button>Release notes</mwc-button>
              </a>
            </div>
          </paper-card>
        </div>
      </div>
    `;
  }

  private apiCalled(ev) {
    if (ev.detail.success) {
      this.error = "";
      return;
    }

    const response = ev.detail.response;

    typeof response.body === "object"
      ? (this.error = response.body.message || "Unknown error")
      : (this.error = response.body);
  }

  private computeReleaseNotesUrl(version) {
    return `https://${
      version.includes("b") ? "rc" : "www"
    }.home-assistant.io/latest-release-notes/`;
  }
}
