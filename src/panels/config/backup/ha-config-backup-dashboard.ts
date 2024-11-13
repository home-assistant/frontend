import { css, html, LitElement, TemplateResult } from "lit";
import "@material/mwc-list/mwc-list";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-icon-next";
import "../../../components/ha-list-item";
import "../../../layouts/hass-subpage";

import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { navigate } from "../../../common/navigate";
import { fetchBackupAgentsInfo } from "../../../data/backup";

@customElement("ha-config-backup-dashboard")
class HaConfigBackupDashboard extends SubscribeMixin(LitElement) {
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
          <div class="backup-status">
            <ha-card outlined>
              <div class="card-content">
                <div class="backup-status-contents">
                  <div class="status-icon">
                    <ha-icon icon="mdi:check-circle"></ha-icon>
                  </div>
                  <span>
                    <div class="status-header">Backed up</div>
                    <div class="status-text">
                      Your configuration has been backed up.
                    </div>
                  </span>
                </div>
                <ha-button
                  @click=${this._showBackupList}
                  class="show-all-backups"
                >
                  Show all backups
                </ha-button>
              </div>
            </ha-card>
          </div>
          <div class="backup-agents">
            <ha-card outlined>
              <div class="card-content">
                <div class="status-header">Locations</div>
                <div class="status-text">
                  To keep your data safe it is recommended your backups is at
                  least on two different locations and one of them is off-site.
                </div>
                ${this._agents.length > 0
                  ? html`<mwc-list>
                      ${this._agents.map((agent) => {
                        const [domain, name] = agent.id.split(".");
                        return html` <ha-list-item
                          graphic="medium"
                          hasMeta
                          .agent=${agent.id}
                          @click=${this._showAgentSyncs}
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
                            alt="cloud"
                            slot="graphic"
                          />
                          <span>
                            ${this.hass.localize(`component.${domain}.title`) ||
                            domain}:
                            ${name}
                          </span>
                          <ha-icon-next slot="meta"></ha-icon-next>
                        </ha-list-item>`;
                      })}
                    </mwc-list>`
                  : html`<p>No sync agents configured</p>`}
              </div>
            </ha-card>
          </div>
        </div>
      </hass-subpage>
    `;
  }

  private async _fetchAgents() {
    const resp = await fetchBackupAgentsInfo(this.hass);
    this._agents = resp.agents;
  }

  private _showBackupList(): void {
    navigate("/config/backup/list");
  }

  private _showAgentSyncs(event: Event): void {
    const agent = (event.currentTarget as any).agent;
    navigate(`/config/backup/list?agent=${agent}`);
  }

  static styles = css`
    .content {
      padding: 28px 20px 0;
      max-width: 690px;
      margin: 0 auto;
      gap: 24px;
      display: grid;
    }

    .backup-status .card-content {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
    }

    .backup-status-contents {
      display: flex;
      flex-direction: row;
    }

    .status-icon {
      color: var(--success-color);
      height: 100%;
      align-content: center;
    }

    .status-icon ha-icon {
      --mdc-icon-size: 40px;
      padding: 8px 16px 8px 8px;
    }

    .status-header {
      font-size: 22px;
      line-height: 28px;
    }

    .status-text {
      font-size: 14px;
      line-height: 20px;
      color: var(--secondary-text-color);
    }

    ha-button.show-all-backups {
      align-items: center;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-backup-dashboard": HaConfigBackupDashboard;
  }
}
