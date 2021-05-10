import { safeDump } from "js-yaml";
import {
  css,
  CSSResultGroup,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { AutomationTraceExtended } from "../../../../data/trace";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-code-editor";
import { HomeAssistant } from "../../../../types";

@customElement("ha-automation-trace-config")
export class HaAutomationTraceConfig extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public trace!: AutomationTraceExtended;

  protected render(): TemplateResult {
    return html`
      <ha-code-editor
        .value=${safeDump(this.trace.config).trimRight()}
        readOnly
      ></ha-code-editor>
    `;
  }

  static get styles(): CSSResultGroup {
    return [css``];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trace-config": HaAutomationTraceConfig;
  }
}
