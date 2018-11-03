import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../cards/ha-history_graph-card";
import "../../../components/ha-attributes";

class MoreInfoHistoryGraph extends PolymerElement {
  static get template() {
    return html`
    <style>
    :host {
      display: block;
      margin-bottom: 6px;
    }
    </style>
    <ha-history_graph-card hass="[[hass]]" state-obj="[[stateObj]]" in-dialog="">
    <ha-attributes state-obj="[[stateObj]]"></ha-attributes>
  </ha-history_graph-card>
`;
  }

  static get properties() {
    return {
      hass: Object,
      stateObj: Object,
    };
  }
}
customElements.define("more-info-history_graph", MoreInfoHistoryGraph);
