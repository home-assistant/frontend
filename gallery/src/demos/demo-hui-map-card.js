import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import getEntity from "../data/entity.js";
import provideHass from "../data/provide_hass.js";
import "../components/demo-cards.js";

const ENTITIES = [
  getEntity("device_tracker", "demo_paulus", "not_home", {
    source_type: "gps",
    latitude: 32.877105,
    longitude: 117.232185,
    gps_accuracy: 91,
    battery: 71,
    friendly_name: "Paulus",
  }),
  getEntity("device_tracker", "demo_home_boy", "home", {
    source_type: "gps",
    latitude: 32.87334,
    longitude: 117.22745,
    gps_accuracy: 20,
    battery: 53,
    friendly_name: "Home Boy",
  }),
  getEntity("zone", "home", "zoning", {
    latitude: 32.87354,
    longitude: 117.22765,
    radius: 100,
    friendly_name: "Home",
    icon: "mdi:home",
  }),
];

const CONFIGS = [
  {
    heading: "Without title",
    config: `
- type: map
  entities:
    - entity: device_tracker.demo_paulus
    - device_tracker.demo_home_boy
    - zone.home
    `,
  },
  {
    heading: "With title",
    config: `
- type: map
  entities:
    - entity: device_tracker.demo_paulus
    - zone.home
  title: Where is Paulus?
    `,
  },
  {
    heading: "Height-Width 1:2",
    config: `
- type: map
  entities:
    - entity: device_tracker.demo_paulus
    - zone.home
  aspect_ratio: 50%
    `,
  },
  {
    heading: "Default Zoom",
    config: `
- type: map
  default_zoom: 12
  entities:
    - entity: device_tracker.demo_paulus
    - zone.home
    `,
  },
  {
    heading: "Default Zoom too High",
    config: `
- type: map
  default_zoom: 20
  entities:
    - entity: device_tracker.demo_paulus
    - zone.home
    `,
  },
  {
    heading: "Single Marker",
    config: `
- type: map
  entities:
    - device_tracker.demo_paulus
    `,
  },
  {
    heading: "Single Marker Default Zoom",
    config: `
- type: map
  default_zoom: 8
  entities:
    - device_tracker.demo_paulus
    `,
  },
  {
    heading: "No Entities",
    config: `
- type: map
  entities:
    - light.bed_light
    `,
  },
  {
    heading: "No Entities, Default Zoom",
    config: `
- type: map
  default_zoom: 8
  entities:
    - light.bed_light
    `,
  },
];

class DemoMap extends PolymerElement {
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

  ready() {
    super.ready();
    const hass = provideHass(this.$.demos);
    hass.addEntities(ENTITIES);
  }
}

customElements.define("demo-hui-map-card", DemoMap);
