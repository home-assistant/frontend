import "@material/mwc-button/mwc-button";
import { mdiPackageVariant } from "@mdi/js";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item-body";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-alert";
import "../../../components/ha-logo-svg";
import "../../../components/ha-svg-icon";
import { SupervisorAvailableUpdates } from "../../../data/supervisor/supervisor";
import { HomeAssistant } from "../../../types";

export const SUPERVISOR_UPDATE_NAMES = {
  core: "Home Assistant Core",
  os: "Home Assistant Operating System",
  supervisor: "Home Assistant Supervisor",
};

@customElement("ha-config-updates")
class HaConfigUpdates extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false })
  public supervisorUpdates?: SupervisorAvailableUpdates[] | null;

  @state() private _showAll = false;

  protected render(): TemplateResult {
    if (!this.supervisorUpdates) {
      return html``;
    }

    const updates =
      this._showAll || this.supervisorUpdates.length <= 3
        ? this.supervisorUpdates
        : this.supervisorUpdates.slice(0, 2);

    return html`
      <div class="title">
        ${this.hass.localize("ui.panel.config.updates.title", {
          count: this.supervisorUpdates.length,
        })}
      </div>
      ${updates.map(
        (update) => html`
          <paper-icon-item>
            <span slot="item-icon" class="icon">
              ${update.update_type === "addon"
                ? update.icon
                  ? html`<img src="/api/hassio${update.icon}" />`
                  : html`<ha-svg-icon .path=${mdiPackageVariant}></ha-svg-icon>`
                : html`<ha-logo-svg></ha-logo-svg>`}
            </span>
            <paper-item-body two-line>
              ${update.update_type === "addon"
                ? update.name
                : SUPERVISOR_UPDATE_NAMES[update.update_type!]}
              <div secondary>
                ${this.hass.localize(
                  "ui.panel.config.updates.version_available",
                  {
                    version_available: update.version_latest,
                  }
                )}
              </div>
            </paper-item-body>
            <a href="/hassio${update.panel_path}">
              <mwc-button
                .label=${this.hass.localize("ui.panel.config.updates.show")}
              >
              </mwc-button>
            </a>
          </paper-icon-item>
        `
      )}
      ${!this.narrow ? html`<div class="divider"></div>` : ""}
      ${!this._showAll && this.supervisorUpdates.length >= 4
        ? html`
            <div class="show-all" @click=${this._showAllClicked}>
              ${this.hass.localize("ui.panel.config.updates.show_all_updates")}
            </div>
          `
        : ""}
    `;
  }

  private _showAllClicked() {
    this._showAll = true;
  }

  static get styles(): CSSResultGroup {
    return css`
      .title {
        font-size: 16px;
        padding: 16px;
        padding-bottom: 0;
      }
      a {
        text-decoration: none;
        color: var(--primary-text-color);
      }
      .icon {
        display: inline-flex;
        height: 100%;
        align-items: center;
      }
      img,
      ha-svg-icon,
      ha-logo-svg {
        --mdc-icon-size: 32px;
        max-height: 32px;
        width: 32px;
      }
      ha-logo-svg {
        color: var(--secondary-text-color);
      }
      .show-all {
        cursor: pointer;
        color: var(--primary-color);
        margin: 4px 16px;
      }
      .divider::before {
        content: " ";
        display: block;
        height: 1px;
        background-color: var(--divider-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-updates": HaConfigUpdates;
  }
}
