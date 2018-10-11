import "@polymer/iron-flex-layout/iron-flex-layout-classes.js";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import "../components/entity/state-info.js";
import LocalizeMixin from "../mixins/localize-mixin.js";
import HassMediaPlayerEntity from "../util/hass-media-player-model.js";

/*
 * @appliesMixin LocalizeMixin
 */
class StateCardMediaPlayer extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="iron-flex iron-flex-alignment"></style>
    <style>
      :host {
        line-height: 1.5;
      }

      .state {
        @apply --paper-font-common-nowrap;
        @apply --paper-font-body1;
        margin-left: 16px;
        text-align: right;
      }

      .main-text {
        @apply --paper-font-common-nowrap;
        color: var(--primary-text-color);
        text-transform: capitalize;
      }

      .main-text[take-height] {
        line-height: 40px;
      }

      .secondary-text {
        @apply --paper-font-common-nowrap;
        color: var(--secondary-text-color);
      }
    </style>

    <div class="horizontal justified layout">
      ${this.stateInfoTemplate}
      <div class="state">
        <div class="main-text" take-height$="[[!playerObj.secondaryTitle]]">[[computePrimaryText(localize, playerObj)]]</div>
        <div class="secondary-text">[[playerObj.secondaryTitle]]</div>
      </div>
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
      playerObj: {
        type: Object,
        computed: "computePlayerObj(hass, stateObj)",
      },
    };
  }

  computePlayerObj(hass, stateObj) {
    return new HassMediaPlayerEntity(hass, stateObj);
  }

  computePrimaryText(localize, playerObj) {
    return (
      playerObj.primaryTitle ||
      localize(`state.media_player.${playerObj.stateObj.state}`) ||
      localize(`state.default.${playerObj.stateObj.state}`) ||
      playerObj.stateObj.state
    );
  }
}
customElements.define("state-card-media_player", StateCardMediaPlayer);
