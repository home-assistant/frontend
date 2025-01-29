import { mdiCog, mdiHarddisk, mdiNas } from "@mdi/js";
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

  private _availableAgents = memoizeOne(
    (agents: BackupAgent[], cloudStatus: CloudStatus) =>
      agents.filter(
        (agent) => agent.agent_id !== CLOUD_AGENT || cloudStatus.logged_in
      )
  );

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

  protected render() {
    const agents = this._availableAgents(this.agents, this.cloudStatus);
    return html`
      ${agents.length > 0
        ? html`
            <ha-md-list>
              ${agents.map((agent) => {
                const agentId = agent.agent_id;
                const domain = computeDomain(agentId);
                const name = computeBackupAgentName(
                  this.hass.localize,
                  agentId,
                  this.agents
                );
                const description = this._description(agentId);
                const noCloudSubscription =
                  agentId === CLOUD_AGENT &&
                  this.cloudStatus.logged_in &&
                  !this.cloudStatus.active_subscription;

                return html`
                  <ha-md-list-item>
                    ${isLocalAgent(agentId)
                      ? html`
                          <ha-svg-icon .path=${mdiHarddisk} slot="start">
                          </ha-svg-icon>
                        `
                      : isNetworkMountAgent(agentId)
                        ? html`
                            <ha-svg-icon
                              .path=${mdiNas}
                              slot="start"
                            ></ha-svg-icon>
                          `
                        : html`
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
                          `}
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
                      .checked=${!noCloudSubscription &&
                      this._value.includes(agentId)}
                      .disabled=${noCloudSubscription}
                      @change=${this._agentToggled}
                    ></ha-switch>
                  </ha-md-list-item>
                `;
              })}
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

  private _agentToggled(ev) {
    ev.stopPropagation();
    const value = ev.currentTarget.checked;
    const agentId = ev.currentTarget.id;

    if (value) {
      this.value = [...this._value, agentId];
    } else {
      this.value = this._value.filter((agent) => agent !== agentId);
    }

    const availableAgents = this._availableAgents(
      this.agents,
      this.cloudStatus
    );

    // Ensure we don't have duplicates, agents exist in the list and cloud is logged in
    this.value = [...new Set(this.value)]
      .filter((id) => availableAgents.some((agent) => agent.agent_id === id))
      .filter(
        (id) =>
          id !== CLOUD_AGENT ||
          (this.cloudStatus.logged_in && this.cloudStatus.active_subscription)
      );

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
