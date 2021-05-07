import {
  css,
  CSSResultGroup,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import type { AutomationTraceExtended } from "../../../../data/trace";
import type { HomeAssistant } from "../../../../types";
import type { LogbookEntry } from "../../../../data/logbook";
import "../../../../components/trace/hat-trace-timeline";
import type { NodeInfo } from "../../../../components/trace/hat-graph";
import "../../../../components/trace/hat-logbook-note";

@customElement("ha-automation-trace-timeline")
export class HaAutomationTraceTimeline extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trace!: AutomationTraceExtended;

  @property({ attribute: false }) public logbookEntries!: LogbookEntry[];

  @property() public selected!: NodeInfo;

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
      <hat-logbook-note></hat-logbook-note>
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
    "ha-automation-trace-timeline": HaAutomationTraceTimeline;
  }
}
