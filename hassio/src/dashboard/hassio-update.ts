import {
  LitElement,
  TemplateResult,
  html,
  CSSResult,
  css,
  property,
  customElement,
} from "lit-element";

import { HomeAssistant } from "../../../src/types";
import {
  HassioHomeAssistantInfo,
  HassioHassOSInfo,
  HassioSupervisorInfo,
} from "../../../src/data/hassio";

import { hassioStyle } from "../resources/hassio-style";

import "@material/mwc-button";
import "@polymer/paper-card/paper-card";
import "../../../src/components/buttons/ha-call-api-button";
import "../components/hassio-card-content";

@customElement("hassio-update")
export class HassioUpdate extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public hassInfo: HassioHomeAssistantInfo;
  @property() public hassOsInfo?: HassioHassOSInfo;
  @property() public supervisorInfo: HassioSupervisorInfo;

  @property() public error?: string;

  protected render(): TemplateResult | void {
    if (
      this.hassInfo.version === this.hassInfo.last_version &&
      this.supervisorInfo.version === this.supervisorInfo.last_version &&
      (!this.hassOsInfo ||
        this.hassOsInfo.version === this.hassOsInfo.version_latest)
    ) {
      return html``;
    }

    return html`
      <div class="content">
        ${this.error
          ? html`
              <div class="error">Error: ${this.error}</div>
            `
          : ""}
        <div class="card-group">
          ${this._renderUpdateCard(
            "Home Assistant",
            this.hassInfo.version,
            this.hassInfo.last_version,
            "hassio/homeassistant/update",
            `https://${
              this.hassInfo.last_version.includes("b") ? "rc" : "www"
            }.home-assistant.io/latest-release-notes/`
          )}
          ${this._renderUpdateCard(
            "Hass.io Supervisor",
            this.supervisorInfo.version,
            this.supervisorInfo.last_version,
            "hassio/supervisor/update",
            `https://github.com//home-assistant/hassio/releases/tag/${
              this.supervisorInfo.last_version
            }`
          )}
          ${this.hassOsInfo
            ? this._renderUpdateCard(
                "HassOS",
                this.hassOsInfo.version,
                this.hassOsInfo.version_latest,
                "hassio/hassos/update",
                `https://github.com//home-assistant/hassos/releases/tag/${
                  this.hassOsInfo.version_latest
                }`
              )
            : ""}
        </div>
      </div>
    `;
  }

  private _renderUpdateCard(
    name: string,
    curVersion: string,
    lastVersion: string,
    apiPath: string,
    releaseNotesUrl: string
  ): TemplateResult {
    if (lastVersion === curVersion) {
      return html``;
    }
    return html`
      <paper-card heading="${name} update available! 🎉">
        <div class="card-content">
          ${name} ${lastVersion} is available and you are currently running
          ${name} ${curVersion}.
        </div>
        <div class="card-actions">
          <ha-call-api-button
            .hass=${this.hass}
            .path=${apiPath}
            @hass-api-called=${this._apiCalled}
          >
            Update
          </ha-call-api-button>
          <a href="${releaseNotesUrl}" target="_blank">
            <mwc-button>Release notes</mwc-button>
          </a>
        </div>
      </paper-card>
    `;
  }

  private _apiCalled(ev) {
    if (ev.detail.success) {
      this.error = "";
      return;
    }

    const response = ev.detail.response;

    typeof response.body === "object"
      ? (this.error = response.body.message || "Unknown error")
      : (this.error = response.body);
  }

  static get styles(): CSSResult[] {
    return [
      hassioStyle,
      css`
        :host {
          width: 33%;
        }
        paper-card {
          display: inline-block;
          margin-bottom: 32px;
        }
        .errors {
          color: var(--google-red-500);
          padding: 16px;
        }
        a {
          text-decoration: none;
        }
      `,
    ];
  }
}
