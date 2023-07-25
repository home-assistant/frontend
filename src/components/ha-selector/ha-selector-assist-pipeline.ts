import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { AssistPipelineSelector } from "../../data/selector";
import { HomeAssistant } from "../../types";
import "../ha-assist-pipeline-picker";

@customElement("ha-selector-assist_pipeline")
export class HaAssistPipelineSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: AssistPipelineSelector;

  @property() public value?: any;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  protected render() {
    return html`
      <ha-assist-pipeline-picker
        .hass=${this.hass}
        .value=${this.value}
        .label=${this.label}
        .helper=${this.helper}
        .disabled=${this.disabled}
        .required=${this.required}
        .includeLastUsed=${Boolean(
          this.selector.assist_pipeline?.include_last_used
        )}
      ></ha-assist-pipeline-picker>
    `;
  }

  static styles = css`
    ha-conversation-agent-picker {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-assist_pipeline": HaAssistPipelineSelector;
  }
}
