import type { TraceExtended } from "../../data/trace";
import type { HomeAssistant } from "../../types";
import type { CSSResultGroup, TemplateResult } from "lit";

import "../ha-code-editor";
import "../ha-icon-button";

import { dump } from "js-yaml";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-trace-config")
export class HaTraceConfig extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trace!: TraceExtended;

  protected render(): TemplateResult {
    return html`
      <ha-code-editor
        .value=${dump(this.trace.config).trimRight()}
        read-only
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
