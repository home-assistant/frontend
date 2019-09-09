import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import "@polymer/paper-icon-button/paper-icon-button";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../components/state-history-charts";
import "../../data/ha-state-history-data";
import "../../resources/ha-style";
import "../../state-summary/state-card-content";

import "./controls/more-info-content";

import computeStateName from "../../common/entity/compute_state_name";
import computeStateDomain from "../../common/entity/compute_state_domain";
import isComponentLoaded from "../../common/config/is_component_loaded";
import { DOMAINS_MORE_INFO_NO_HISTORY } from "../../common/const";
import { EventsMixin } from "../../mixins/events-mixin";
import { computeRTL } from "../../common/util/compute_rtl";

const DOMAINS_NO_INFO = ["camera", "configurator", "history_graph"];
/*
 * @appliesMixin EventsMixin
 */
class MoreInfoControls extends EventsMixin(PolymerElement) {
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

        paper-dialog-scrollable {
          padding-bottom: 16px;
        }

        :host([domain="camera"]) paper-dialog-scrollable {
          margin: 0 -24px -21px;
        }

        :host([rtl]) app-toolbar {
          direction: rtl;
          text-align: right;
        }
      </style>

      <app-toolbar>
        <paper-icon-button
          aria-label="Dismiss dialog"
          icon="hass:close"
          dialog-dismiss
        ></paper-icon-button>
        <div class="main-title" main-title="" on-click="enlarge">
          [[_computeStateName(stateObj)]]
        </div>
        <template is="dom-if" if="[[canConfigure]]">
          <paper-icon-button
            icon="hass:settings"
            on-click="_gotoSettings"
          ></paper-icon-button>
        </template>
      </app-toolbar>

      <template is="dom-if" if="[[_computeShowStateInfo(stateObj)]]" restamp="">
        <state-card-content
          state-obj="[[stateObj]]"
          hass="[[hass]]"
          in-dialog=""
        ></state-card-content>
      </template>
      <paper-dialog-scrollable dialog-element="[[dialogElement]]">
        <template
          is="dom-if"
          if="[[_computeShowHistoryComponent(hass, stateObj)]]"
          restamp=""
        >
          <ha-state-history-data
            hass="[[hass]]"
            filter-type="recent-entity"
            entity-id="[[stateObj.entity_id]]"
            data="{{_stateHistory}}"
            is-loading="{{_stateHistoryLoading}}"
            cache-config="[[_cacheConfig]]"
          ></ha-state-history-data>
          <state-history-charts
            hass="[[hass]]"
            history-data="[[_stateHistory]]"
            is-loading-data="[[_stateHistoryLoading]]"
            up-to-now
          ></state-history-charts>
        </template>
        <more-info-content
          state-obj="[[stateObj]]"
          hass="[[hass]]"
        ></more-info-content>
      </paper-dialog-scrollable>
    `;
  }

  static get properties() {
    return {
      hass: Object,

      stateObj: {
        type: Object,
        observer: "_stateObjChanged",
      },

      dialogElement: Object,
      canConfigure: Boolean,

      domain: {
        type: String,
        reflectToAttribute: true,
        computed: "_computeDomain(stateObj)",
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
      rtl: {
        type: Boolean,
        reflectToAttribute: true,
        computed: "_computeRTL(hass)",
      },
    };
  }

  enlarge() {
    this.large = !this.large;
  }

  _computeShowStateInfo(stateObj) {
    return !stateObj || !DOMAINS_NO_INFO.includes(computeStateDomain(stateObj));
  }

  _computeShowHistoryComponent(hass, stateObj) {
    return (
      hass &&
      stateObj &&
      isComponentLoaded(hass, "history") &&
      !DOMAINS_MORE_INFO_NO_HISTORY.includes(computeStateDomain(stateObj))
    );
  }

  _computeDomain(stateObj) {
    return stateObj ? computeStateDomain(stateObj) : "";
  }

  _computeStateName(stateObj) {
    return stateObj ? computeStateName(stateObj) : "";
  }

  _stateObjChanged(newVal) {
    if (!newVal) {
      return;
    }

    if (this._cacheConfig.cacheKey !== `more_info.${newVal.entity_id}`) {
      this._cacheConfig = {
        ...this._cacheConfig,
        cacheKey: `more_info.${newVal.entity_id}`,
      };
    }
  }

  _gotoSettings() {
    this.fire("more-info-page", { page: "settings" });
  }

  _computeRTL(hass) {
    return computeRTL(hass);
  }
}
customElements.define("more-info-controls", MoreInfoControls);
