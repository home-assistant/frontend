import "@material/mwc-button/mwc-button";
import { mdiPackageVariant } from "@mdi/js";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item-body";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-alert";
import "../../../components/ha-logo-svg";
import "../../../components/ha-svg-icon";
import { SupervisorAvailableUpdates } from "../../../data/supervisor/root";
import { HomeAssistant } from "../../../types";
import "../../../components/ha-icon-next";

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
    if (!this.supervisorUpdates?.length) {
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
          <a href="/hassio${update.panel_path}">
            <paper-icon-item>
              <span slot="item-icon" class="icon">
                ${update.update_type === "addon"
                  ? update.icon
                    ? html`<img src="/api/hassio${update.icon}" />`
                    : html`<ha-svg-icon
                        .path=${mdiPackageVariant}
                      ></ha-svg-icon>`
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
              ${!this.narrow ? html`<ha-icon-next></ha-icon-next>` : ""}
            </paper-icon-item>
          </a>
        `
      )}
      ${!this._showAll && this.supervisorUpdates.length >= 4
        ? html`
            <button class="show-more" @click=${this._showAllClicked}>
              ${this.hass.localize("ui.panel.config.updates.more_updates", {
                count: this.supervisorUpdates!.length - updates.length,
              })}
            </button>
          `
        : ""}
    `;
  }

  private _showAllClicked() {
    this._showAll = true;
  }

  static get styles(): CSSResultGroup[] {
    return [
      css`
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
        ha-icon-next {
          color: var(--secondary-text-color);
          height: 24px;
          width: 24px;
        }
        button.show-more {
          color: var(--primary-color);
          text-align: left;
          cursor: pointer;
          background: none;
          border-width: initial;
          border-style: none;
          border-color: initial;
          border-image: initial;
          padding: 16px;
          font: inherit;
        }
        button.show-more:focus {
          outline: none;
          text-decoration: underline;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-updates": HaConfigUpdates;
  }
}
