import { dump } from "js-yaml";
import { html, css, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../src/components/ha-card";
import { describeAction } from "../../../src/data/script_i18n";
import { provideHass } from "../../../src/fake_data/provide_hass";
import { HomeAssistant } from "../../../src/types";

const actions = [
  { wait_template: "{{ true }}", alias: "Something with an alias" },
  { delay: "0:05" },
  { wait_template: "{{ true }}" },
  {
    condition: "template",
    value_template: "{{ true }}",
  },
  { event: "happy_event" },
  {
    device_id: "abcdefgh",
    domain: "plex",
    entity_id: "media_player.kitchen",
  },
  { scene: "scene.kitchen_morning" },
  {
    wait_for_trigger: [
      {
        platform: "state",
        entity_id: "input_boolean.toggle_1",
      },
    ],
  },
  {
    variables: {
      hello: "world",
    },
  },
  {
    service: "input_boolean.toggle",
    target: {
      entity_id: "input_boolean.toggle_4",
    },
  },
];

@customElement("demo-automation-describe-action")
export class DemoAutomationDescribeAction extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }
    return html`
      <ha-card header="Actions">
        ${actions.map(
          (conf) => html`
            <div class="action">
              <span>${describeAction(this.hass, conf as any)}</span>
              <pre>${dump(conf)}</pre>
            </div>
          `
        )}
      </ha-card>
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
        margin: 24px auto;
      }
      .action {
        padding: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      span {
        margin-right: 16px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-automation-describe-action": DemoAutomationDescribeAction;
  }
}
