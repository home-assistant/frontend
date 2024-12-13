import { dump } from "js-yaml";
import type { TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../ha-code-editor";
import "../ha-icon-button";
import type { TraceExtended } from "../../data/trace";
import type { HomeAssistant } from "../../types";

@customElement("ha-trace-blueprint-config")
export class HaTraceBlueprintConfig extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trace!: TraceExtended;

  protected render(): TemplateResult {
    return html`
      <ha-code-editor
        .value=${dump(this.trace.blueprint_inputs || "").trimRight()}
        read-only
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
