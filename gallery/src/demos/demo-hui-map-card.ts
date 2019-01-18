import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import { getEntity } from "../../../src/fake_data/entity";
import { provideHass } from "../../../src/fake_data/provide_hass";
import "../components/demo-cards";

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
  getEntity("zone", "bushfire", "zoning", {
    latitude: -33.8611,
    longitude: 151.203,
    radius: 35000,
    friendly_name: "Bushfire Zone",
    icon: "mdi:home",
  }),
  getEntity("geo_location", "nelsons_creek", "15", {
    source: "bushfire_demo",
    latitude: -34.07792,
    longitude: 151.03219,
    friendly_name: "Nelsons Creek",
  }),
  getEntity("geo_location", "forest_rd_nowra_hill", "8", {
    source: "bushfire_demo",
    latitude: -33.69452,
    longitude: 151.19577,
    friendly_name: "Forest Rd, Nowra Hill",
  }),
  getEntity("geo_location", "stoney_ridge_rd_kremnos", "20", {
    source: "bushfire_demo",
    latitude: -33.66584,
    longitude: 150.97209,
    friendly_name: "Stoney Ridge Rd, Kremnos",
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
  {
    heading: "Geo Location Entities",
    config: `
- type: map
  geo_location_sources:
    - bushfire_demo
    `,
  },
  {
    heading: "Geo Location Entities with Home Zone",
    config: `
- type: map
  geo_location_sources:
    - bushfire_demo
  entities:
    - zone.bushfire
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

  public ready() {
    super.ready();
    const hass = provideHass(this.$.demos);
    hass.addEntities(ENTITIES);
  }
}

customElements.define("demo-hui-map-card", DemoMap);
