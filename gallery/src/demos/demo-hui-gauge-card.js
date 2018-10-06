import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/demo-cards.js';

const CONFIGS = [
  {
    heading: 'Basic example',
    config: `
- type: gauge
  entity: climate.ecobee
    `
  },
  {
    heading: 'With title',
    config: `
- type: gauge
  title: Temperature
  entity: climate.ecobee
    `
  },
  {
    heading: 'Custom Unit of Measurement',
    config: `
- type: gauge
  entity: climate.ecobee
  unit_of_measurement: Degrees
    `
  },
  {
    heading: 'Setting Severity Levels',
    config: `
- type: gauge
  entity: climate.ecobee
  severity:
    red: 32
    green: 0
    amber: 23
    `
  },
  {
    heading: 'Setting Min and Max Values',
    config: `
- type: gauge
  entity: climate.ecobee
  min: 0
  max: 38
    `
  },
];

class DemoGaugeEntity extends PolymerElement {
  static get template() {
    return html`
      <demo-cards configs="[[_configs]]"></demo-cards>
    `;
  }

  static get properties() {
    return {
      _configs: {
        type: Object,
        value: CONFIGS
      }
    };
  }
}

customElements.define('demo-hui-gauge-card', DemoGaugeEntity);
