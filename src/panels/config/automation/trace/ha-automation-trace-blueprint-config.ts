import { safeDump } from "js-yaml";
import {
  css,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-code-editor";
import { HomeAssistant } from "../../../../types";
import { AutomationTraceExtended } from "../../../../data/trace";

@customElement("ha-automation-trace-blueprint-config")
export class HaAutomationTraceBlueprintConfig extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public trace!: AutomationTraceExtended;

  protected render(): TemplateResult {
    return html`
      <ha-code-editor
        .value=${safeDump(this.trace.blueprint_inputs || "").trimRight()}
        readOnly
      ></ha-code-editor>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trace-blueprint-config": HaAutomationTraceBlueprintConfig;
  }
}
