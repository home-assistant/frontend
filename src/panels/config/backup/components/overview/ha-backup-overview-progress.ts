import { mdiCheck, mdiHarddisk, mdiNas } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { isComponentLoaded } from "../../../../../common/config/is_component_loaded";
import { computeDomain } from "../../../../../common/entity/compute_domain";
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
  ["cleaning_up"],
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

  @state() private _collapsingAgents = false;

  @state() private _wasUploadStage = false;

  @state() private _delayingCollapse = false;

  private _collapseTimeout?: ReturnType<typeof setTimeout>;

  override disconnectedCallback() {
    super.disconnectedCallback();
    if (this._collapseTimeout) {
      clearTimeout(this._collapseTimeout);
      this._collapseTimeout = undefined;
    }
  }

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
    const isHassio = isComponentLoaded(this.hass.config, "hassio");

    if (isHassio) {
      // Split creation into 3 sub-segments + Upload + Cleaning up
      return [
        {
          label: this.hass.localize(
            "ui.panel.config.backup.overview.progress.segments.apps"
          ),
          state: this._getSegmentState(0, currentGroupIndex),
          flex: 2,
        },
        {
          label: this.hass.localize(
            "ui.panel.config.backup.overview.progress.segments.media"
          ),
          state: this._getSegmentState(1, currentGroupIndex),
          flex: 2,
        },
        {
          label: this.hass.localize(
            "ui.panel.config.backup.overview.progress.segments.home_assistant"
          ),
          state: this._getSegmentState(2, currentGroupIndex),
          flex: 2,
        },
        {
          label: this.hass.localize(
            "ui.panel.config.backup.overview.progress.segments.upload"
          ),
          state: this._getSegmentState(3, currentGroupIndex),
          flex: 5,
        },
        {
          label: this.hass.localize(
            "ui.panel.config.backup.overview.progress.segments.cleaning_up"
          ),
          state: this._getSegmentState(4, currentGroupIndex),
          flex: 1,
        },
      ];
    }

    // Non-HAOS: No app segment, just Media, HA, Upload and Cleaning up
    return [
      {
        label: this.hass.localize(
          "ui.panel.config.backup.overview.progress.segments.media"
        ),
        state: this._getSegmentState(1, currentGroupIndex),
        flex: 2,
      },
      {
        label: this.hass.localize(
          "ui.panel.config.backup.overview.progress.segments.home_assistant"
        ),
        state: this._getSegmentState(2, currentGroupIndex),
        flex: 2,
      },
      {
        label: this.hass.localize(
          "ui.panel.config.backup.overview.progress.segments.upload"
        ),
        state: this._getSegmentState(3, currentGroupIndex),
        flex: 5,
      },
      {
        label: this.hass.localize(
          "ui.panel.config.backup.overview.progress.segments.cleaning_up"
        ),
        state: this._getSegmentState(4, currentGroupIndex),
        flex: 1,
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

  override willUpdate(changedProps: PropertyValues<this>) {
    if (changedProps.has("manager")) {
      const isUpload = this._isUploadStage;
      if (this._wasUploadStage && !isUpload) {
        // Delay collapse to let the checkmark animation finish
        this._delayingCollapse = true;
        this._collapseTimeout = setTimeout(() => {
          this._delayingCollapse = false;
          this._collapsingAgents = true;
          this._collapseTimeout = undefined;
        }, 300);
      }
      this._wasUploadStage = isUpload;
    }
  }

  private _handleAgentCollapseEnd = () => {
    this._collapsingAgents = false;
  };

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
    const showAgents =
      this._isUploadStage || this._delayingCollapse || this._collapsingAgents;

    if (!showAgents || this.agents.length === 0) {
      return nothing;
    }

    const hasProgress = Object.keys(this.uploadProgress).length > 0;

    if (!hasProgress) {
      return nothing;
    }

    return html`
      <div
        class="agent-list-wrapper ${this._collapsingAgents ? "collapsing" : ""}"
        @animationend=${this._collapsingAgents
          ? this._handleAgentCollapseEnd
          : undefined}
      >
        <ha-md-list class="agent-list">
          ${this.agents.map((agent) => {
            const name = computeBackupAgentName(
              this.hass.localize,
              agent.agent_id,
              this.agents
            );
            const agentPercent = this._computeAgentPercent(agent.agent_id);

            if (agentPercent !== undefined) {
              if (agentPercent >= 100) {
                return html`
                  <ha-md-list-item>
                    ${this._renderAgentIcon(agent.agent_id)}
                    <div slot="headline">${name}</div>
                    <div slot="supporting-text">
                      ${this.hass.localize(
                        "ui.panel.config.backup.overview.progress.agent_status.uploaded"
                      )}
                    </div>
                    <ha-svg-icon
                      slot="end"
                      class="agent-complete"
                      .path=${mdiCheck}
                    ></ha-svg-icon>
                  </ha-md-list-item>
                `;
              }
              return html`
                <ha-md-list-item>
                  ${this._renderAgentIcon(agent.agent_id)}
                  <div slot="headline">${name}</div>
                  <div slot="supporting-text">
                    ${this.hass.localize(
                      "ui.panel.config.backup.overview.progress.agent_status.uploading"
                    )}
                  </div>
                  <span slot="end" class="progress-percentage">
                    ${agentPercent}%
                  </span>
                  <ha-spinner slot="end" size="tiny"></ha-spinner>
                </ha-md-list-item>
              `;
            }

            return html`
              <ha-md-list-item>
                ${this._renderAgentIcon(agent.agent_id)}
                <div slot="headline">${name}</div>
                <div slot="supporting-text">
                  ${this.hass.localize(
                    "ui.panel.config.backup.overview.progress.agent_status.uploading"
                  )}
                </div>
                <ha-spinner slot="end" size="tiny"></ha-spinner>
              </ha-md-list-item>
            `;
          })}
        </ha-md-list>
      </div>
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
        status="none"
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
        @media (prefers-reduced-motion: reduce) {
          .segment-bar.active {
            animation: none;
          }
        }
        .agent-list-wrapper {
          display: grid;
          grid-template-rows: 1fr;
          animation: expand var(--ha-animation-duration-slow, 350ms) ease-out;
        }
        .agent-list-wrapper.collapsing {
          animation: collapse var(--ha-animation-duration-slow, 350ms) ease-out
            forwards;
        }
        @keyframes expand {
          from {
            grid-template-rows: 0fr;
            opacity: 0;
          }
          to {
            grid-template-rows: 1fr;
            opacity: 1;
          }
        }
        @keyframes collapse {
          from {
            grid-template-rows: 1fr;
            opacity: 1;
          }
          to {
            grid-template-rows: 0fr;
            opacity: 0;
          }
        }
        .agent-list {
          background: none;
          padding: 0;
          margin-top: var(--ha-space-4);
          overflow: hidden;
        }
        ha-md-list-item {
          --md-list-item-leading-space: 0;
          --md-list-item-trailing-space: 0;
        }
        ha-md-list-item img {
          width: 48px;
        }
        ha-md-list-item ha-svg-icon[slot="start"] {
          --mdc-icon-size: 48px;
          color: var(--primary-text-color);
        }
        .progress-percentage {
          font-size: var(--ha-font-size-s);
          color: var(--secondary-text-color);
        }
        ha-md-list-item [slot="supporting-text"] {
          display: flex;
          align-items: center;
        }
        .agent-complete {
          color: var(--success-color);
          --mdc-icon-size: 24px;
          animation: pop-in var(--ha-animation-duration-normal, 250ms) ease-out;
        }
        @keyframes pop-in {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
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
