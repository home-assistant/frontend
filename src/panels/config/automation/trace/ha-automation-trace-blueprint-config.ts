import { dump } from "js-yaml";
import { html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../components/ha-code-editor";
import "../../../../components/ha-icon-button";
import { AutomationTraceExtended } from "../../../../data/trace";
import { HomeAssistant } from "../../../../types";

@customElement("ha-automation-trace-blueprint-config")
export class HaAutomationTraceBlueprintConfig extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public trace!: AutomationTraceExtended;

  protected render(): TemplateResult {
    return html`
      <ha-code-editor
        .value=${dump(this.trace.blueprint_inputs || "").trimRight()}
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
