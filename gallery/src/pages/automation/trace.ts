/* eslint-disable lit/no-template-arrow */

import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, queryAll, state } from "lit/decorators";
import "../../../../src/components/ha-card";
import "../../../../src/components/trace/ha-trace-path-details";
import type { HatScriptGraph } from "../../../../src/components/trace/hat-script-graph";
import "../../../../src/components/trace/hat-script-graph";
import "../../../../src/components/trace/hat-trace-timeline";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import type { HomeAssistant } from "../../../../src/types";
import { basicTrace } from "../../data/traces/basic_trace";
import { motionLightTrace } from "../../data/traces/motion-light-trace";
import { notTriggeredTrace } from "../../data/traces/not-triggered-trace";
import type { DemoTrace } from "../../data/traces/types";

const traces: DemoTrace[] = [basicTrace, motionLightTrace, notTriggeredTrace];

@customElement("demo-automation-trace")
export class DemoAutomationTrace extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;

  @state() private _selected = {};

  @queryAll("hat-script-graph") private _graphs!: NodeListOf<HatScriptGraph>;

  protected render() {
    if (!this.hass) {
      return nothing;
    }
    return html`
      ${traces.map((trace, idx) => {
        const graph = this._graphs?.[idx];
        const selectedPath = this._selected[idx];
        const selectedNode = selectedPath
          ? graph?.renderedNodes[selectedPath]
          : undefined;
        return html`
          <ha-card .header=${trace.trace.config.alias}>
            <div class="card-content">
              <hat-script-graph
                .trace=${trace.trace}
                .selected=${selectedPath}
                @graph-node-selected=${this._handleGraphNodeSelected}
                .sampleIdx=${idx}
              ></hat-script-graph>
              <hat-trace-timeline
                allow-pick
                .hass=${this.hass}
                .trace=${trace.trace}
                .logbookEntries=${trace.logbookEntries}
                .selectedPath=${selectedPath}
                @value-changed=${this._handleTimelineValueChanged}
                .sampleIdx=${idx}
              ></hat-trace-timeline>
              ${selectedNode && graph
                ? html`<ha-trace-path-details
                    .hass=${this.hass}
                    .trace=${trace.trace}
                    .selected=${selectedNode}
                    .logbookEntries=${trace.logbookEntries}
                    .trackedNodes=${graph.trackedNodes}
                    .renderedNodes=${graph.renderedNodes}
                  ></ha-trace-path-details>`
                : nothing}
              <button @click=${() => console.log(trace)}>Log trace</button>
            </div>
          </ha-card>
        `;
      })}
    `;
  }

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    const hass = provideHass(this);
    hass.updateTranslations(null, "en");
    hass.updateTranslations("config", "en");
  }

  private _handleTimelineValueChanged(ev) {
    const sampleIdx = ev.target.sampleIdx;
    this._selected = { ...this._selected, [sampleIdx]: ev.detail.value };
  }

  private _handleGraphNodeSelected(ev) {
    const sampleIdx = ev.target.sampleIdx;
    this._selected = { ...this._selected, [sampleIdx]: ev.detail.path };
  }

  static styles = css`
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

declare global {
  interface HTMLElementTagNameMap {
    "demo-automation-trace": DemoAutomationTrace;
  }
}
