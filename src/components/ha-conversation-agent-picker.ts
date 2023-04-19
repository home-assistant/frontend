import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValueMap,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { stopPropagation } from "../common/dom/stop_propagation";
import { Agent, listAgents } from "../data/conversation";
import { HomeAssistant } from "../types";
import "./ha-list-item";
import "./ha-select";
import type { HaSelect } from "./ha-select";

const NONE = "__NONE_OPTION__";
@customElement("ha-conversation-agent-picker")
export class HaConversationAgentPicker extends LitElement {
  @property() public value?: string;

  @property() public label?: string;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @state() _agents?: Agent[];

  @state() _defaultAgent: string | null = null;

  protected render() {
    if (!this._agents) {
      return nothing;
    }
    const value = this.value ?? (this.required ? this._defaultAgent : NONE);
    return html`
      <ha-select
        .label=${this.label ||
        this.hass!.localize(
          "ui.components.coversation-agent-picker.conversation_agent"
        )}
        .value=${value}
        .required=${this.required}
        .disabled=${this.disabled}
        @selected=${this._changed}
        @closed=${stopPropagation}
        fixedMenuPosition
        naturalMenuWidth
      >
        ${!this.required
          ? html`<ha-list-item .value=${NONE}>
              ${this.hass!.localize(
                "ui.components.coversation-agent-picker.none"
              )}
            </ha-list-item>`
          : nothing}
        ${this._agents.map(
          (agent) =>
            html`<ha-list-item .value=${agent.id}>${agent.name}</ha-list-item>`
        )}
      </ha-select>
    `;
  }

  protected firstUpdated(
    changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.firstUpdated(changedProperties);
    listAgents(this.hass).then((agents) => {
      this._agents = agents.agents;
      this._defaultAgent = agents.default_agent;
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-select {
        width: 100%;
      }
    `;
  }

  private _changed(ev): void {
    const target = ev.target as HaSelect;
    if (
      !this.hass ||
      target.value === "" ||
      target.value === this.value ||
      (this.value === undefined && target.value === NONE)
    ) {
      return;
    }
    this.value = target.value === NONE ? undefined : target.value;
    fireEvent(this, "value-changed", { value: this.value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-conversation-agent-picker": HaConversationAgentPicker;
  }
}
