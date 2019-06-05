import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../src/dialogs/more-info/controls/more-info-content";
import "../../../src/components/ha-card";

import { getEntity } from "../../../src/fake_data/entity";
import { provideHass } from "../../../src/fake_data/provide_hass";

import "../components/demo-more-infos";
import { SUPPORT_BRIGHTNESS } from "../../../src/data/light";

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

  public ready() {
    super.ready();
    const hass = provideHass(this);
    hass.addEntities(ENTITIES);
  }
}

customElements.define("demo-more-info-light", DemoMoreInfoLight);
