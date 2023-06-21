import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { ConversationAgentSelector } from "../../data/selector";
import { HomeAssistant } from "../../types";
import "../ha-conversation-agent-picker";

@customElement("ha-selector-conversation_agent")
export class HaConversationAgentSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: ConversationAgentSelector;

  @property() public value?: any;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @property({ attribute: false }) public context?: {
    language?: string;
  };

  protected render() {
    return html`<ha-conversation-agent-picker
      .hass=${this.hass}
      .value=${this.value}
      .language=${this.selector.conversation_agent?.language ||
      this.context?.language}
      .label=${this.label}
      .helper=${this.helper}
      .disabled=${this.disabled}
      .required=${this.required}
    ></ha-conversation-agent-picker>`;
  }

  static styles = css`
    ha-conversation-agent-picker {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-conversation_agent": HaConversationAgentSelector;
  }
}
