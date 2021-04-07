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
      <ha-logbook
        .hass=${this.hass}
        .entries=${this.logbookEntries}
      ></ha-logbook>
      <hat-logbook-note></hat-logbook-note>
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
    "ha-automation-trace-logbook": HaAutomationTraceLogbook;
  }
}
