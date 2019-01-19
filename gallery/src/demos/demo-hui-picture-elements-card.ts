import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import { getEntity } from "../../../src/fake_data/entity";
import { provideHass } from "../../../src/fake_data/provide_hass";
import "../components/demo-cards";

const ENTITIES = [
  getEntity("light", "bed_light", "on", {
    friendly_name: "Bed Light",
  }),
  getEntity("group", "all_lights", "on", {
    entity_id: ["light.bed_light"],
    order: 8,
    friendly_name: "All Lights",
  }),
  getEntity("camera", "demo_camera", "idle", {
    access_token:
      "2f5bb163fb91cd8770a9494fa5e7eab172d8d34f4aba806eb6b59411b8c720b8",
    friendly_name: "Demo camera",
    entity_picture:
      "/api/camera_proxy/camera.demo_camera?token=2f5bb163fb91cd8770a9494fa5e7eab172d8d34f4aba806eb6b59411b8c720b8",
  }),
  getEntity("binary_sensor", "movement_backyard", "on", {
    friendly_name: "Movement Backyard",
    device_class: "motion",
  }),
];

const CONFIGS = [
  {
    heading: "Card with few elements",
    config: `
- type: picture-elements
  image: /images/floorplan.png
  elements:
    - type: service-button
      title: Lights Off
      style:
        top: 97%
        left: 90%
        padding: 0px
      service: light.turn_off
      service_data:
        entity_id: group.all_lights
    - type: icon
      icon: mdi:cctv
      entity: camera.demo_camera
      style:
        top: 12%
        left: 6%
        transform: rotate(-60deg) scaleX(-1)
        --iron-icon-height: 30px
        --iron-icon-width: 30px
        --iron-icon-stroke-color: black
        --iron-icon-fill-color: rgba(50, 50, 50, .75)
    - type: image
      entity: light.bed_light
      tap_action:
        action: toggle
      image: /images/light_bulb_off.png
      state_image:
        'on': /images/light_bulb_on.png
      state_filter:
        'on': brightness(130%) saturate(1.5) drop-shadow(0px 0px 10px gold)
        'off': brightness(80%) saturate(0.8)
      style:
        top: 35%
        left: 65%
        width: 7%
        padding: 50px 50px 100px 50px
    - type: state-icon
      entity: binary_sensor.movement_backyard
      style:
        top: 8%
        left: 35%
    `,
  },
  {
    heading: "Card with header",
    config: `
- type: picture-elements
  image: /images/floorplan.png
  title: My House
  elements:
    - type: service-button
      title: Lights Off
      style:
        top: 97%
        left: 90%
        padding: 0px
      service: light.turn_off
      service_data:
        entity_id: group.all_lights
    - type: icon
      icon: mdi:cctv
      entity: camera.demo_camera
      style:
        top: 12%
        left: 6%
        transform: rotate(-60deg) scaleX(-1)
        --iron-icon-height: 30px
        --iron-icon-width: 30px
        --iron-icon-stroke-color: black
        --iron-icon-fill-color: rgba(50, 50, 50, .75)
    - type: image
      entity: light.bed_light
      tap_action:
        action: toggle
      image: /images/light_bulb_off.png
      state_image:
        'on': /images/light_bulb_on.png
      state_filter:
        'on': brightness(130%) saturate(1.5) drop-shadow(0px 0px 10px gold)
        'off': brightness(80%) saturate(0.8)
      style:
        top: 35%
        left: 65%
        width: 7%
        padding: 50px 50px 100px 50px
    - type: state-icon
      entity: binary_sensor.movement_backyard
      style:
        top: 8%
        left: 35%
    `,
  },
];

class DemoPicElements extends PolymerElement {
  static get template() {
    return html`
      <demo-cards id="demos" configs="[[_configs]]"></demo-cards>
    `;
  }

  static get properties() {
    return {
      _configs: {
        type: Object,
        value: CONFIGS,
      },
    };
  }

  public ready() {
    super.ready();
    const hass = provideHass(this.$.demos);
    hass.addEntities(ENTITIES);
  }
}

customElements.define("demo-hui-picture-elements-card", DemoPicElements);
