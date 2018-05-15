import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/entity/state-info.js';
import '../util/hass-mixins.js';

/*
 * @appliesMixin window.hassMixins.LocalizeMixin
 */
class StateCardMediaPlayer extends window.hassMixins.LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
    <style is="custom-style" include="iron-flex iron-flex-alignment"></style>
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
      <state-info state-obj="[[stateObj]]" in-dialog="[[inDialog]]"></state-info>
      <div class="state">
        <div class="main-text" take-height\$="[[!playerObj.secondaryTitle]]">[[computePrimaryText(localize, playerObj)]]</div>
        <div class="secondary-text">[[playerObj.secondaryTitle]]</div>
      </div>
    </div>
`;
  }

  static get is() { return 'state-card-media_player'; }

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
        computed: 'computePlayerObj(hass, stateObj)',
      },
    };
  }

  computePlayerObj(hass, stateObj) {
    return new window.HassMediaPlayerEntity(hass, stateObj);
  }

  computePrimaryText(localize, playerObj) {
    return playerObj.primaryTitle
      || localize(`state.media_player.${playerObj.stateObj.state}`)
      || localize(`state.default.${playerObj.stateObj.state}`) || playerObj.stateObj.state;
  }
}
customElements.define(StateCardMediaPlayer.is, StateCardMediaPlayer);
