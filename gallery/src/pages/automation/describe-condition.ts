import { dump } from "js-yaml";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-yaml-editor";
import { Condition } from "../../../../src/data/automation";
import { describeCondition } from "../../../../src/data/automation_i18n";
import { getEntity } from "../../../../src/fake_data/entity";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import { HomeAssistant } from "../../../../src/types";

const ENTITIES = [
  getEntity("light", "kitchen", "on", {
    friendly_name: "Kitchen Light",
  }),
  getEntity("device_tracker", "person", "home", {
    friendly_name: "Person",
  }),
  getEntity("zone", "home", "", {
    friendly_name: "Home",
  }),
];

const conditions = [
  { condition: "and" },
  { condition: "not" },
  { condition: "or" },
  { condition: "state", entity_id: "light.kitchen", state: "on" },
  {
    condition: "numeric_state",
    entity_id: "light.kitchen",
    attribute: "brightness",
    below: 80,
    above: 20,
  },
  { condition: "sun", after: "sunset" },
  { condition: "sun", after: "sunrise", offset: "-01:00" },
  { condition: "zone", entity_id: "device_tracker.person", zone: "zone.home" },
  { condition: "trigger", id: "motion" },
  { condition: "time" },
  { condition: "template" },
];

const initialCondition: Condition = {
  condition: "state",
  entity_id: "light.kitchen",
  state: "on",
};

@customElement("demo-automation-describe-condition")
export class DemoAutomationDescribeCondition extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;

  @state() _condition = initialCondition;

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    return html`
      <ha-card header="Conditions">
        <div class="condition">
          <span>
            ${this._condition
              ? describeCondition(this._condition, this.hass, [])
              : "<invalid YAML>"}
          </span>
          <ha-yaml-editor
            label="Condition Config"
            .defaultValue=${initialCondition}
            @value-changed=${this._dataChanged}
          ></ha-yaml-editor>
        </div>

        ${conditions.map(
          (conf) => html`
            <div class="condition">
              <span>${describeCondition(conf as any, this.hass, [])}</span>
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
    hass.updateTranslations("config", "en");
    hass.addEntities(ENTITIES);
  }

  private _dataChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    this._condition = ev.detail.isValid ? ev.detail.value : undefined;
  }

  static get styles() {
    return css`
      ha-card {
        max-width: 600px;
        margin: 24px auto;
      }
      .condition {
        padding: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      span {
        margin-right: 16px;
      }
      ha-yaml-editor {
        width: 50%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-automation-describe-condition": DemoAutomationDescribeCondition;
  }
}
