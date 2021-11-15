import "@material/mwc-button/mwc-button";
import { mdiHomeAssistant, mdiPackageVariant } from "@mdi/js";
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
import "../../../components/ha-card";
import "../../../components/ha-icon-next";
import "../../../components/ha-settings-row";
import {
  fetchSupervisorAvailableUpdates,
  SupervisorAvailableUpdates,
} from "../../../data/supervisor/supervisor";
import { HomeAssistant } from "../../../types";

export const SUPERVISOR_UPDATE_ENTRIES = {
  core: {
    icon: mdiHomeAssistant,
    name: "Home Assistant Core",
  },
  os: {
    icon: mdiHomeAssistant,
    name: "Home Assistant Operating System",
  },
  supervisor: {
    icon: mdiHomeAssistant,
    name: "Home Assistant Supervisor",
  },
  addon: {
    icon: mdiPackageVariant,
  },
};

@customElement("ha-config-updates")
class HaConfigUpdates extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _supervisorUpdates?: SupervisorAvailableUpdates[];

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    this._loadSupervisorUpdates();
  }

  protected render(): TemplateResult {
    if (!this._supervisorUpdates?.length) {
      return html``;
    }
    return html`
      <ha-card>
        ${this._supervisorUpdates.map(
          (update) => html`<ha-settings-row>
            <span slot="prefix">
              ${update.icon
                ? html` <img src="/api/hassio${update.icon}" />`
                : html`
                    <ha-svg-icon
                      .path=${SUPERVISOR_UPDATE_ENTRIES[update.update_type!]
                        ?.icon}
                    >
                    </ha-svg-icon>
                  `}
            </span>
            <span slot="heading">
              ${SUPERVISOR_UPDATE_ENTRIES[update.update_type!]?.name ||
              update.name}
            </span>
            <span slot="description">
              ${this.hass.localize(
                "ui.panel.config.updates.version_available",
                { version: update.version_latest }
              )}
            </span>
            <a .href="/hassio${update.panel_path}">
              <mwc-button
                >${this.hass.localize(
                  "ui.panel.config.updates.review"
                )}</mwc-button
              >
            </a>
          </ha-settings-row>`
        )}
      </ha-card>
    `;
  }

  private async _loadSupervisorUpdates(): Promise<void> {
    this._supervisorUpdates = await fetchSupervisorAvailableUpdates(this.hass);
  }

  static get styles(): CSSResultGroup {
    return css`
      a {
        text-decoration: none;
        color: var(--primary-text-color);
      }
      img,
      ha-svg-icon {
        width: var(--mdc-icon-size, 24px);
        height: var(--mdc-icon-size, 24px);
        padding-right: 8px;
        display: block;
        color: var(--secondary-text-color);
      }
      span[slot="prefix"] {
        width: var(--paper-item-icon-width, 56px);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-updates": HaConfigUpdates;
  }
}
