import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "./hat-logbook-note";
import "./hat-trace-timeline";
import type { LogbookEntry } from "../../data/logbook";
import type { TraceExtended } from "../../data/trace";
import type { HomeAssistant } from "../../types";
import type { NodeInfo } from "./hat-script-graph";

@customElement("ha-trace-timeline")
export class HaTraceTimeline extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trace!: TraceExtended;

  @property({ attribute: false }) public logbookEntries!: LogbookEntry[];

  @property({ attribute: false }) public selected!: NodeInfo;

  protected render(): TemplateResult {
    return html`
      <hat-trace-timeline
        .hass=${this.hass}
        .trace=${this.trace}
        .logbookEntries=${this.logbookEntries}
        .selectedPath=${this.selected.path}
        allowPick
      >
      </hat-trace-timeline>
      <hat-logbook-note .domain=${this.trace.domain}></hat-logbook-note>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        :host {
          display: block;
          padding: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-trace-timeline": HaTraceTimeline;
  }
}
