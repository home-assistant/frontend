import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import type { HomeAssistant } from "../../../../types";
import type { LogbookEntry } from "../../../../data/logbook";
import "../../../../components/trace/hat-logbook-note";
import "../../../logbook/ha-logbook";

@customElement("ha-automation-trace-logbook")
export class HaAutomationTraceLogbook extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public logbookEntries!: LogbookEntry[];

  protected render(): TemplateResult {
    return html`
    return logbookEntries.length
      ? html`
          <ha-logbook
            relative-time
            .hass=${this.hass}
            .entries=${logbookEntries}
            .narrow=${this.narrow}
          ></ha-logbook>
          <hat-logbook-note></hat-logbook-note>
        `
      : html`<div class="padded-box">
          No Logbook entries found for this step.
        </div>`;
  }
    `;
  }

  static get styles(): CSSResult[] {
    return [
      css`
        .padded-box {
          padding: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trace-logbook": HaAutomationTraceLogbook;
  }
}
