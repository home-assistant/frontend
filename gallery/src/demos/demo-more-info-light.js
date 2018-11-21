import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../src/dialogs/more-info/controls/more-info-content";
import "../../../src/components/ha-card";

import getEntity from "../data/entity";
import provideHass from "../data/provide_hass";

import "../components/demo-more-infos";

/* eslint-disable no-unused-vars */

const SUPPORT_BRIGHTNESS = 1;
const SUPPORT_COLOR_TEMP = 2;
const SUPPORT_EFFECT = 4;
const SUPPORT_FLASH = 8;
const SUPPORT_COLOR = 16;
const SUPPORT_TRANSITION = 32;
const SUPPORT_WHITE_VALUE = 128;

const ENTITIES = [
  getEntity("light", "bed_light", "on", {
    friendly_name: "Basic Light",
  }),
  getEntity("light", "kitchen_light", "on", {
    friendly_name: "Brightness Light",
    brightness: 80,
    supported_features: SUPPORT_BRIGHTNESS,
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

  ready() {
    super.ready();
    const hass = provideHass(this);
    hass.addEntities(ENTITIES);
  }
}

customElements.define("demo-more-info-light", DemoMoreInfoLight);
