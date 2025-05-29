import { mdiHarddisk, mdiNas } from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeDomain } from "../../../../common/entity/compute_domain";
import "../../../../components/ha-checkbox";
import "../../../../components/ha-formfield";
import "../../../../components/ha-svg-icon";
import type { BackupAgent } from "../../../../data/backup";
import {
  computeBackupAgentName,
  isLocalAgent,
  isNetworkMountAgent,
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
  public disabledAgentIds?: string[];

  @property({ attribute: false })
  public value!: string[];

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
      this.agents
    );

    const disabled =
      this.disabled || this.disabledAgentIds?.includes(agent.agent_id) || false;

    return html`
      <ha-formfield>
        <span class="label ${classMap({ disabled })}" slot="label">
          ${isLocalAgent(agent.agent_id)
            ? html`
                <ha-svg-icon .path=${mdiHarddisk} slot="start"> </ha-svg-icon>
              `
            : isNetworkMountAgent(agent.agent_id)
              ? html` <ha-svg-icon .path=${mdiNas} slot="start"></ha-svg-icon> `
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
    ha-svg-icon {
      --mdc-icon-size: 24px;
      color: var(--primary-text-color);
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
      font-size: var(--ha-font-size-l);
      font-weight: var(--ha-font-weight-normal);
      line-height: var(--ha-line-height-normal);
      letter-spacing: 0.5px;
    }
    span.disabled {
      color: var(--disabled-text-color);
    }
    span.disabled ha-svg-icon {
      color: var(--disabled-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-backup-agents-picker": HaBackupAgentsPicker;
  }
}
