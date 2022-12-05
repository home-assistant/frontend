import { dump } from "js-yaml";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../ha-code-editor";
import "../ha-icon-button";
import { TraceExtended } from "../../data/trace";
import { HomeAssistant } from "../../types";

@customElement("ha-trace-config")
export class HaTraceConfig extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trace!: TraceExtended;

  protected render(): TemplateResult {
    return html`
      <ha-code-editor
        .value=${dump(this.trace.config).trimRight()}
        readOnly
        dir="ltr"
      ></ha-code-editor>
    `;
  }

  static get styles(): CSSResultGroup {
    return [css``];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-trace-config": HaTraceConfig;
  }
}
