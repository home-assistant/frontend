import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, query } from "lit/decorators";
import { getEntity } from "../../../../src/fake_data/entity";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../components/demo-cards";

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
      data:
        entity_id: group.all_lights
    - type: icon
      icon: mdi:cctv
      entity: camera.demo_camera
      style:
        top: 12%
        left: 6%
        transform: rotate(-60deg) scaleX(-1)
        --mdc-icon-size: 30px
        --mdc-icon-stroke-color: black
        --mdc-icon-fill-color: rgba(50, 50, 50, .75)
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
      data:
        entity_id: group.all_lights
    - type: icon
      icon: mdi:cctv
      entity: camera.demo_camera
      style:
        top: 12%
        left: 6%
        transform: rotate(-60deg) scaleX(-1)
        --mdc-icon-size: 30px
        --mdc-icon-stroke-color: black
        --mdc-icon-fill-color: rgba(50, 50, 50, .75)
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

@customElement("demo-lovelace-picture-elements-card")
class DemoPictureElements extends LitElement {
  @query("#demos") private _demoRoot!: HTMLElement;

  protected render(): TemplateResult {
    return html`<demo-cards id="demos" .configs=${CONFIGS}></demo-cards>`;
  }

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    const hass = provideHass(this._demoRoot);
    hass.updateTranslations(null, "en");
    hass.updateTranslations("lovelace", "en");
    hass.addEntities(ENTITIES);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-lovelace-picture-elements-card": DemoPictureElements;
  }
}
