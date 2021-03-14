import {
  customElement,
  html,
  css,
  LitElement,
  TemplateResult,
  property,
} from "lit-element";
import "../../../src/components/ha-card";
import "../../../src/components/trace/hat-trace";
import { provideHass } from "../../../src/fake_data/provide_hass";
import { HomeAssistant } from "../../../src/types";
import { DemoTrace } from "../data/traces/types";
import { basicTrace } from "../data/traces/basic_trace";
import { motionLightTrace } from "../data/traces/motion-light-trace";
import { deviceTriggerEventTrace } from "../data/traces/device_trigger_event_trace";

const traces: DemoTrace[] = [
  basicTrace,
  motionLightTrace,
  deviceTriggerEventTrace,
];

@customElement("demo-automation-trace")
export class DemoAutomationTrace extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }
    return html`
      ${traces.map(
        (trace) => html`
          <ha-card .heading=${trace.trace.config.alias}>
            <div class="card-content">
              <hat-trace
                .hass=${this.hass}
                .trace=${trace.trace}
                .logbookEntries=${trace.logbookEntries}
              ></hat-trace>
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-automation-trace": DemoAutomationTrace;
  }
}
