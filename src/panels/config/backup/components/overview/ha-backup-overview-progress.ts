import "@material/mwc-linear-progress/mwc-linear-progress";
import { mdiHarddisk, mdiNas } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { isComponentLoaded } from "../../../../../common/config/is_component_loaded";
import { computeDomain } from "../../../../../common/entity/compute_domain";
import { blankBeforePercent } from "../../../../../common/translations/blank_before_percent";
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
import type {
  CreateBackupStage,
  ManagerStateEvent,
} from "../../../../../data/backup_manager";
import type { HomeAssistant } from "../../../../../types";
import { brandsUrl } from "../../../../../util/brands-url";
import "../ha-backup-summary-card";

type SegmentState = "pending" | "active" | "completed";

interface ProgressSegment {
  label: string;
  state: SegmentState;
  flex: number;
}

const HA_STAGES: CreateBackupStage[] = ["home_assistant"];

const ADDON_STAGES: CreateBackupStage[] = [
  "addons",
  "apps",
  "addon_repositories",
  "app_repositories",
  "docker_config",
  "await_addon_restarts",
  "await_app_restarts",
];

const MEDIA_STAGES: CreateBackupStage[] = ["folders", "finishing_file"];

// Ordered groups matching actual backend execution order
const STAGE_ORDER: CreateBackupStage[][] = [
  ADDON_STAGES,
  MEDIA_STAGES,
  HA_STAGES,
  ["upload_to_agents"],
];

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
        return "";
      case "restore_backup":
        if (!this.manager.stage) {
          return "";
        }
        return this.hass.localize(
          `ui.panel.config.backup.overview.progress.description.restore_backup.${this.manager.stage}`
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

  private _getStageGroupIndex(stage: CreateBackupStage): number {
    return STAGE_ORDER.findIndex((group) => group.includes(stage));
  }

  private _getSegmentState(
    segmentGroupIndex: number,
    currentGroupIndex: number
  ): SegmentState {
    if (currentGroupIndex > segmentGroupIndex) {
      return "completed";
    }
    if (currentGroupIndex === segmentGroupIndex) {
      return "active";
    }
    return "pending";
  }

  private _computeCreateBackupSegments(): ProgressSegment[] {
    const stage =
      this.manager.manager_state === "create_backup"
        ? this.manager.stage
        : null;

    const currentGroupIndex = stage ? this._getStageGroupIndex(stage) : -1;
    const isHassio = isComponentLoaded(this.hass, "hassio");

    if (isHassio) {
      // Split creation into 3 sub-segments + Upload
      return [
        {
          label: this.hass.localize(
            "ui.panel.config.backup.overview.progress.segments.apps"
          ),
          state: this._getSegmentState(0, currentGroupIndex),
          flex: 1,
        },
        {
          label: this.hass.localize(
            "ui.panel.config.backup.overview.progress.segments.media"
          ),
          state: this._getSegmentState(1, currentGroupIndex),
          flex: 1,
        },
        {
          label: this.hass.localize(
            "ui.panel.config.backup.overview.progress.segments.home_assistant"
          ),
          state: this._getSegmentState(2, currentGroupIndex),
          flex: 1,
        },
        {
          label: this.hass.localize(
            "ui.panel.config.backup.overview.progress.segments.upload"
          ),
          state: this._getSegmentState(3, currentGroupIndex),
          flex: 3,
        },
      ];
    }

    // Non-HAOS: No app segment, just Media, HA and Upload
    return [
      {
        label: this.hass.localize(
          "ui.panel.config.backup.overview.progress.segments.media"
        ),
        state: this._getSegmentState(1, currentGroupIndex),
        flex: 1,
      },
      {
        label: this.hass.localize(
          "ui.panel.config.backup.overview.progress.segments.home_assistant"
        ),
        state: this._getSegmentState(2, currentGroupIndex),
        flex: 1,
      },
      {
        label: this.hass.localize(
          "ui.panel.config.backup.overview.progress.segments.upload"
        ),
        state: this._getSegmentState(3, currentGroupIndex),
        flex: 3,
      },
    ];
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

  private _renderSegmentedProgress() {
    const managerState = this.manager.manager_state;

    let segments: ProgressSegment[];

    if (managerState === "create_backup") {
      segments = this._computeCreateBackupSegments();
    } else {
      return nothing;
    }

    return html`
      <div class="segmented-progress">
        ${segments.map(
          (segment) => html`
            <div class="segment" style="flex: ${segment.flex}">
              <div
                class="segment-bar ${classMap({
                  active: segment.state === "active",
                  completed: segment.state === "completed",
                  pending: segment.state === "pending",
                })}"
              ></div>
              <span class="segment-label">${segment.label}</span>
            </div>
          `
        )}
      </div>
    `;
  }

  private _renderAgentProgress() {
    if (!this._isUploadStage || this.agents.length === 0) {
      return nothing;
    }

    const hasProgress = Object.keys(this.uploadProgress).length > 0;

    if (!hasProgress) {
      return nothing;
    }

    return html`
      <ha-md-list class="agent-list">
        ${this.agents.map((agent) => {
          const name = computeBackupAgentName(
            this.hass.localize,
            agent.agent_id,
            this.agents
          );
          const agentPercent = this._computeAgentPercent(agent.agent_id);

          if (agentPercent !== undefined) {
            return html`
              <ha-md-list-item>
                ${this._renderAgentIcon(agent.agent_id)}
                <div slot="headline" class="agent-headline">
                  <span>${name}</span>
                  <span class="progress-percentage">
                    ${agentPercent}${blankBeforePercent(this.hass.locale)}%
                  </span>
                </div>
                <div slot="supporting-text">
                  <mwc-linear-progress
                    .progress=${agentPercent / 100}
                    buffer=""
                  ></mwc-linear-progress>
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
    `;
  }

  protected render() {
    const segmentedProgress = this._renderSegmentedProgress();
    const agentProgress = this._renderAgentProgress();
    const hasProgressContent =
      segmentedProgress !== nothing || agentProgress !== nothing;

    return html`
      <ha-backup-summary-card
        .hass=${this.hass}
        .heading=${this._heading}
        .description=${this._description}
        status="loading"
      >
        ${hasProgressContent
          ? html`
              <div class="progress-content">
                ${segmentedProgress} ${agentProgress}
              </div>
            `
          : nothing}
      </ha-backup-summary-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        .progress-content {
          padding: var(--ha-space-2) var(--ha-space-4) var(--ha-space-4);
        }
        .segmented-progress {
          display: flex;
          gap: var(--ha-space-2);
        }
        .segment {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-1);
          min-width: 0;
        }
        .segment-bar {
          height: 8px;
          border-radius: var(--ha-border-radius-pill);
          transition: background-color 0.3s ease;
        }
        .segment-bar.pending {
          background-color: var(--divider-color);
        }
        .segment-bar.active {
          background-color: var(--primary-color);
          animation: pulse 1.5s ease-in-out infinite;
        }
        .segment-bar.completed {
          background-color: var(--primary-color);
        }
        .segment-label {
          font-size: var(--ha-font-size-xs);
          color: var(--secondary-text-color);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        mwc-linear-progress {
          width: 100%;
        }
        .agent-list {
          background: none;
          padding: 0;
          margin-top: var(--ha-space-4);
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
        ha-md-list-item [slot="headline"] {
          margin-bottom: var(--ha-space-1);
        }
        .agent-headline {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .progress-percentage {
          font-size: var(--ha-font-size-s);
          color: var(--secondary-text-color);
          flex-shrink: 0;
        }
        ha-md-list-item [slot="supporting-text"] {
          display: flex;
          align-items: center;
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
