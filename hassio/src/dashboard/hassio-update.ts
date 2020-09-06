import "@material/mwc-button";
import { mdiHomeAssistant } from "@mdi/js";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import "../../../src/components/buttons/ha-progress-button";
import "../../../src/components/ha-card";
import "../../../src/components/ha-svg-icon";
import {
  extractApiErrorMessage,
  HassioResponse,
} from "../../../src/data/hassio/common";
import { HassioHassOSInfo } from "../../../src/data/hassio/host";
import {
  HassioHomeAssistantInfo,
  HassioSupervisorInfo,
} from "../../../src/data/hassio/supervisor";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../src/dialogs/generic/show-dialog-box";
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
          <ha-progress-button
            .apiPath=${apiPath}
            .name=${name}
            .version=${lastVersion}
            @click=${this._confirmUpdate}
          >
            Update
          </ha-progress-button>
        </div>
      </ha-card>
    `;
  }

  private async _confirmUpdate(ev): Promise<void> {
    const item = ev.currentTarget;
    item.progress = true;
    const confirmed = await showConfirmationDialog(this, {
      title: `Update ${item.name}`,
      text: `Are you sure you want to upgrade ${item.name} to version ${item.version}?`,
      confirmText: "update",
      dismissText: "cancel",
    });

    if (!confirmed) {
      item.progress = false;
      return;
    }
    try {
      await this.hass.callApi<HassioResponse<void>>("POST", item.apiPath);
    } catch (err) {
      // Only show an error if the status code was not 504, or no status at all (connection terminated)
      if (err.status_code && err.status_code !== 504) {
        showAlertDialog(this, {
          title: "Update failed",
          text: extractApiErrorMessage(err),
        });
      }
    }
    item.progress = false;
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
