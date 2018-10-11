import "@polymer/iron-flex-layout/iron-flex-layout-classes.js";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import "../components/entity/state-info.js";
import "../components/ha-vacuum-state.js";

class StateCardVacuum extends PolymerElement {
  static get template() {
    return html`
    <style include="iron-flex iron-flex-alignment"></style>

    <div class="horizontal justified layout">
      ${this.stateInfoTemplate}
        <ha-vacuum-state hass="[[hass]]" state-obj="[[stateObj]]"></ha-vacuum-state>
    </div>
`;
  }

  static get stateInfoTemplate() {
    return html`
    <state-info
      hass="[[hass]]"
      state-obj="[[stateObj]]"
      in-dialog="[[inDialog]]"
    ></state-info>
`;
  }

  static get properties() {
    return {
      hass: Object,
      stateObj: Object,
      inDialog: {
        type: Boolean,
        value: false,
      },
    };
  }
}
customElements.define("state-card-vacuum", StateCardVacuum);
