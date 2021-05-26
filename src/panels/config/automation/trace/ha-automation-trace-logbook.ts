import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../components/trace/hat-logbook-note";
import type { LogbookEntry } from "../../../../data/logbook";
import type { HomeAssistant } from "../../../../types";
import "../../../logbook/ha-logbook";

@customElement("ha-automation-trace-logbook")
export class HaAutomationTraceLogbook extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow!: boolean;

  @property({ attribute: false }) public logbookEntries!: LogbookEntry[];

  protected render(): TemplateResult {
    return this.logbookEntries.length
      ? html`
          <ha-logbook
            relative-time
            .hass=${this.hass}
            .entries=${this.logbookEntries}
            .narrow=${this.narrow}
          ></ha-logbook>
          <hat-logbook-note></hat-logbook-note>
        `
      : html`<div class="padded-box">
          No Logbook entries found for this step.
        </div>`;
  }

  static get styles(): CSSResultGroup {
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
