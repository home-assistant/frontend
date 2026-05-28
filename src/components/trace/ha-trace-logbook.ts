import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { consumeLocalize } from "../../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../../common/translations/localize";
import type { LogbookEntry } from "../../data/logbook";
import type { HomeAssistant } from "../../types";
import "./hat-logbook-note";
import "../../panels/logbook/ha-logbook-renderer";
import type { TraceExtended } from "../../data/trace";

@customElement("ha-trace-logbook")
export class HaTraceLogbook extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: false }) public trace!: TraceExtended;

  @property({ attribute: false }) public logbookEntries!: LogbookEntry[];

  @consumeLocalize()
  private _localize!: LocalizeFunc;

  protected render(): TemplateResult {
    return this.logbookEntries.length
      ? html`
          <ha-logbook-renderer
            relative-time
            .hass=${this.hass}
            .entries=${this.logbookEntries}
            .narrow=${this.narrow}
          ></ha-logbook-renderer>
          <hat-logbook-note .domain=${this.trace.domain}></hat-logbook-note>
        `
      : html`<div class="padded-box">
          ${this._localize(
            "ui.panel.config.automation.trace.path.no_logbook_entries"
          )}
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
    "ha-trace-logbook": HaTraceLogbook;
  }
}
