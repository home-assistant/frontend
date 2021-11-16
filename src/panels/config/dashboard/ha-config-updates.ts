import "@material/mwc-button/mwc-button";
import { mdiPackageVariant } from "@mdi/js";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item-body";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-alert";
import "../../../components/ha-card";
import "../../../components/ha-logo-svg";
import "../../../components/ha-svg-icon";
import { extractApiErrorMessage } from "../../../data/hassio/common";
import {
  fetchSupervisorAvailableUpdates,
  SupervisorAvailableUpdates,
} from "../../../data/supervisor/supervisor";
import { HomeAssistant } from "../../../types";

export const SUPERVISOR_UPDATE_NAMES = {
  core: "Home Assistant Core",
  os: "Home Assistant Operating System",
  supervisor: "Home Assistant Supervisor",
};

@customElement("ha-config-updates")
class HaConfigUpdates extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _supervisorUpdates?: SupervisorAvailableUpdates[];

  @state() private _error?: string;

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    this._loadSupervisorUpdates();
  }

  protected render(): TemplateResult {
    return html`
      <ha-card>
        ${this._error
          ? html`<ha-alert
              .title=${this.hass.localize(
                "ui.panel.config.updates.supervisor_error_title"
              )}
              alert-type="error"
              >${this._error}</ha-alert
            >`
          : ""}
        ${this._supervisorUpdates?.map(
          (update) => html`
            <ha-alert
              .title=${update.update_type === "addon"
                ? update.name
                : SUPERVISOR_UPDATE_NAMES[update.update_type!]}
            >
              <span slot="icon" class="icon">
                ${update.update_type === "addon"
                  ? update.icon
                    ? html`<img src="/api/hassio${update.icon}" />`
                    : html`<ha-svg-icon
                        .path=${mdiPackageVariant}
                      ></ha-svg-icon>`
                  : html`<ha-logo-svg></ha-logo-svg>`}
              </span>
              ${this.hass.localize(
                "ui.panel.config.updates.version_available",
                {
                  version_available: update.version_latest,
                }
              )}
              <a href="/hassio${update.panel_path}" slot="action">
                <mwc-button
                  .label=${this.hass.localize("ui.panel.config.updates.review")}
                >
                </mwc-button>
              </a>
            </ha-alert>
          `
        )}
      </ha-card>
    `;
  }

  private async _loadSupervisorUpdates(): Promise<void> {
    try {
      this._supervisorUpdates = await fetchSupervisorAvailableUpdates(
        this.hass
      );
    } catch (err) {
      this._error = extractApiErrorMessage(err);
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      a {
        text-decoration: none;
        color: var(--primary-text-color);
      }
      .icon {
        place-self: center;
      }
      img,
      ha-svg-icon,
      ha-logo-svg {
        width: var(--mdc-icon-size, 28px);
        height: var(--mdc-icon-size, 28px);
        padding-right: 8px;
        display: block;
        color: var(--secondary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-updates": HaConfigUpdates;
  }
}
