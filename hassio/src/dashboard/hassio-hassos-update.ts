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
import { HassioHassOSInfo } from "../../../src/data/hassio";

import "@material/mwc-button";
import "@polymer/paper-card/paper-card";
import "../../../src/components/buttons/ha-call-api-button";
import "../components/hassio-card-content";
import "../resources/hassio-style";

@customElement("hassio-hassos-update")
export class HassioUpdate extends LitElement {
  @property() public hass?: HomeAssistant;

  @property() public hassOsInfo!: HassioHassOSInfo;

  @property() public errors?: string;

  protected render(): TemplateResult | void {
    if (this.hassOsInfo.version === this.hassOsInfo.version_latest) {
      return;
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
          <paper-card heading="HassOs update available! 🎉">
            <div class="card-content">
              HassOs ${this.hassOsInfo.version_latest} is available and you are
              currently running HassOs ${this.hassOsInfo.version}.
              ${this.errors
                ? html`
                    <div class="error">Error: ${this.errors}</div>
                  `
                : ""}
            </div>
            <div class="card-actions">
              <ha-call-api-button
                .hass=${this.hass}
                path="hassio/hassos/update"
                @hass-api-called=${this.apiCalled}
              >
                Update
              </ha-call-api-button>
              <a
                href="https://github.com//home-assistant/hassos/releases/tag/${this
                  .hassOsInfo.version_latest}"
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
      this.errors = "";
      return;
    }

    const response = ev.detail.response;

    typeof response.body === "object"
      ? (this.errors = response.body.message || "Unknown error")
      : (this.errors = response.body);
  }
}
