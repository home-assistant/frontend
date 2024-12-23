import { mdiHarddisk, mdiNas } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { computeDomain } from "../../../../../common/entity/compute_domain";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-svg-icon";
import "../../../../../components/ha-switch";
import {
  CLOUD_AGENT,
  compareAgents,
  computeBackupAgentName,
  fetchBackupAgentsInfo,
  isLocalAgent,
  isNetworkMountAgent,
} from "../../../../../data/backup";
import type { CloudStatus } from "../../../../../data/cloud";
import type { HomeAssistant } from "../../../../../types";
import { brandsUrl } from "../../../../../util/brands-url";

const DEFAULT_AGENTS = [];

@customElement("ha-backup-config-agents")
class HaBackupConfigAgents extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public cloudStatus!: CloudStatus;

  @state() private _agentIds: string[] = [];

  @state() private value?: string[];

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
    this._fetchAgents();
  }

  private async _fetchAgents() {
    const { agents } = await fetchBackupAgentsInfo(this.hass);
    this._agentIds = agents
      .map((agent) => agent.agent_id)
      .filter((id) => id !== CLOUD_AGENT || this.cloudStatus.logged_in)
      .sort(compareAgents);
  }

  private get _value() {
    return this.value ?? DEFAULT_AGENTS;
  }

  private _description(agentId: string) {
    if (agentId === CLOUD_AGENT) {
      return "Note: It stores only one backup, regardless of your settings.";
    }
    if (isNetworkMountAgent(agentId)) {
      return "Network storage";
    }
    return "";
  }

  protected render() {
    return html`
      ${this._agentIds.length > 0
        ? html`
            <ha-md-list>
              ${this._agentIds.map((agentId) => {
                const domain = computeDomain(agentId);
                const name = computeBackupAgentName(
                  this.hass.localize,
                  agentId,
                  this._agentIds
                );
                const description = this._description(agentId);
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
                    <div slot="headline">${name}</div>
                    ${description
                      ? html`<div slot="supporting-text">${description}</div>`
                      : nothing}
                    <ha-switch
                      slot="end"
                      id=${agentId}
                      .checked=${this._value.includes(agentId)}
                      @change=${this._agentToggled}
                    ></ha-switch>
                  </ha-md-list-item>
                `;
              })}
            </ha-md-list>
          `
        : html`<p>No sync agents configured</p>`}
    `;
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
    this.value = [...new Set(this.value)]
      .filter((agent) => this._agentIds.some((id) => id === agent))
      .filter((id) => id !== CLOUD_AGENT || this.cloudStatus.logged_in);

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
    ha-md-list-item img {
      width: 48px;
    }
    ha-md-list-item ha-svg-icon[slot="start"] {
      --mdc-icon-size: 48px;
      color: var(--primary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-backup-config-agents": HaBackupConfigAgents;
  }
}
