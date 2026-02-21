import "@material/mwc-linear-progress/mwc-linear-progress";
import { mdiHarddisk, mdiNas } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../../../common/entity/compute_domain";
import { blankBeforePercent } from "../../../../../common/translations/blank_before_percent";
import "../../../../../components/ha-expansion-panel";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-spinner";
import "../../../../../components/ha-svg-icon";
import type { BackupAgent } from "../../../../../data/backup";
import {
  BackupAgentSupportedFeature,
  compareAgents,
  computeBackupAgentName,
  fetchAgentsUploadProgress,
  isLocalAgent,
  isNetworkMountAgent,
  supportsBackupAgentFeature,
} from "../../../../../data/backup";
import type { ManagerStateEvent } from "../../../../../data/backup_manager";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import { brandsUrl } from "../../../../../util/brands-url";
import "../ha-backup-summary-card";

const PROGRESS_POLL_INTERVAL = 1000;

@customElement("ha-backup-overview-progress")
export class HaBackupOverviewProgress extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public manager!: ManagerStateEvent;

  @property({ attribute: false }) public agents: BackupAgent[] = [];

  @state() private _agentProgress: Record<string, number> = {};

  private _pollInterval?: ReturnType<typeof setInterval>;

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

  private get _hasAgentsWithProgress(): boolean {
    return this.agents.some((agent) =>
      supportsBackupAgentFeature(
        agent,
        BackupAgentSupportedFeature.UPLOAD_PROGRESS
      )
    );
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

  public connectedCallback(): void {
    super.connectedCallback();
    if (this._isUploadStage && this._hasAgentsWithProgress) {
      this._startPolling();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stopPolling();
  }

  protected willUpdate(changedProps: PropertyValues): void {
    if (changedProps.has("manager")) {
      if (this._isUploadStage && this._hasAgentsWithProgress) {
        this._startPolling();
      } else {
        this._stopPolling();
        this._agentProgress = {};
      }
    }
  }

  private _startPolling(): void {
    if (this._pollInterval) {
      return;
    }
    this._pollProgress();
    this._pollInterval = setInterval(
      () => this._pollProgress(),
      PROGRESS_POLL_INTERVAL
    );
  }

  private _stopPolling(): void {
    if (this._pollInterval) {
      clearInterval(this._pollInterval);
      this._pollInterval = undefined;
    }
  }

  private async _pollProgress(): Promise<void> {
    try {
      const result = await fetchAgentsUploadProgress(this.hass);
      this._agentProgress = result.agent_upload_progress;
    } catch {
      // Ignore errors during polling
    }
  }

  private _computeOverallProgress(): number | undefined {
    const progressValues = Object.values(this._agentProgress);
    if (progressValues.length === 0) {
      return undefined;
    }
    const sum = progressValues.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / progressValues.length);
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

    const agentsWithProgress = this.agents
      .filter((agent) =>
        supportsBackupAgentFeature(
          agent,
          BackupAgentSupportedFeature.UPLOAD_PROGRESS
        )
      )
      .sort((a, b) => compareAgents(a.agent_id, b.agent_id));
    const agentsWithoutProgress = this.agents
      .filter(
        (agent) =>
          !supportsBackupAgentFeature(
            agent,
            BackupAgentSupportedFeature.UPLOAD_PROGRESS
          )
      )
      .sort((a, b) => compareAgents(a.agent_id, b.agent_id));

    // If no agents support progress, don't show agent details
    if (agentsWithProgress.length === 0) {
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

        ${agentsWithProgress.length + agentsWithoutProgress.length > 1
          ? html`
              <ha-expansion-panel
                .header=${this.hass.localize(
                  "ui.panel.config.backup.overview.progress.agent_progress.title"
                )}
                left-chevron
              >
                <ha-md-list>
                  ${agentsWithProgress.map((agent) => {
                    const progress = this._agentProgress[agent.agent_id];
                    const name = computeBackupAgentName(
                      this.hass.localize,
                      agent.agent_id,
                      this.agents
                    );
                    return html`
                      <ha-md-list-item>
                        ${this._renderAgentIcon(agent.agent_id)}
                        <div slot="headline">${name}</div>
                        <div slot="supporting-text">
                          <div class="agent-progress">
                            <mwc-linear-progress
                              .indeterminate=${progress === undefined}
                              .progress=${progress !== undefined
                                ? progress / 100
                                : undefined}
                              buffer=""
                            ></mwc-linear-progress>
                            ${progress !== undefined
                              ? html`<span class="progress-percentage">
                                  ${Math.round(progress)}${blankBeforePercent(
                                    this.hass.locale
                                  )}%
                                </span>`
                              : nothing}
                          </div>
                        </div>
                      </ha-md-list-item>
                    `;
                  })}
                  ${agentsWithoutProgress.map((agent) => {
                    const name = computeBackupAgentName(
                      this.hass.localize,
                      agent.agent_id,
                      this.agents
                    );
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
      haStyle,
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
