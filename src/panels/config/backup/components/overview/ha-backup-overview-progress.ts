import "@material/mwc-linear-progress/mwc-linear-progress";
import { mdiHarddisk, mdiNas } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { computeDomain } from "../../../../../common/entity/compute_domain";
import { blankBeforePercent } from "../../../../../common/translations/blank_before_percent";
import "../../../../../components/ha-expansion-panel";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-spinner";
import "../../../../../components/ha-svg-icon";
import type { BackupAgent } from "../../../../../data/backup";
import {
  computeBackupAgentName,
  isLocalAgent,
  isNetworkMountAgent,
} from "../../../../../data/backup";
import type { ManagerStateEvent } from "../../../../../data/backup_manager";
import type { HomeAssistant } from "../../../../../types";
import { brandsUrl } from "../../../../../util/brands-url";
import "../ha-backup-summary-card";

@customElement("ha-backup-overview-progress")
export class HaBackupOverviewProgress extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public manager!: ManagerStateEvent;

  @property({ attribute: false }) public agents: BackupAgent[] = [];

  @property({ attribute: false }) public uploadProgress: Record<
    string,
    { uploaded_bytes: number; total_bytes: number }
  > = {};

  private get _heading() {
    const managerState = this.manager.manager_state;
    if (managerState === "idle") {
      return "";
    }
    return this.hass.localize(
      `ui.panel.config.backup.overview.progress.heading.${managerState}`
    );
  }

  private get _isUploadStage(): boolean {
    if (this.manager.manager_state === "idle") {
      return false;
    }
    return this.manager.stage === "upload_to_agents";
  }

  private get _description() {
    switch (this.manager.manager_state) {
      case "create_backup":
        if (!this.manager.stage) {
          return "";
        }
        return this.hass.localize(
          `ui.panel.config.backup.overview.progress.description.create_backup.${this.manager.stage}`
        );
      case "restore_backup":
        if (!this.manager.stage) {
          return "";
        }
        return this.hass.localize(
          `ui.panel.config.backup.overview.progress.description.restore_backup.${this.manager.stage}`
        );

      case "receive_backup":
        if (!this.manager.stage) {
          return "";
        }
        return this.hass.localize(
          `ui.panel.config.backup.overview.progress.description.receive_backup.${this.manager.stage}`
        );
      default:
        return "";
    }
  }

  private _computeAgentPercent(agentId: string): number | undefined {
    const progress = this.uploadProgress[agentId];
    if (!progress || progress.total_bytes === 0) {
      return undefined;
    }
    return Math.round((progress.uploaded_bytes / progress.total_bytes) * 100);
  }

  private _computeOverallProgress(): number | undefined {
    const progressValues = Object.values(this.uploadProgress);
    if (progressValues.length === 0) {
      return undefined;
    }
    let totalBytes = 0;
    let uploadedBytes = 0;
    for (const val of progressValues) {
      totalBytes += val.total_bytes;
      uploadedBytes += val.uploaded_bytes;
    }
    if (totalBytes === 0) {
      return undefined;
    }
    return Math.round((uploadedBytes / totalBytes) * 100);
  }

  private _renderAgentIcon(agentId: string) {
    if (isLocalAgent(agentId)) {
      return html`<ha-svg-icon
        slot="start"
        .path=${mdiHarddisk}
      ></ha-svg-icon>`;
    }
    if (isNetworkMountAgent(agentId)) {
      return html`<ha-svg-icon slot="start" .path=${mdiNas}></ha-svg-icon>`;
    }
    const domain = computeDomain(agentId);
    return html`
      <img
        slot="start"
        .src=${brandsUrl({
          domain,
          type: "icon",
          darkOptimized: this.hass.themes?.darkMode,
        })}
        crossorigin="anonymous"
        referrerpolicy="no-referrer"
        alt=""
      />
    `;
  }

  private _renderAgentProgress() {
    if (!this._isUploadStage || this.agents.length === 0) {
      return nothing;
    }

    const hasProgress = Object.keys(this.uploadProgress).length > 0;

    // If no upload progress events received yet, don't show agent details
    if (!hasProgress) {
      return nothing;
    }

    const overallProgress = this._computeOverallProgress();

    return html`
      <div class="upload-progress">
        <div class="overall-progress">
          <mwc-linear-progress
            .indeterminate=${overallProgress === undefined}
            .progress=${overallProgress !== undefined
              ? overallProgress / 100
              : undefined}
            buffer=""
          ></mwc-linear-progress>
          ${overallProgress !== undefined
            ? html`<span class="progress-percentage">
                ${overallProgress}${blankBeforePercent(this.hass.locale)}%
              </span>`
            : nothing}
        </div>

        ${this.agents.length > 1
          ? html`
              <ha-expansion-panel
                .header=${this.hass.localize(
                  "ui.panel.config.backup.overview.progress.agent_progress.title"
                )}
                left-chevron
              >
                <ha-md-list>
                  ${this.agents.map((agent) => {
                    const name = computeBackupAgentName(
                      this.hass.localize,
                      agent.agent_id,
                      this.agents
                    );
                    const agentPercent = this._computeAgentPercent(
                      agent.agent_id
                    );

                    if (agentPercent !== undefined) {
                      return html`
                        <ha-md-list-item>
                          ${this._renderAgentIcon(agent.agent_id)}
                          <div slot="headline">${name}</div>
                          <div slot="supporting-text">
                            <div class="agent-progress">
                              <mwc-linear-progress
                                .progress=${agentPercent / 100}
                                buffer=""
                              ></mwc-linear-progress>
                              <span class="progress-percentage">
                                ${agentPercent}${blankBeforePercent(
                                  this.hass.locale
                                )}%
                              </span>
                            </div>
                          </div>
                        </ha-md-list-item>
                      `;
                    }

                    return html`
                      <ha-md-list-item>
                        ${this._renderAgentIcon(agent.agent_id)}
                        <div slot="headline">${name}</div>
                        <ha-spinner slot="end" size="tiny"></ha-spinner>
                      </ha-md-list-item>
                    `;
                  })}
                </ha-md-list>
              </ha-expansion-panel>
            `
          : nothing}
      </div>
    `;
  }

  protected render() {
    return html`
      <ha-backup-summary-card
        .hass=${this.hass}
        .heading=${this._heading}
        .description=${this._description}
        status="loading"
      >
        ${this._renderAgentProgress()}
      </ha-backup-summary-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        .upload-progress {
          padding: 0 var(--ha-space-4) var(--ha-space-4);
        }
        .overall-progress {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-1);
        }
        .progress-percentage {
          font-size: var(--ha-font-size-s);
          color: var(--secondary-text-color);
          text-align: end;
        }
        mwc-linear-progress {
          width: 100%;
        }
        ha-expansion-panel {
          margin-top: var(--ha-space-3);
          --expansion-panel-summary-padding: 0;
          --expansion-panel-content-padding: 0;
        }
        ha-md-list {
          background: none;
          padding: 0;
        }
        ha-md-list-item {
          --md-list-item-leading-space: 0;
          --md-list-item-trailing-space: 0;
          --md-list-item-two-line-container-height: 64px;
        }
        ha-md-list-item img {
          width: 48px;
        }
        ha-md-list-item ha-svg-icon[slot="start"] {
          --mdc-icon-size: 48px;
          color: var(--primary-text-color);
        }
        ha-md-list-item [slot="supporting-text"] {
          display: flex;
          align-items: center;
        }
        .agent-progress {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-1);
          width: 100%;
        }
        .agent-progress .progress-percentage {
          text-align: end;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-backup-overview-progress": HaBackupOverviewProgress;
  }
}
