import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '../components/entity/state-info.js';
import '../util/hass-mixins.js';
import '../util/hass-util.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
/*
 * @appliesMixin window.hassMixins.LocalizeMixin
 */
class StateCardDisplay extends window.hassMixins.LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
    <style>

      :host {
        @apply(--layout-horizontal);
        @apply(--layout-justified);
        @apply(--layout-baseline);
      }

      state-info {
        flex: 1 1 auto;
        min-width: 0;
      }
      .state {
        @apply --paper-font-body1;
        color: var(--primary-text-color);
        margin-left: 16px;
        text-align: right;
        max-width: 40%;
        flex: 0 0 auto;
      }
      .state.has-unit_of_measurement {
        white-space: nowrap;
      }
    </style>

    <state-info state-obj="[[stateObj]]" in-dialog="[[inDialog]]"></state-info>
    <div class\$="[[computeClassNames(stateObj)]]">[[computeStateDisplay(localize, stateObj, language)]]</div>
`;
  }

  static get is() { return 'state-card-display'; }

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

  computeStateDisplay(localize, stateObj, language) {
    return window.hassUtil.computeStateDisplay(localize, stateObj, language);
  }

  computeClassNames(stateObj) {
    const classes = [
      'state',
      window.hassUtil.attributeClassNames(stateObj, ['unit_of_measurement']),
    ];
    return classes.join(' ');
  }
}
customElements.define(StateCardDisplay.is, StateCardDisplay);
