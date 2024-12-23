import { mdiHarddisk, mdiNas } from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeDomain } from "../../../../common/entity/compute_domain";
import "../../../../components/ha-checkbox";
import "../../../../components/ha-formfield";
import "../../../../components/ha-svg-icon";
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
  public agentIds!: string[];

  @property({ attribute: false })
  public disabledAgentIds?: string[];

  @property({ attribute: false })
  public value!: string[];

  render() {
    return html`
      <div class="agents">
        ${this.agentIds.map((agent) => this._renderAgent(agent))}
      </div>
    `;
  }

  private _renderAgent(agentId: string) {
    const domain = computeDomain(agentId);
    const name = computeBackupAgentName(
      this.hass.localize,
      agentId,
      this.agentIds
    );

    const disabled =
      this.disabled || this.disabledAgentIds?.includes(agentId) || false;

    return html`
      <ha-formfield>
        <span class="label ${classMap({ disabled })}" slot="label">
          ${isLocalAgent(agentId)
            ? html`
                <ha-svg-icon .path=${mdiHarddisk} slot="start"> </ha-svg-icon>
              `
            : isNetworkMountAgent(agentId)
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
          .checked=${this.value.includes(agentId)}
          .value=${agentId}
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
      font-size: 16px;
      font-weight: 400;
      line-height: 24px;
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
