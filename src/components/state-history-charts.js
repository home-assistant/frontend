import Polymer from '../polymer';

require('./loading-box');
require('./state-history-chart-timeline');
require('./state-history-chart-line');

export default Polymer({
  is: 'state-history-charts',

  properties: {
    stateHistory: {
      type: Object,
    },

    isLoadingData: {
      type: Boolean,
      value: false,
    },

    apiLoaded: {
      type: Boolean,
      value: false,
    },

    isLoading: {
      type: Boolean,
      computed: 'computeIsLoading(isLoadingData, apiLoaded)',
    },

    groupedStateHistory: {
      type: Object,
      computed: 'computeGroupedStateHistory(isLoading, stateHistory)',
    },

    isSingleDevice: {
      type: Boolean,
      computed: 'computeIsSingleDevice(stateHistory)',
    },
  },

  computeIsSingleDevice(stateHistory) {
    return stateHistory && stateHistory.size == 1;
  },

  computeGroupedStateHistory(isLoading, stateHistory) {
    if (isLoading || !stateHistory) {
      return {line: [], timeline: []};
    }

    var lineChartDevices = {};
    var timelineDevices = [];

    stateHistory.forEach(function(stateInfo) {
      if (!stateInfo || stateInfo.size === 0) {
        return;
      }

      var stateWithUnit = stateInfo.find(function(state) {
        return 'unit_of_measurement' in state.attributes;
      });

      var unit = stateWithUnit ?
        stateWithUnit.attributes.unit_of_measurement : false;

      if (!unit) {
        timelineDevices.push(stateInfo.toArray());
      } else if(unit in lineChartDevices) {
        lineChartDevices[unit].push(stateInfo.toArray());
      } else {
        lineChartDevices[unit] = [stateInfo.toArray()];
      }
    });

    timelineDevices = timelineDevices.length > 0 && timelineDevices;

    var unitStates = Object.keys(lineChartDevices).map(function(unit) {
      return [unit, lineChartDevices[unit]]; });

    return {line: unitStates, timeline: timelineDevices};
  },

  googleApiLoaded() {
    google.load("visualization", "1", {
      packages: ["timeline", "corechart"],
      callback: function() {
        this.apiLoaded = true;
      }.bind(this)
    });
  },

  computeContentClasses(isLoading) {
    return isLoading ? 'loading' : '';
  },

  computeIsLoading(isLoadingData, apiLoaded) {
    return isLoadingData || !apiLoaded;
  },

  computeIsEmpty(stateHistory) {
    return stateHistory && stateHistory.size === 0;
  },

  extractUnit(arr) {
    return arr[0];
  },

  extractData(arr) {
    return arr[1];
  },
});
