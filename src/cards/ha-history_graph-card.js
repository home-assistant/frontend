import "@polymer/paper-card/paper-card";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../components/state-history-charts";
import "../data/ha-state-history-data";

import computeStateName from "../common/entity/compute_state_name";
import { EventsMixin } from "../mixins/events-mixin";

/*
 * @appliesMixin EventsMixin
 */
class HaHistoryGraphCard extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
      <style>
        paper-card:not([dialog]) .content {
          padding: 0 16px 16px;
        }
        paper-card[dialog] {
          padding-top: 16px;
          background-color: transparent;
        }
        paper-card {
          width: 100%;
          /* prevent new stacking context, chart tooltip needs to overflow */
          position: static;
        }
        .header {
          @apply --paper-font-headline;
          line-height: 40px;
          color: var(--primary-text-color);
          padding: 20px 16px 12px;
          @apply --paper-font-common-nowrap;
        }
        paper-card[dialog] .header {
          display: none;
        }
      </style>
      <ha-state-history-data
        hass="[[hass]]"
        filter-type="recent-entity"
        entity-id="[[computeHistoryEntities(stateObj)]]"
        data="{{stateHistory}}"
        is-loading="{{stateHistoryLoading}}"
        cache-config="[[cacheConfig]]"
      ></ha-state-history-data>
      <paper-card
        dialog$="[[inDialog]]"
        on-click="cardTapped"
        elevation="[[computeElevation(inDialog)]]"
      >
        <div class="header">[[computeTitle(stateObj)]]</div>
        <div class="content">
          <state-history-charts
            hass="[[hass]]"
            history-data="[[stateHistory]]"
            is-loading-data="[[stateHistoryLoading]]"
            up-to-now
            no-single
          >
          </state-history-charts>
        </div>
      </paper-card>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      stateObj: {
        type: Object,
        observer: "stateObjObserver",
      },
      inDialog: {
        type: Boolean,
        value: false,
      },
      stateHistory: Object,
      stateHistoryLoading: Boolean,
      cacheConfig: {
        type: Object,
        value: {
          refresh: 0,
          cacheKey: null,
          hoursToShow: 24,
        },
      },
    };
  }

  stateObjObserver(stateObj) {
    if (!stateObj) return;
    if (
      this.cacheConfig.cacheKey !== stateObj.entity_id ||
      this.cacheConfig.refresh !== (stateObj.attributes.refresh || 0) ||
      this.cacheConfig.hoursToShow !== (stateObj.attributes.hours_to_show || 24)
    ) {
      this.cacheConfig = {
        refresh: stateObj.attributes.refresh || 0,
        cacheKey: stateObj.entity_id,
        hoursToShow: stateObj.attributes.hours_to_show || 24,
      };
    }
  }

  computeTitle(stateObj) {
    return computeStateName(stateObj);
  }

  computeContentClass(inDialog) {
    return inDialog ? "" : "content";
  }

  computeHistoryEntities(stateObj) {
    return stateObj.attributes.entity_id;
  }

  computeElevation(inDialog) {
    return inDialog ? 0 : 1;
  }

  cardTapped(ev) {
    const mq = window.matchMedia("(min-width: 610px) and (min-height: 550px)");
    if (mq.matches) {
      ev.stopPropagation();
      this.fire("hass-more-info", { entityId: this.stateObj.entity_id });
    }
  }
}
customElements.define("ha-history_graph-card", HaHistoryGraphCard);
