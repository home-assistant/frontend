import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../src/panels/lovelace/cards/hui-glance-card.js';

import HomeAssistant from '../data/hass.js';
import demoStates from '../data/demo_dump.js';

const CONFIGS = [
  {
    heading: 'Basic example',
    yaml: `- type: entities
    title: Entities card sample
    show_header_toggle: true
    entities:
      - entity: alarm_control_panel.alarm
        name: Alarm Panel
      - device_tracker.demo_paulus
      - switch.decorative_lights
      - group.all_lights
      - group.all_locks`,
    json: {
      entities: [
        'binary_sensor.movement_backyard',
        'light.bed_light',
        'binary_sensor.basement_floor_wet',
        'sensor.outside_temperature',
        'light.ceiling_lights',
        'switch.ac',
        'lock.kitchen_door'
      ],
      type: 'glance',
      title: 'Glance card sample'
    }
  },
  {
    heading: 'Without title',
    yaml: `- type: entities
    title: Entities card sample
    show_header_toggle: true
    entities:
      - entity: alarm_control_panel.alarm
        name: Alarm Panel
      - device_tracker.demo_paulus
      - switch.decorative_lights
      - group.all_lights
      - group.all_locks`,
    json: {
      entities: [
        'binary_sensor.movement_backyard',
        'light.bed_light',
        'binary_sensor.basement_floor_wet',
        'sensor.outside_temperature',
        'light.ceiling_lights',
        'switch.ac',
        'lock.kitchen_door'
      ],
      type: 'glance',
    }
  }

  ,{
    heading: 'Without title',
    yaml: `- type: entities
    title: Entities card sample
    show_header_toggle: true
    entities:
      - entity: alarm_control_panel.alarm
        name: Alarm Panel
      - device_tracker.demo_paulus
      - switch.decorative_lights
      - group.all_lights
      - group.all_locks`,
    json: {
      entities: [
        'binary_sensor.movement_backyard',
        'light.bed_light',
        'binary_sensor.basement_floor_wet',
        'sensor.outside_temperature',
        'light.ceiling_lights',
        'switch.ac',
        'lock.kitchen_door'
      ],
      type: 'glance',
    }
  },
  {
    heading: 'Without title',
    yaml: `- type: entities
    title: Entities card sample
    show_header_toggle: true
    entities:
      - entity: alarm_control_panel.alarm
        name: Alarm Panel
      - device_tracker.demo_paulus
      - switch.decorative_lights
      - group.all_lights
      - group.all_locks`,
    json: {
      entities: [
        'binary_sensor.movement_backyard',
        'light.bed_light',
        'binary_sensor.basement_floor_wet',
        'sensor.outside_temperature',
        'light.ceiling_lights',
        'switch.ac',
        'lock.kitchen_door'
      ],
      type: 'glance',
    }
  },
  {
    heading: 'Without title',
    yaml: `- type: entities
    title: Entities card sample
    show_header_toggle: true
    entities:
      - entity: alarm_control_panel.alarm
        name: Alarm Panel
      - device_tracker.demo_paulus
      - switch.decorative_lights
      - group.all_lights
      - group.all_locks`,
    json: {
      entities: [
        'binary_sensor.movement_backyard',
        'light.bed_light',
        'binary_sensor.basement_floor_wet',
        'sensor.outside_temperature',
        'light.ceiling_lights',
        'switch.ac',
        'lock.kitchen_door'
      ],
      type: 'glance',
    }
  }
];

class DemoPicEntity extends PolymerElement {
  static get template() {
    return html`
      <style>
        #root {
          display: flex;
          flex-wrap: wrap;
        }
        div {
          flex: 0 1 600px;
          padding: 8px;
        }
        h2 {
          margin: 0;
          color: #03a9f4;
        }
        hui-glance-card {
          margin-left: 20px;
          margin-top: 20px;
        }
      </style>
      <div id="root">
      </div>
    `;
  }

  ready() {
    super.ready();

    const root = this.$.root;
    const hass = new HomeAssistant();
    hass.states = demoStates;
    console.log(demoStates);
    CONFIGS.forEach((item) => {
      const container = document.createElement('div');
      const heading = document.createElement('h2');
      heading.innerText = item.heading;
      container.appendChild(heading);
      const el = document.createElement('hui-glance-card');
      el.setConfig(item.json);
      el.hass = hass;
      container.appendChild(el);
      const yaml = document.createElement('pre');
      yaml.innerText = item.yaml;
      container.appendChild(yaml);
      root.appendChild(container);
    });
  }
}

customElements.define('demo-hui-glance-card', DemoPicEntity);
