import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-md-list";
import "../../../../components/ha-md-list-item";
import type { BackupAgent } from "../../../../data/backup";
import { fetchBackupAgentsInfo } from "../../../../data/backup";
import { domainToName } from "../../../../data/integration";
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
    return html`
      ${this._agents.length > 0
        ? html`
            <ha-md-list>
              ${this._agents.map((agent) => {
                const [domain, name] = agent.agent_id.split(".");
                const domainName = domainToName(this.hass.localize, domain);
                return html`
                  <ha-md-list-item>
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
                    <ha-switch
                      slot="end"
                      id=${agent.agent_id}
                      .checked=${this._value.includes(agent.agent_id)}
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
    fireEvent(this, "value-changed", { value: this.value });
  }

  static styles = css`
    ha-md-list {
      background: none;
      --md-list-item-leading-space: 0;
      --md-list-item-trailing-space: 0;
    }
    ha-md-list-item img {
      width: 48px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-backup-config-agents": HaBackupConfigAgents;
  }
}
