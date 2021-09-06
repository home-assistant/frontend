import "@material/mwc-button";
import { mdiHomeAssistant } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { atLeastVersion } from "../../../src/common/config/version";
import { fireEvent } from "../../../src/common/dom/fire_event";
import "../../../src/components/buttons/ha-progress-button";
import "../../../src/components/ha-card";
import "../../../src/components/ha-settings-row";
import "../../../src/components/ha-svg-icon";
import {
  extractApiErrorMessage,
  HassioResponse,
  ignoreSupervisorError,
} from "../../../src/data/hassio/common";
import { HassioHassOSInfo } from "../../../src/data/hassio/host";
import {
  HassioHomeAssistantInfo,
  HassioSupervisorInfo,
} from "../../../src/data/hassio/supervisor";
import { updateCore } from "../../../src/data/supervisor/core";
import {
  Supervisor,
  supervisorApiWsRequest,
} from "../../../src/data/supervisor/supervisor";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../src/dialogs/generic/show-dialog-box";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant } from "../../../src/types";
import { showDialogSupervisorUpdate } from "../dialogs/update/show-dialog-update";
import { hassioStyle } from "../resources/hassio-style";

const computeVersion = (key: string, version: string): string =>
  key === "os" ? version : `${key}-${version}`;

@customElement("hassio-update")
export class HassioUpdate extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  private _pendingUpdates = memoizeOne(
    (supervisor: Supervisor): number =>
      Object.keys(supervisor).filter(
        (value) => supervisor[value].update_available
      ).length
  );

  protected render(): TemplateResult {
    if (!this.supervisor) {
      return html``;
    }

    const updatesAvailable = this._pendingUpdates(this.supervisor);
    if (!updatesAvailable) {
      return html``;
    }

    return html`
      <div class="content">
        <h1>
          ${this.supervisor.localize(
            "common.update_available",
            "count",
            updatesAvailable
          )}
          🎉
        </h1>
        <div class="card-group">
          ${this._renderUpdateCard(
            "Home Assistant Core",
            "core",
            this.supervisor.core,
            "hassio/homeassistant/update",
            `https://${
              this.supervisor.core.version_latest.includes("b") ? "rc" : "www"
            }.home-assistant.io/latest-release-notes/`
          )}
          ${this._renderUpdateCard(
            "Supervisor",
            "supervisor",
            this.supervisor.supervisor,
            "hassio/supervisor/update",
            `https://github.com//home-assistant/hassio/releases/tag/${this.supervisor.supervisor.version_latest}`
          )}
          ${this.supervisor.host.features.includes("haos")
            ? this._renderUpdateCard(
                "Operating System",
                "os",
                this.supervisor.os,
                "hassio/os/update",
                `https://github.com//home-assistant/hassos/releases/tag/${this.supervisor.os.version_latest}`
              )
            : ""}
        </div>
      </div>
    `;
  }

  private _renderUpdateCard(
    name: string,
    key: string,
    object: HassioHomeAssistantInfo | HassioSupervisorInfo | HassioHassOSInfo,
    apiPath: string,
    releaseNotesUrl: string
  ): TemplateResult {
    if (!object.update_available) {
      return html``;
    }
    return html`
      <ha-card>
        <div class="card-content">
          <div class="icon">
            <ha-svg-icon .path=${mdiHomeAssistant}></ha-svg-icon>
          </div>
          <div class="update-heading">${name}</div>
          <ha-settings-row two-line>
            <span slot="heading">
              ${this.supervisor.localize("common.version")}
            </span>
            <span slot="description">
              ${computeVersion(key, object.version!)}
            </span>
          </ha-settings-row>

          <ha-settings-row two-line>
            <span slot="heading">
              ${this.supervisor.localize("common.newest_version")}
            </span>
            <span slot="description">
              ${computeVersion(key, object.version_latest!)}
            </span>
          </ha-settings-row>
        </div>
        <div class="card-actions">
          <a href="${releaseNotesUrl}" target="_blank" rel="noreferrer">
            <mwc-button>
              ${this.supervisor.localize("common.release_notes")}
            </mwc-button>
          </a>
          <ha-progress-button
            .apiPath=${apiPath}
            .name=${name}
            .key=${key}
            .version=${object.version_latest}
            @click=${this._confirmUpdate}
          >
            ${this.supervisor.localize("common.update")}
          </ha-progress-button>
        </div>
      </ha-card>
    `;
  }

  private async _confirmUpdate(ev): Promise<void> {
    const item = ev.currentTarget;
    if (item.key === "core") {
      showDialogSupervisorUpdate(this, {
        supervisor: this.supervisor,
        name: "Home Assistant Core",
        version: this.supervisor.core.version_latest,
        backupParams: {
          name: `core_${this.supervisor.core.version}`,
          folders: ["homeassistant"],
          homeassistant: true,
        },
        updateHandler: async () => this._updateCore(),
      });
      return;
    }
    item.progress = true;
    const confirmed = await showConfirmationDialog(this, {
      title: this.supervisor.localize(
        "confirm.update.title",
        "name",
        item.name
      ),
      text: this.supervisor.localize(
        "confirm.update.text",
        "name",
        item.name,
        "version",
        computeVersion(item.key, item.version)
      ),
      confirmText: this.supervisor.localize("common.update"),
      dismissText: this.supervisor.localize("common.cancel"),
    });

    if (!confirmed) {
      item.progress = false;
      return;
    }
    try {
      if (atLeastVersion(this.hass.config.version, 2021, 2, 4)) {
        await supervisorApiWsRequest(this.hass.connection, {
          method: "post",
          endpoint: item.apiPath.replace("hassio", ""),
          timeout: null,
        });
      } else {
        await this.hass.callApi<HassioResponse<void>>("POST", item.apiPath);
      }
      fireEvent(this, "supervisor-collection-refresh", {
        collection: item.key,
      });
    } catch (err) {
      // Only show an error if the status code was not expected (user behind proxy)
      // or no status at all(connection terminated)
      if (this.hass.connection.connected && !ignoreSupervisorError(err)) {
        showAlertDialog(this, {
          title: this.supervisor.localize("common.error.update_failed"),
          text: extractApiErrorMessage(err),
        });
      }
    }
    item.progress = false;
  }

  private async _updateCore(): Promise<void> {
    await updateCore(this.hass);
    fireEvent(this, "supervisor-collection-refresh", {
      collection: "core",
    });
  }

  static get styles(): CSSResultGroup {
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
        .card-content {
          height: calc(100% - 47px);
          box-sizing: border-box;
        }
        .card-actions {
          text-align: right;
        }
        a {
          text-decoration: none;
        }
        ha-settings-row {
          padding: 0;
          --paper-item-body-two-line-min-height: 32px;
        }
      `,
    ];
  }
}
