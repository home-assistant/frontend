/* eslint-disable lit/no-template-arrow */

import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../src/components/ha-card";
import "../../../../src/components/trace/hat-script-graph";
import "../../../../src/components/trace/hat-trace-timeline";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import { HomeAssistant } from "../../../../src/types";
import { basicTrace } from "../../data/traces/basic_trace";
import { motionLightTrace } from "../../data/traces/motion-light-trace";
import { DemoTrace } from "../../data/traces/types";

const traces: DemoTrace[] = [basicTrace, motionLightTrace];

@customElement("demo-automation-trace")
export class DemoAutomationTrace extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;

  @state() private _selected = {};

  protected render() {
    if (!this.hass) {
      return nothing;
    }
    return html`
      ${traces.map(
        (trace, idx) => html`
          <ha-card .header=${trace.trace.config.alias}>
            <div class="card-content">
              <hat-script-graph
                .trace=${trace.trace}
                .selected=${this._selected[idx]}
                @graph-node-selected=${(ev) => {
                  this._selected = { ...this._selected, [idx]: ev.detail.path };
                }}
              ></hat-script-graph>
              <hat-trace-timeline
                allowPick
                .hass=${this.hass}
                .trace=${trace.trace}
                .logbookEntries=${trace.logbookEntries}
                .selectedPath=${this._selected[idx]}
                @value-changed=${(ev) => {
                  this._selected = {
                    ...this._selected,
                    [idx]: ev.detail.value,
                  };
                }}
              ></hat-trace-timeline>
              <button @click=${() => console.log(trace)}>Log trace</button>
            </div>
          </ha-card>
        `
      )}
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    const hass = provideHass(this);
    hass.updateTranslations(null, "en");
  }

  static get styles() {
    return css`
      ha-card {
        max-width: 600px;
        margin: 24px;
      }
      .card-content {
        display: flex;
      }
      .card-content > * {
        margin-right: 16px;
      }
      .card-content > *:last-child {
        margin-right: 0;
      }
      button {
        position: absolute;
        top: 0;
        right: 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-automation-trace": DemoAutomationTrace;
  }
}
