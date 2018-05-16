import '@polymer/app-layout/app-toolbar/app-toolbar.js';
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../components/state-history-charts.js';
import '../../data/ha-state-history-data.js';
import '../../resources/ha-style.js';
import '../../state-summary/state-card-content.js';
import '../../util/hass-mixins.js';
import './controls/more-info-content.js';

{
  const DOMAINS_NO_INFO = [
    'camera',
    'configurator',
    'history_graph',
  ];
  class MoreInfoControls extends window.hassMixins.EventsMixin(PolymerElement) {
    static get template() {
      return html`
    <style include="ha-style-dialog">
      app-toolbar {
        color: var(--more-info-header-color);
        background-color: var(--more-info-header-background);
      }

      app-toolbar [main-title] {
        @apply --ha-more-info-app-toolbar-title;
      }

      state-card-content {
        display: block;
        padding: 16px;
      }

      state-history-charts {
        max-width: 100%;
        margin-bottom: 16px;
      }

      @media all and (min-width: 451px) and (min-height: 501px) {
        .main-title {
          pointer-events: auto;
          cursor: default;
        }
      }

      :host([domain=camera]) paper-dialog-scrollable {
        margin: 0 -24px -5px;
      }
    </style>

    <app-toolbar>
      <paper-icon-button icon="mdi:close" dialog-dismiss=""></paper-icon-button>
      <div class="main-title" main-title="" on-click="enlarge">[[_computeStateName(stateObj)]]</div>
      <template is="dom-if" if="[[canConfigure]]">
        <paper-icon-button icon="mdi:settings" on-click="_gotoSettings"></paper-icon-button>
      </template>
    </app-toolbar>

    <template is="dom-if" if="[[_computeShowStateInfo(stateObj)]]" restamp="">
      <state-card-content state-obj="[[stateObj]]" hass="[[hass]]" in-dialog=""></state-card-content>
    </template>
    <paper-dialog-scrollable dialog-element="[[dialogElement]]">
      <template is="dom-if" if="[[_computeShowHistoryComponent(hass, stateObj)]]" restamp="">
        <ha-state-history-data hass="[[hass]]" filter-type="recent-entity" entity-id="[[stateObj.entity_id]]" data="{{_stateHistory}}" is-loading="{{_stateHistoryLoading}}" cache-config="[[_cacheConfig]]"></ha-state-history-data>
        <state-history-charts history-data="[[_stateHistory]]" is-loading-data="[[_stateHistoryLoading]]" up-to-now="" no-single="[[large]]"></state-history-charts>
      </template>
      <more-info-content state-obj="[[stateObj]]" hass="[[hass]]"></more-info-content>
    </paper-dialog-scrollable>
`;
    }

    static get properties() {
      return {
        hass: Object,

        stateObj: {
          type: Object,
          observer: '_stateObjChanged',
        },

        dialogElement: Object,
        canConfigure: Boolean,

        domain: {
          type: String,
          reflectToAttribute: true,
          computed: '_computeDomain(stateObj)',
        },

        _stateHistory: Object,
        _stateHistoryLoading: Boolean,

        large: {
          type: Boolean,
          value: false,
          notify: true,
        },

        _cacheConfig: {
          type: Object,
          value: {
            refresh: 60,
            cacheKey: null,
            hoursToShow: 24,
          },
        },
      };
    }

    enlarge() {
      this.large = !this.large;
    }

    _computeShowStateInfo(stateObj) {
      return !stateObj || !DOMAINS_NO_INFO.includes(window.hassUtil.computeDomain(stateObj));
    }

    _computeShowHistoryComponent(hass, stateObj) {
      return hass && stateObj &&
        window.hassUtil.isComponentLoaded(hass, 'history') &&
        !window.hassUtil.DOMAINS_WITH_NO_HISTORY.includes(window.hassUtil.computeDomain(stateObj));
    }

    _computeDomain(stateObj) {
      return stateObj ? window.hassUtil.computeDomain(stateObj) : '';
    }

    _computeStateName(stateObj) {
      return stateObj ? window.hassUtil.computeStateName(stateObj) : '';
    }

    _stateObjChanged(newVal) {
      if (!newVal) {
        return;
      }

      if (this._cacheConfig.cacheKey !== `more_info.${newVal.entity_id}`) {
        this._cacheConfig = Object.assign(
          {}, this._cacheConfig,
          { cacheKey: `more_info.${newVal.entity_id}` }
        );
      }
    }

    _gotoSettings() {
      this.fire('more-info-page', { page: 'settings' });
    }
  }
  customElements.define('more-info-controls', MoreInfoControls);
}
