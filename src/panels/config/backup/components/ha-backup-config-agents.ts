import { mdiDatabase } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeDomain } from "../../../../common/entity/compute_domain";
import "../../../../components/ha-md-list";
import "../../../../components/ha-md-list-item";
import "../../../../components/ha-switch";
import "../../../../components/ha-svg-icon";
import type { BackupAgent } from "../../../../data/backup";
import {
  computeBackupAgentName,
  fetchBackupAgentsInfo,
  isLocalAgent,
} from "../../../../data/backup";
import type { HomeAssistant } from "../../../../types";
import { brandsUrl } from "../../../../util/brands-url";

const DEFAULT_AGENTS = [];

@customElement("ha-backup-config-agents")
class HaBackupConfigAgents extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _agents: BackupAgent[] = [];

  @state() private value?: string[];

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
    this._fetchAgents();
  }

  private async _fetchAgents() {
    const { agents } = await fetchBackupAgentsInfo(this.hass);
    this._agents = agents;
  }

  private get _value() {
    return this.value ?? DEFAULT_AGENTS;
  }

  protected render() {
    const agentIds = this._agents.map((agent) => agent.agent_id);

    return html`
      ${agentIds.length > 0
        ? html`
            <ha-md-list>
              ${agentIds.map((agentId) => {
                const domain = computeDomain(agentId);
                const name = computeBackupAgentName(
                  this.hass.localize,
                  agentId,
                  agentIds
                );
                return html`
                  <ha-md-list-item>
                    ${isLocalAgent(agentId)
                      ? html`
                          <ha-svg-icon .path=${mdiDatabase} slot="start">
                          </ha-svg-icon>
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

    // Ensure agents exist in the list
    this.value = this.value.filter((agent) =>
      this._agents.some((a) => a.agent_id === agent)
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
