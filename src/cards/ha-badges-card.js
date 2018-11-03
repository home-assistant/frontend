import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../components/entity/ha-state-label-badge";

class HaBadgesCard extends PolymerElement {
  static get template() {
    return html`
    <style>
      ha-state-label-badge {
        display: inline-block;
        margin-bottom: var(--ha-state-label-badge-margin-bottom, 16px);
      }
    </style>
    <template is="dom-repeat" items="[[states]]">
      <ha-state-label-badge hass="[[hass]]" state="[[item]]"></ha-state-label-badge>
    </template>
`;
  }

  static get properties() {
    return {
      hass: Object,
      states: Array,
    };
  }
}
customElements.define("ha-badges-card", HaBadgesCard);
