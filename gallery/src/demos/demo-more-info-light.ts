import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import "../../../src/components/ha-card";
import {
  SUPPORT_BRIGHTNESS,
  SUPPORT_COLOR_TEMP,
  SUPPORT_EFFECT,
  SUPPORT_FLASH,
  SUPPORT_COLOR,
  SUPPORT_TRANSITION,
  SUPPORT_WHITE_VALUE,
} from "../../../src/data/light";
import { getEntity } from "../../../src/fake_data/entity";
import { provideHass } from "../../../src/fake_data/provide_hass";
import "../components/demo-more-infos";
import "../../../src/dialogs/more-info/more-info-content";

const ENTITIES = [
  getEntity("light", "bed_light", "on", {
    friendly_name: "Basic Light",
  }),
  getEntity("light", "kitchen_light", "on", {
    friendly_name: "Brightness Light",
    brightness: 200,
    supported_features: SUPPORT_BRIGHTNESS,
  }),
  getEntity("light", "color_temperature_light", "on", {
    friendly_name: "White Color Temperature Light",
    brightness: 128,
    color_temp: 75,
    min_mireds: 30,
    max_mireds: 150,
    supported_features: SUPPORT_BRIGHTNESS + SUPPORT_COLOR_TEMP,
  }),
  getEntity("light", "color_effectslight", "on", {
    friendly_name: "Color Effets Light",
    brightness: 255,
    hs_color: [30, 100],
    white_value: 36,
    supported_features:
      SUPPORT_BRIGHTNESS +
      SUPPORT_EFFECT +
      SUPPORT_FLASH +
      SUPPORT_COLOR +
      SUPPORT_TRANSITION +
      SUPPORT_WHITE_VALUE,
    effect_list: ["random", "colorloop"],
  }),
];

class DemoMoreInfoLight extends PolymerElement {
  static get template() {
    return html`
      <demo-more-infos
        hass="[[hass]]"
        entities="[[_entities]]"
      ></demo-more-infos>
    `;
  }

  static get properties() {
    return {
      _entities: {
        type: Array,
        value: ENTITIES.map((ent) => ent.entityId),
      },
    };
  }

  public ready() {
    super.ready();
    this._setupDemo();
  }

  private async _setupDemo() {
    const hass = provideHass(this);
    await hass.updateTranslations(null, "en");
    hass.addEntities(ENTITIES);
  }
}

customElements.define("demo-more-info-light", DemoMoreInfoLight);
