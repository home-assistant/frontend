import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { AutomationTraceExtended } from "../../../../data/trace";
import { HomeAssistant } from "../../../../types";
import { LogbookEntry } from "../../../../data/logbook";
import "../../../../components/trace/hat-trace-timeline";
import { NodeInfo } from "../../../../components/trace/hat-graph";

@customElement("ha-automation-trace-timeline")
export class HaAutomationTraceTimeline extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public trace!: AutomationTraceExtended;

  @property() public logbookEntries!: LogbookEntry[];

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
    `;
  }

  static get styles(): CSSResult[] {
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
