import { dump } from "js-yaml";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../components/ha-code-editor";
import "../../../../components/ha-icon-button";
import { AutomationTraceExtended } from "../../../../data/trace";
import { HomeAssistant } from "../../../../types";

@customElement("ha-automation-trace-config")
export class HaAutomationTraceConfig extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public trace!: AutomationTraceExtended;

  protected render(): TemplateResult {
    return html`
      <ha-code-editor
        .value=${dump(this.trace.config).trimRight()}
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
