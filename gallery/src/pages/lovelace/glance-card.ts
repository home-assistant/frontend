import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, query } from "lit/decorators";
import { getEntity } from "../../../../src/fake_data/entity";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../components/demo-cards";

const ENTITIES = [
  getEntity("device_tracker", "demo_paulus", "home", {
    source_type: "gps",
    latitude: 32.877105,
    longitude: 117.232185,
    gps_accuracy: 91,
    battery: 71,
    friendly_name: "Paulus",
  }),
  getEntity("media_player", "living_room", "playing", {
    volume_level: 1,
    is_volume_muted: false,
    media_content_id: "eyU3bRy2x44",
    media_content_type: "movie",
    media_duration: 300,
    media_position: 45.017773,
    media_position_updated_at: "2018-07-19T10:44:45.919514+00:00",
    media_title: "♥♥ The Best Fireplace Video (3 hours)",
    app_name: "YouTube",
    sound_mode: "Dummy Music",
    sound_mode_list: ["Dummy Music", "Dummy Movie"],
    shuffle: false,
    friendly_name: "Living Room",
    entity_picture:
      "/api/media_player_proxy/media_player.living_room?token=e925f8db7f7bd1f317e4524dcb8333d60f6019219a3799a22604b5787f243567&cache=bc2ffb49c4f67034",
    supported_features: 115597,
  }),
  getEntity("sun", "sun", "below_horizon", {
    next_dawn: "2018-07-19T20:48:47+00:00",
    next_dusk: "2018-07-20T11:46:06+00:00",
    next_midnight: "2018-07-19T16:17:28+00:00",
    next_noon: "2018-07-20T04:17:26+00:00",
    next_rising: "2018-07-19T21:16:31+00:00",
    next_setting: "2018-07-20T11:18:22+00:00",
    elevation: 67.69,
    azimuth: 338.55,
    friendly_name: "Sun",
  }),
  getEntity("cover", "kitchen_window", "open", {
    friendly_name: "Kitchen Window",
    supported_features: 11,
  }),
  getEntity("light", "kitchen_lights", "on", {
    friendly_name: "Kitchen Lights",
  }),
  getEntity("light", "ceiling_lights", "off", {
    friendly_name: "Ceiling Lights",
  }),
  getEntity("lock", "kitchen_door", "locked", {
    friendly_name: "Kitchen Door",
  }),
];

const CONFIGS = [
  {
    heading: "Basic example",
    config: `
- type: glance
  entities:
    - device_tracker.demo_paulus
    - media_player.living_room
    - sun.sun
    - cover.kitchen_window
    - light.kitchen_lights
    - lock.kitchen_door
    - light.ceiling_lights
    `,
  },
  {
    heading: "No state colors",
    config: `
- type: glance
  state_color: false
  entities:
    - device_tracker.demo_paulus
    - media_player.living_room
    - sun.sun
    - cover.kitchen_window
    - light.kitchen_lights
    - lock.kitchen_door
    - light.ceiling_lights
    `,
  },
  {
    heading: "With title",
    config: `
- type: glance
  title: Custom title
  columns: 4
  entities:
    - device_tracker.demo_paulus
    - media_player.living_room
    - sun.sun
    - cover.kitchen_window
    - light.kitchen_lights
    - lock.kitchen_door
    - light.ceiling_lights
    `,
  },
  {
    heading: "Custom number of columns",
    config: `
- type: glance
  columns: 7
  entities:
    - device_tracker.demo_paulus
    - media_player.living_room
    - sun.sun
    - cover.kitchen_window
    - light.kitchen_lights
    - lock.kitchen_door
    - light.ceiling_lights
    `,
  },
  {
    heading: "No entity names",
    config: `
- type: glance
  columns: 4
  show_name: false
  entities:
    - device_tracker.demo_paulus
    - media_player.living_room
    - sun.sun
    - cover.kitchen_window
    - light.kitchen_lights
    - lock.kitchen_door
    - light.ceiling_lights
    `,
  },
  {
    heading: "No state labels",
    config: `
- type: glance
  columns: 4
  show_state: false
  entities:
    - device_tracker.demo_paulus
    - media_player.living_room
    - sun.sun
    - cover.kitchen_window
    - light.kitchen_lights
    - lock.kitchen_door
    - light.ceiling_lights
    `,
  },
  {
    heading: "No names and no state labels",
    config: `
- type: glance
  columns: 4
  show_name: false
  show_state: false
  entities:
    - device_tracker.demo_paulus
    - media_player.living_room
    - sun.sun
    - cover.kitchen_window
    - light.kitchen_lights
    - lock.kitchen_door
    - light.ceiling_lights
    `,
  },
  {
    heading: "Custom name + custom icon",
    config: `
- type: glance
  columns: 4
  entities:
    - entity: device_tracker.demo_paulus
      name: ¯\\_(ツ)_/¯
      icon: mdi:home-assistant
    - entity: media_player.living_room
      name: ¯\\_(ツ)_/¯
      icon: mdi:home-assistant
    `,
  },
  {
    heading: "Selectively hidden name",
    config: `
- type: glance
  columns: 4
  entities:
    - device_tracker.demo_paulus
    - entity: media_player.living_room
      name:
    - sun.sun
    - entity: cover.kitchen_window
      name:
    - light.kitchen_lights
    - entity: lock.kitchen_door
      name:
    - light.ceiling_lights
    `,
  },
  {
    heading: "Custom tap action",
    config: `
- type: glance
  columns: 4
  entities:
    - entity: lock.kitchen_door
      name: Custom
      tap_action:
        type: toggle
    - entity: light.ceiling_lights
      name: Custom
      tap_action:
        action: call-service
        service: light.turn_on
        data:
          entity_id: light.ceiling_lights
    - entity: sun.sun
      name: Regular
    - entity: light.kitchen_lights
      name: Regular
    `,
  },
];

@customElement("demo-lovelace-glance-card")
class DemoGlanceEntity extends LitElement {
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
    "demo-lovelace-glance-card": DemoGlanceEntity;
  }
}
