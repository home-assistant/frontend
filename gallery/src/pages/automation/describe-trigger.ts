import { dump } from "js-yaml";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-yaml-editor";
import type { Trigger } from "../../../../src/data/automation";
import { describeTrigger } from "../../../../src/data/automation_i18n";
import { getEntity } from "../../../../src/fake_data/entity";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import type { HomeAssistant } from "../../../../src/types";

const ENTITIES = [
  getEntity("light", "kitchen", "on", {
    friendly_name: "Kitchen Light",
  }),
  getEntity("person", "person", "", {
    friendly_name: "Person",
  }),
  getEntity("zone", "home", "", {
    friendly_name: "Home",
  }),
];

const triggers = [
  { trigger: "state", entity_id: "light.kitchen", from: "off", to: "on" },
  { trigger: "mqtt" },
  {
    trigger: "geo_location",
    source: "test_source",
    zone: "zone.home",
    event: "enter",
  },
  { trigger: "homeassistant", event: "start" },
  {
    trigger: "numeric_state",
    entity_id: "light.kitchen",
    attribute: "brightness",
    below: 80,
    above: 20,
  },
  { trigger: "sun", event: "sunset" },
  { trigger: "time_pattern" },
  { trigger: "time_pattern", hours: "*", minutes: "/5", seconds: "10" },
  { trigger: "webhook" },
  { trigger: "persistent_notification" },
  {
    trigger: "zone",
    entity_id: "person.person",
    zone: "zone.home",
    event: "enter",
  },
  { trigger: "tag" },
  { trigger: "time", at: "15:32" },
  { trigger: "template" },
  { trigger: "conversation", command: "Turn on the lights" },
  {
    trigger: "conversation",
    command: ["Turn on the lights", "Turn the lights on"],
  },
  { trigger: "event", event_type: "homeassistant_started" },
  {
    triggers: [
      { trigger: "state", entity_id: "light.kitchen", to: "on" },
      { trigger: "state", entity_id: "light.kitchen", to: "off" },
    ],
  },
];

const initialTrigger: Trigger = {
  trigger: "state",
  entity_id: "light.kitchen",
};

@customElement("demo-automation-describe-trigger")
export class DemoAutomationDescribeTrigger extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;

  @state() _trigger = initialTrigger;

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    return html`
      <ha-card header="Triggers">
        <div class="trigger">
          <span>
            ${this._trigger
              ? describeTrigger(this._trigger, this.hass, [])
              : "<invalid YAML>"}
          </span>
          <ha-yaml-editor
            label="Trigger Config"
            .defaultValue=${initialTrigger}
            @value-changed=${this._dataChanged}
          ></ha-yaml-editor>
        </div>
        ${triggers.map(
          (conf) => html`
            <div class="trigger">
              <span>${describeTrigger(conf as any, this.hass, [])}</span>
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
    this._trigger = ev.detail.isValid ? ev.detail.value : undefined;
  }

  static get styles() {
    return css`
      ha-card {
        max-width: 600px;
        margin: 24px auto;
      }
      .trigger {
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
    "demo-automation-describe-trigger": DemoAutomationDescribeTrigger;
  }
}
