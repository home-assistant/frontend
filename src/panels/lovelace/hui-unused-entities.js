import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import computeUnusedEntities from "./common/compute-unused-entities";
import createCardElement from "./common/create-card-element";

import "./cards/hui-entities-card";

class HuiUnusedEntities extends PolymerElement {
  static get template() {
    return html`
      <style>
        #root {
          max-width: 600px;
          margin: 0 auto;
          padding: 8px 0;
        }
      </style>
      <div id="root"></div>
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
        observer: "_hassChanged",
      },
      config: {
        type: Object,
        observer: "_configChanged",
      },
    };
  }

  _configChanged(config) {
    const root = this.$.root;
    if (root.lastChild) root.removeChild(root.lastChild);

    const entities = computeUnusedEntities(this.hass, config).map((entity) => ({
      entity,
      secondary_info: "entity-id",
    }));
    const cardConfig = {
      type: "entities",
      title: "Unused entities",
      entities,
      show_header_toggle: false,
    };
    const element = createCardElement(cardConfig);
    element.hass = this.hass;
    root.appendChild(element);
  }

  _hassChanged(hass) {
    const root = this.$.root;
    if (!root.lastChild) return;
    root.lastChild.hass = hass;
  }
}
customElements.define("hui-unused-entities", HuiUnusedEntities);
