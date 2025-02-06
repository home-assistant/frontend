import { mdiCog, mdiDelete, mdiHarddisk, mdiNas } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { computeDomain } from "../../../../../common/entity/compute_domain";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-svg-icon";
import "../../../../../components/ha-switch";
import type {
  BackupAgent,
  BackupAgentsConfig,
} from "../../../../../data/backup";
import {
  CLOUD_AGENT,
  computeBackupAgentName,
  isLocalAgent,
  isNetworkMountAgent,
} from "../../../../../data/backup";
import type { CloudStatus } from "../../../../../data/cloud";
import type { HomeAssistant } from "../../../../../types";
import { brandsUrl } from "../../../../../util/brands-url";
import { navigate } from "../../../../../common/navigate";

const DEFAULT_AGENTS = [];

@customElement("ha-backup-config-agents")
class HaBackupConfigAgents extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public cloudStatus!: CloudStatus;

  @property({ attribute: false }) public agents: BackupAgent[] = [];

  @property({ attribute: false }) public agentsConfig?: BackupAgentsConfig;

  @property({ type: Boolean, attribute: "show-settings" }) public showSettings =
    false;

  @state() private value?: string[];

  private get _value() {
    return this.value ?? DEFAULT_AGENTS;
  }

  private _description(agentId: string) {
    if (agentId === CLOUD_AGENT) {
      if (this.cloudStatus.logged_in && !this.cloudStatus.active_subscription) {
        return this.hass.localize(
          "ui.panel.config.backup.agents.cloud_agent_no_subcription"
        );
      }
      return this.hass.localize(
        "ui.panel.config.backup.agents.cloud_agent_description"
      );
    }

    const encryptionTurnedOff =
      this.agentsConfig?.[agentId]?.protected === false;

    if (encryptionTurnedOff) {
      return html`
        <span class="dot warning"></span>
        <span>
          ${this.hass.localize(
            "ui.panel.config.backup.agents.encryption_turned_off"
          )}
        </span>
      `;
    }

    if (isNetworkMountAgent(agentId)) {
      return this.hass.localize(
        "ui.panel.config.backup.agents.network_mount_agent_description"
      );
    }
    return "";
  }

  private _availableAgents = memoizeOne(
    (agents: BackupAgent[], cloudStatus: CloudStatus) =>
      agents.filter(
        (agent) => agent.agent_id !== CLOUD_AGENT || cloudStatus.logged_in
      )
  );

  private _unavailableAgents = memoizeOne(
    (
      agents: BackupAgent[],
      cloudStatus: CloudStatus,
      selectedAgentIds: string[]
    ) => {
      const availableAgentIds = this._availableAgents(agents, cloudStatus).map(
        (agent) => agent.agent_id
      );

      return selectedAgentIds
        .filter((agent) => !availableAgentIds.includes(agent))
        .map<BackupAgent>((id) => ({
          agent_id: id,
          name: id.split(".")[1] || id, // Use the id as name as it is not available in the list
        }));
    }
  );

  private _renderAgentIcon(agentId: string) {
    if (isLocalAgent(agentId)) {
      return html`
        <ha-svg-icon .path=${mdiHarddisk} slot="start"></ha-svg-icon>
      `;
    }

    if (isNetworkMountAgent(agentId)) {
      return html`<ha-svg-icon .path=${mdiNas} slot="start"></ha-svg-icon>`;
    }

    const domain = computeDomain(agentId);

    return html`
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
    `;
  }

  protected render() {
    const availableAgents = this._availableAgents(
      this.agents,
      this.cloudStatus
    );
    const unavailableAgents = this._unavailableAgents(
      this.agents,
      this.cloudStatus,
      this._value
    );

    const allAgents = [...availableAgents, ...unavailableAgents];

    return html`
      ${allAgents.length > 0
        ? html`
            <ha-md-list>
              ${availableAgents.map((agent) => {
                const agentId = agent.agent_id;
                const name = computeBackupAgentName(
                  this.hass.localize,
                  agentId,
                  allAgents
                );
                const description = this._description(agentId);
                const noCloudSubscription =
                  agentId === CLOUD_AGENT &&
                  this.cloudStatus.logged_in &&
                  !this.cloudStatus.active_subscription;

                return html`
                  <ha-md-list-item>
                    ${this._renderAgentIcon(agentId)}
                    <div slot="headline" class="name">${name}</div>
                    ${description
                      ? html`<div slot="supporting-text">${description}</div>`
                      : nothing}
                    ${this.showSettings
                      ? html`
                          <ha-icon-button
                            id=${agentId}
                            slot="end"
                            path=${mdiCog}
                            @click=${this._showAgentSettings}
                          ></ha-icon-button>
                        `
                      : nothing}
                    <ha-switch
                      slot="end"
                      id=${agentId}
                      .checked=${this._value.includes(agentId)}
                      .disabled=${noCloudSubscription &&
                      !this._value.includes(agentId)}
                      @change=${this._agentToggled}
                    ></ha-switch>
                  </ha-md-list-item>
                `;
              })}
              ${unavailableAgents.length > 0 && this.showSettings
                ? html`
                    <p class="heading">
                      ${this.hass.localize(
                        "ui.panel.config.backup.agents.unavailable_agents"
                      )}
                    </p>
                    ${unavailableAgents.map((agent) => {
                      const agentId = agent.agent_id;
                      const name = computeBackupAgentName(
                        this.hass.localize,
                        agentId,
                        allAgents
                      );

                      return html`
                        <ha-md-list-item>
                          ${this._renderAgentIcon(agentId)}
                          <div slot="headline" class="name">${name}</div>
                          <ha-icon-button
                            id=${agentId}
                            slot="end"
                            path=${mdiDelete}
                            @click=${this._deleteAgent}
                          ></ha-icon-button>
                        </ha-md-list-item>
                      `;
                    })}
                  `
                : nothing}
            </ha-md-list>
          `
        : html`
            <p>
              ${this.hass.localize("ui.panel.config.backup.agents.no_agents")}
            </p>
          `}
    `;
  }

  private _showAgentSettings(ev): void {
    const agentId = ev.currentTarget.id;
    navigate(`/config/backup/location/${agentId}`);
  }

  private _deleteAgent(ev): void {
    ev.stopPropagation();
    const agentId = ev.currentTarget.id;
    this.value = this._value.filter((agent) => agent !== agentId);
    fireEvent(this, "value-changed", { value: this.value });
  }

  private _agentToggled(ev) {
    ev.stopPropagation();
    const value = ev.currentTarget.checked;
    const agentId = ev.currentTarget.id;

    if (value) {
      this.value = [...this._value, agentId];
    } else {
      this.value = this._value.filter((agent) => agent !== agentId);
    }

    // Ensure we don't have duplicates, agents exist in the list and cloud is logged in
    this.value = [...new Set(this.value)];

    fireEvent(this, "value-changed", { value: this.value });
  }

  static styles = css`
    ha-md-list {
      background: none;
      --md-list-item-leading-space: 0;
      --md-list-item-trailing-space: 0;
    }
    ha-md-list-item {
      --md-item-overflow: visible;
    }
    ha-md-list-item .name {
      word-break: break-word;
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
      flex-direction: row;
      gap: 8px;
      line-height: normal;
    }
    .dot {
      display: block;
      position: relative;
      width: 8px;
      height: 8px;
      background-color: var(--disabled-color);
      border-radius: 50%;
      flex: none;
    }
    .dot.warning {
      background-color: var(--warning-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-backup-config-agents": HaBackupConfigAgents;
  }
}
