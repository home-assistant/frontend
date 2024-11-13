import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-card";
import "../../../components/ha-icon-next";
import "../../../components/ha-md-list";
import "../../../components/ha-md-list-item";
import { fetchBackupAgentsInfo } from "../../../data/backup";
import "../../../layouts/hass-subpage";
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";

@customElement("ha-config-backup-locations")
class HaConfigBackupLocations extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _agents: { id: string }[] = [];

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this._fetchAgents();
  }

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        back-path="/config/system"
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.config.backup.caption")}
      >
        <div class="content">
          <div class="header">
            <h2 class="title">Locations</h2>
            <p class="description">
              To keep your data safe it is recommended your backups is at least
              on two different locations and one of them is off-site.
            </p>
          </div>
          <ha-card class="agents">
            <div class="card-content">
              ${this._agents.length > 0
                ? html`
                    <ha-md-list>
                      ${this._agents.map((agent) => {
                        const [domain, name] = agent.id.split(".");
                        const domainName =
                          this.hass.localize(`component.${domain}.title`) ||
                          domain;
                        return html`
                          <ha-md-list-item
                            type="link"
                            href="/config/backup/locations/${agent.id}"
                          >
                            <img
                              .src=${brandsUrl({
                                domain,
                                type: "icon",
                                useFallback: true,
                                darkOptimized: this.hass.themes?.darkMode,
                              })}
                              crossorigin="anonymous"
                              referrerpolicy="no-referrer"
                              alt=""
                              slot="start"
                            />
                            <div slot="headline">${domainName}: ${name}</div>
                            <ha-icon-next slot="end"></ha-icon-next>
                          </ha-md-list-item>
                        `;
                      })}
                    </mwc-list>
                  `
                : html`<p>No sync agents configured</p>`}
            </div>
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  private async _fetchAgents() {
    const resp = await fetchBackupAgentsInfo(this.hass);
    this._agents = resp.agents;
  }

  static styles = css`
    .content {
      padding: 28px 20px 0;
      max-width: 690px;
      margin: 0 auto;
      gap: 24px;
      display: flex;
      flex-direction: column;
    }

    .header .title {
      font-size: 22px;
      font-style: normal;
      font-weight: 400;
      line-height: 28px;
      color: var(--primary-text-color);
    }

    .header .description {
      font-size: 14px;
      font-style: normal;
      font-weight: 400;
      line-height: 20px;
      letter-spacing: 0.25px;
      color: var(--secondary-text-color);
    }

    .agents ha-md-list {
      background: none;
    }
    .agents ha-md-list-item img {
      width: 48px;
    }
    .card-content {
      padding: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-backup-locations": HaConfigBackupLocations;
  }
}
