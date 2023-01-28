import "@material/mwc-button";
import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { computeStateDisplay } from "../common/entity/compute_state_display";
import "../components/entity/state-info";
import LocalizeMixin from "../mixins/localize-mixin";

/*
 * @appliesMixin LocalizeMixin
 */
class StateCardConfigurator extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style include="iron-flex iron-flex-alignment"></style>
      <style>
        mwc-button {
          top: 3px;
          height: 37px;
          margin-right: -0.57em;
        }
      </style>

      <div class="horizontal justified layout">
        ${this.stateInfoTemplate}
        <mwc-button hidden$="[[inDialog]]"
          >[[_localizeState(stateObj)]]</mwc-button
        >
      </div>

      <!-- pre load the image so the dialog is rendered the proper size -->
      <template is="dom-if" if="[[stateObj.attributes.description_image]]">
        <img hidden="" alt="" src="[[stateObj.attributes.description_image]]" />
      </template>
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

  _localizeState(stateObj) {
    return computeStateDisplay(
      this.hass.localize,
      stateObj,
      this.hass.locale,
      this.hass.entities
    );
  }
}
customElements.define("state-card-configurator", StateCardConfigurator);
