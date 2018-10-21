import "@polymer/paper-spinner/paper-spinner.js";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import "./state-history-chart-line.js";
import "./state-history-chart-timeline.js";

import LocalizeMixin from "../mixins/localize-mixin.js";

class StateHistoryCharts extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
    <style>
    :host {
      display: block;
      /* height of single timeline chart = 58px */
      min-height: 58px;
    }
    .info {
      text-align: center;
      line-height: 58px;
      color: var(--secondary-text-color);
    }
    </style>
    <template is="dom-if" class="info" if="[[_computeIsLoading(isLoadingData)]]">
      <div class="info">[[localize('ui.components.history_charts.loading_history')]]</div>
    </template>

    <template is="dom-if" class="info" if="[[_computeIsEmpty(isLoadingData, historyData)]]">
      <div class="info">[[localize('ui.components.history_charts.no_history_found')]]</div>
    </template>

    <template is="dom-if" if="[[historyData.timeline.length]]">
      <state-history-chart-timeline
        hass='[[hass]]'
        data="[[historyData.timeline]]"
        end-time="[[_computeEndTime(endTime, upToNow, historyData)]]"
        no-single="[[noSingle]]"
        names="[[names]]"
      ></state-history-chart-timeline>
    </template>

    <template is="dom-repeat" items="[[historyData.line]]">
      <state-history-chart-line
        hass='[[hass]]'
        unit="[[item.unit]]"
        data="[[item.data]]"
        identifier="[[item.identifier]]"
        is-single-device="[[_computeIsSingleLineChart(item.data, noSingle)]]"
        end-time="[[_computeEndTime(endTime, upToNow, historyData)]]"
        names="[[names]]"
      ></state-history-chart-line>
    </template>
`;
  }

  static get properties() {
    return {
      hass: Object,
      historyData: {
        type: Object,
        value: null,
      },
      names: Object,

      isLoadingData: Boolean,

      endTime: {
        type: Object,
      },

      upToNow: Boolean,
      noSingle: Boolean,
    };
  }

  _computeIsSingleLineChart(data, noSingle) {
    return !noSingle && data && data.length === 1;
  }

  _computeIsEmpty(isLoadingData, historyData) {
    const historyDataEmpty =
      !historyData ||
      !historyData.timeline ||
      !historyData.line ||
      (historyData.timeline.length === 0 && historyData.line.length === 0);
    return !isLoadingData && historyDataEmpty;
  }

  _computeIsLoading(isLoading) {
    return isLoading && !this.historyData;
  }

  _computeEndTime(endTime, upToNow) {
    // We don't really care about the value of historyData, but if it change we want to update
    // endTime.
    return upToNow ? new Date() : endTime;
  }
}
customElements.define("state-history-charts", StateHistoryCharts);
