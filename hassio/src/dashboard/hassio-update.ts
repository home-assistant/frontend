import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import "../../../src/components/ha-card";
import "../../../src/components/ha-button";
import "../../../src/components/ha-settings-row";
import "../../../src/components/ha-svg-icon";
import type { HassioHassOSInfo } from "../../../src/data/hassio/host";
import type {
  HassioHomeAssistantInfo,
  HassioSupervisorInfo,
} from "../../../src/data/hassio/supervisor";
import type { Supervisor } from "../../../src/data/supervisor/supervisor";
import { mdiHomeAssistant } from "../../../src/resources/home-assistant-logo-svg";
import { haStyle } from "../../../src/resources/styles";
import type { HomeAssistant } from "../../../src/types";
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

  protected render() {
    if (!this.supervisor) {
      return nothing;
    }

    const updatesAvailable = this._pendingUpdates(this.supervisor);
    if (!updatesAvailable) {
      return nothing;
    }

    return html`
      <div class="content">
        <h1>
          ${this.supervisor.localize("common.update_available", {
            count: updatesAvailable,
          })}
          🎉
        </h1>
        <div class="card-group">
          ${this._renderUpdateCard(
            "Home Assistant Core",
            "core",
            this.supervisor.core
          )}
          ${this._renderUpdateCard(
            "Supervisor",
            "supervisor",
            this.supervisor.supervisor
          )}
          ${this.supervisor.host.features.includes("haos")
            ? this._renderUpdateCard(
                "Operating System",
                "os",
                this.supervisor.os
              )
            : ""}
        </div>
      </div>
    `;
  }

  private _renderUpdateCard(
    name: string,
    key: string,
    object: HassioHomeAssistantInfo | HassioSupervisorInfo | HassioHassOSInfo
  ) {
    if (!object.update_available) {
      return nothing;
    }
    return html`
      <ha-card outlined>
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
          <ha-button appearance="plain" href="/hassio/update-available/${key}">
            ${this.supervisor.localize("common.show")}
          </ha-button>
        </div>
      </ha-card>
    `;
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
          font-size: var(--ha-font-size-l);
          font-weight: var(--ha-font-weight-medium);
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
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-update": HassioUpdate;
  }
}
