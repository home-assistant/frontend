import Chart from "chart.js";
import "chartjs-chart-timeline";

// This function add a new interaction mode to Chart.js that
// returns one point for every dataset.
Chart.Interaction.modes.neareach = function(chart, e, options) {
  const getRange = {
    x: (a, b) => Math.abs(a.x - b.x),
    y: (a, b) => Math.abs(a.y - b.y),
    // eslint-disable-next-line no-restricted-properties
    xy: (a, b) => Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2),
  };
  const getRangeMax = {
    x: (r) => r,
    y: (r) => r,
    xy: (r) => r * r,
  };
  let position;
  if (e.native) {
    position = {
      x: e.x,
      y: e.y,
    };
  } else {
    position = Chart.helpers.getRelativePosition(e, chart);
  }
  const elements = [];
  const elementsRange = [];
  const datasets = chart.data.datasets;
  let meta;
  options.axis = options.axis || "xy";
  const rangeFunc = getRange[options.axis];
  const rangeMaxFunc = getRangeMax[options.axis];

  for (let i = 0, ilen = datasets.length; i < ilen; ++i) {
    if (!chart.isDatasetVisible(i)) {
      continue;
    }

    meta = chart.getDatasetMeta(i);
    for (let j = 0, jlen = meta.data.length; j < jlen; ++j) {
      const element = meta.data[j];
      if (!element._view.skip) {
        const vm = element._view;
        const range = rangeFunc(vm, position);
        const oldRange = elementsRange[i];
        if (range < rangeMaxFunc(vm.radius + vm.hitRadius)) {
          if (oldRange === undefined || oldRange > range) {
            elementsRange[i] = range;
            elements[i] = element;
          }
        }
      }
    }
  }
  const ret = elements.filter((n) => n !== undefined);
  return ret;
};

export default Chart;
