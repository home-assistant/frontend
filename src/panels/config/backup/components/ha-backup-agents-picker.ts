import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeDomain } from "../../../../common/entity/compute_domain";
import "../../../../components/ha-checkbox";
import "../../../../components/ha-formfield";
import {
  computeBackupAgentName,
  type BackupAgent,
} from "../../../../data/backup";
import type { HomeAssistant } from "../../../../types";
import { brandsUrl } from "../../../../util/brands-url";

@customElement("ha-backup-agents-picker")
class HaBackupAgentsPicker extends LitElement {
  @property({ attribute: false })
  public hass!: HomeAssistant;

  @property({ type: Boolean })
  public disabled = false;

  @property({ attribute: false })
  public agents!: BackupAgent[];

  @property({ attribute: false })
  public disabledAgents?: string[];

  @property({ attribute: false })
  public value!: string[];

  private _agentIds = memoizeOne((agents: BackupAgent[]) =>
    agents.map((agent) => agent.agent_id)
  );

  render() {
    return html`
      <div class="agents">
        ${this.agents.map((agent) => this._renderAgent(agent))}
      </div>
    `;
  }

  private _renderAgent(agent: BackupAgent) {
    const domain = computeDomain(agent.agent_id);
    const name = computeBackupAgentName(
      this.hass.localize,
      agent.agent_id,
      this._agentIds(this.agents)
    );

    const disabled =
      this.disabled || this.disabledAgents?.includes(agent.agent_id);

    return html`
      <ha-formfield>
        <span class="label" slot="label">
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
          ${name}
        </span>
        <ha-checkbox
          .checked=${this.value.includes(agent.agent_id)}
          .value=${agent.agent_id}
          .disabled=${disabled}
          @change=${this._checkboxChanged}
        ></ha-checkbox>
      </ha-formfield>
    `;
  }

  private _checkboxChanged(ev: Event) {
    const checkbox = ev.target as HTMLInputElement;
    const value = checkbox.value;
    const index = this.value.indexOf(value);
    if (checkbox.checked && index === -1) {
      this.value = [...this.value, value];
    } else if (!checkbox.checked && index !== -1) {
      this.value = [
        ...this.value.slice(0, index),
        ...this.value.slice(index + 1),
      ];
    }
    fireEvent(this, "value-changed", { value: this.value });
  }

  static styles = css`
    img {
      height: 24px;
      width: 24px;
    }
    .agents {
      display: flex;
      flex-direction: column;
    }
    .label {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 16px;
      font-size: 16px;
      font-weight: 400;
      line-height: 24px;
      letter-spacing: 0.5px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-backup-agents-picker": HaBackupAgentsPicker;
  }
}
