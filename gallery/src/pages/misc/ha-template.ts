import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-template";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import type { HomeAssistant } from "../../../../src/types";
import { getEntity } from "../../../../src/fake_data/entity";

interface TemplateContent {
  content: string;
}

const templates: TemplateContent[] = [
  { content: "{{ states('sensor.temperature') }}" },
  {
    content: "{{ 'Day' if is_state('sun.sun', 'above_horizon') else 'Night' }}",
  },
];

const ENTITIES = [
  getEntity("sensor", "temperature", "25", {
    friendly_name: "Temperature",
  }),
  getEntity("sun", "sun", "above_horizon", {
    friendly_name: "Controller 2",
  }),
];

@customElement("demo-misc-ha-template")
export class DemoMiscTemplate extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  protected firstUpdated() {
    const hass = provideHass(this);
    hass.addEntities(ENTITIES);
  }

  protected render() {
    return html`
      <div class="container">
        ${templates.map(
          (t) =>
            html`<ha-card>
              <pre>Template: ${t.content}</pre>
              <pre>Result: <ha-template
                .hass=${this.hass} .content=${t.content}></ha-template></pre>
            </ha-card>`
        )}
      </div>
    `;
  }

  static styles = css`
    ha-card {
      margin: 12px;
      padding: 12px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-misc-ha-template": DemoMiscTemplate;
  }
}
