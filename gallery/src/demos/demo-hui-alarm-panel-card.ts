import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { getEntity } from "../../../src/fake_data/entity";
import { provideHass } from "../../../src/fake_data/provide_hass";
import "../components/demo-cards";

const ENTITIES = [
  getEntity("alarm_control_panel", "alarm", "disarmed", {
    friendly_name: "Alarm",
  }),
  getEntity("alarm_control_panel", "alarm_armed", "armed_home", {
    friendly_name: "Alarm",
  }),
  getEntity("alarm_control_panel", "unavailable", "unavailable", {
    friendly_name: "Alarm",
  }),
  getEntity("alarm_control_panel", "alarm_code", "disarmed", {
    friendly_name: "Alarm",
    code_format: "number",
  }),
];

const CONFIGS = [
  {
    heading: "Basic Example",
    config: `
- type: alarm-panel
  entity: alarm_control_panel.alarm
    `,
  },
  {
    heading: "With Title",
    config: `
- type: alarm-panel
  entity: alarm_control_panel.alarm_armed
  name: My Alarm
    `,
  },
  {
    heading: "Code Example",
    config: `
- type: alarm-panel
  entity: alarm_control_panel.alarm_code
    `,
  },
  {
    heading: "Using only Arm_Home State",
    config: `
- type: alarm-panel
  entity: alarm_control_panel.alarm
  states:
    - arm_home
    `,
  },
  {
    heading: "Unavailable",
    config: `
- type: alarm-panel
  entity: alarm_control_panel.unavailable
  states:
    - arm_home
    `,
  },
  {
    heading: "Invalid Entity",
    config: `
- type: alarm-panel
  entity: alarm_control_panel.alarm1
    `,
  },
];

class DemoAlarmPanelEntity extends PolymerElement {
  static get template() {
    return html`
      <demo-cards
        id="demos"
        hass="[[hass]]"
        configs="[[_configs]]"
      ></demo-cards>
    `;
  }

  static get properties() {
    return {
      _configs: {
        type: Object,
        value: CONFIGS,
      },
      hass: Object,
    };
  }

  public ready() {
    super.ready();
    this._setupDemo();
  }

  private async _setupDemo() {
    const hass = provideHass(this.$.demos);
    await hass.updateTranslations(null, "en");
    hass.addEntities(ENTITIES);
  }
}

customElements.define("demo-hui-alarm-panel-card", DemoAlarmPanelEntity);
