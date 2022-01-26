import { dump } from "js-yaml";
import { html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../ha-code-editor";
import "../ha-icon-button";
import { TraceExtended } from "../../data/trace";
import { HomeAssistant } from "../../types";

@customElement("ha-trace-blueprint-config")
export class HaTraceBlueprintConfig extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trace!: TraceExtended;

  protected render(): TemplateResult {
    return html`
      <ha-code-editor
        .value=${dump(this.trace.blueprint_inputs || "").trimRight()}
        readOnly
        dir="ltr"
      ></ha-code-editor>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-trace-blueprint-config": HaTraceBlueprintConfig;
  }
}
