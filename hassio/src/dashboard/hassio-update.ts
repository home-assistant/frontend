import "@material/mwc-button";
import { mdiHomeAssistant } from "@mdi/js";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  TemplateResult,
} from "lit-element";
import "../../../src/components/buttons/ha-call-api-button";
import "../../../src/components/ha-card";
import "../../../src/components/ha-svg-icon";
import { HassioHassOSInfo } from "../../../src/data/hassio/host";
import {
  HassioHomeAssistantInfo,
  HassioSupervisorInfo,
} from "../../../src/data/hassio/supervisor";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant } from "../../../src/types";
import { hassioStyle } from "../resources/hassio-style";

@customElement("hassio-update")
export class HassioUpdate extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public hassInfo: HassioHomeAssistantInfo;

  @property({ attribute: false }) public hassOsInfo?: HassioHassOSInfo;

  @property() public supervisorInfo: HassioSupervisorInfo;

  @internalProperty() private _error?: string;

  protected render(): TemplateResult {
    const updatesAvailable: number = [
      this.hassInfo,
      this.supervisorInfo,
      this.hassOsInfo,
    ].filter((value) => {
      return (
        !!value &&
        (value.version_latest
          ? value.version !== value.version_latest
          : value.version_latest
          ? value.version !== value.version_latest
          : false)
      );
    }).length;

    if (!updatesAvailable) {
      return html``;
    }

    return html`
      <div class="content">
        ${this._error
          ? html` <div class="error">Error: ${this._error}</div> `
          : ""}
        <h1>
          ${updatesAvailable > 1
            ? "Updates Available 🎉"
            : "Update Available 🎉"}
        </h1>
        <div class="card-group">
          ${this._renderUpdateCard(
            "Home Assistant Core",
            this.hassInfo.version,
            this.hassInfo.version_latest,
            "hassio/homeassistant/update",
            `https://${
              this.hassInfo.version_latest.includes("b") ? "rc" : "www"
            }.home-assistant.io/latest-release-notes/`,
            mdiHomeAssistant
          )}
          ${this._renderUpdateCard(
            "Supervisor",
            this.supervisorInfo.version,
            this.supervisorInfo.version_latest,
            "hassio/supervisor/update",
            `https://github.com//home-assistant/hassio/releases/tag/${this.supervisorInfo.version_latest}`
          )}
          ${this.hassOsInfo
            ? this._renderUpdateCard(
                "Operating System",
                this.hassOsInfo.version,
                this.hassOsInfo.version_latest,
                "hassio/os/update",
                `https://github.com//home-assistant/hassos/releases/tag/${this.hassOsInfo.version_latest}`
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
    releaseNotesUrl: string,
    icon?: string
  ): TemplateResult {
    if (!lastVersion || lastVersion === curVersion) {
      return html``;
    }
    return html`
      <ha-card>
        <div class="card-content">
          ${icon
            ? html`
                <div class="icon">
                  <ha-svg-icon .path=${icon}></ha-svg-icon>
                </div>
              `
            : ""}
          <div class="update-heading">${name} ${lastVersion}</div>
          <div class="warning">
            You are currently running version ${curVersion}
          </div>
        </div>
        <div class="card-actions">
          <a href="${releaseNotesUrl}" target="_blank" rel="noreferrer">
            <mwc-button>Release notes</mwc-button>
          </a>
          <ha-call-api-button
            .hass=${this.hass}
            .path=${apiPath}
            @hass-api-called=${this._apiCalled}
          >
            Update
          </ha-call-api-button>
        </div>
      </ha-card>
    `;
  }

  private _apiCalled(ev): void {
    if (ev.detail.success) {
      this._error = "";
      return;
    }

    const response = ev.detail.response;

    if (typeof response.body === "object") {
      this._error = response.body.message || "Unknown error";
    } else {
      this._error = response.body;
    }
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      hassioStyle,
      css`
        .icon {
          --mdc-icon-size: 48px;
          float: right;
          margin: 0 0 2px 10px;
          color: var(--primary-text-color);
        }
        .update-heading {
          font-size: var(--paper-font-subhead_-_font-size);
          font-weight: 500;
          margin-bottom: 0.5em;
          color: var(--primary-text-color);
        }
        .warning {
          color: var(--secondary-text-color);
        }
        .card-content {
          height: calc(100% - 47px);
          box-sizing: border-box;
        }
        .card-actions {
          text-align: right;
        }
        .errors {
          color: var(--error-color);
          padding: 16px;
        }
        a {
          text-decoration: none;
        }
      `,
    ];
  }
}
