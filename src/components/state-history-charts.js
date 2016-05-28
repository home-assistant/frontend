import Polymer from '../polymer';

require('./state-history-chart-timeline');
require('./state-history-chart-line');

export default new Polymer({
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
    return stateHistory && stateHistory.size === 1;
  },

  computeGroupedStateHistory(isLoading, stateHistory) {
    if (isLoading || !stateHistory) {
      return { line: [], timeline: [] };
    }

    const lineChartDevices = {};
    let timelineDevices = [];

    stateHistory.forEach((stateInfo) => {
      if (!stateInfo || stateInfo.size === 0) {
        return;
      }

      const stateWithUnit = stateInfo.find(
        (state) => 'unit_of_measurement' in state.attributes);

      const unit = stateWithUnit ?
        stateWithUnit.attributes.unit_of_measurement : false;

      if (!unit) {
        timelineDevices.push(stateInfo.toArray());
      } else if (unit in lineChartDevices) {
        lineChartDevices[unit].push(stateInfo.toArray());
      } else {
        lineChartDevices[unit] = [stateInfo.toArray()];
      }
    });

    timelineDevices = timelineDevices.length > 0 && timelineDevices;

    const unitStates = Object.keys(lineChartDevices).map(
      (unit) => [unit, lineChartDevices[unit]]);

    return { line: unitStates, timeline: timelineDevices };
  },

  googleApiLoaded() {
    window.google.load('visualization', '1', {
      packages: ['timeline', 'corechart'],
      callback: () => { this.apiLoaded = true; },
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
