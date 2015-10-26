import range from 'lodash/utility/range';

import Polymer from '../polymer';

export default new Polymer({
  is: 'state-history-chart-line',

  properties: {
    data: {
      type: Object,
      observer: 'dataChanged',
    },

    unit: {
      type: String,
    },

    isSingleDevice: {
      type: Boolean,
      value: false,
    },

    isAttached: {
      type: Boolean,
      value: false,
      observer: 'dataChanged',
    },

    chartEngine: {
      type: Object,
    },
  },

  created() {
    this.style.display = 'block';
  },

  attached() {
    this.isAttached = true;
  },

  dataChanged() {
    this.drawChart();
  },

  drawChart() {
    if (!this.isAttached) {
      return;
    }

    if (!this.chartEngine) {
      this.chartEngine = new window.google.visualization.LineChart(this);
    }

    const unit = this.unit;
    const deviceStates = this.data;

    if (deviceStates.length === 0) {
      return;
    }

    const options = {
      legend: { position: 'top' },
      interpolateNulls: true,
      titlePosition: 'none',
      vAxes: {
        // Adds units to the left hand side of the graph
        0: {title: unit},
      },
      hAxis: {
        format: 'H:mm',
      },
      lineWidth: 1,
      chartArea: { left: '60', width: '95%'},
      explorer: {
        actions: ['dragToZoom', 'rightClickToReset', 'dragToPan'],
        keepInBounds: true,
        axis: 'horizontal',
        maxZoomIn: 0.1,
      },
    };

    if (this.isSingleDevice) {
      options.legend.position = 'none';
      options.vAxes[0].title = null;
      options.chartArea.left = 40;
      options.chartArea.height = '80%';
      options.chartArea.top = 5;
      options.enableInteractivity = false;
    }

    const startTime = new Date(Math.min.apply(
      null, deviceStates.map(states => states[0].lastChangedAsDate)));

    let endTime = new Date(startTime);
    endTime.setDate(endTime.getDate() + 1);
    if (endTime > new Date()) {
      endTime = new Date();
    }

    const dataTables = deviceStates.map(states => {
      // Only do interpolation for sensors, makes no sense for ie. thermostat
      const noInterpolation = states[0].domain !== 'sensor';

      const dataTable = new window.google.visualization.DataTable();
      dataTable.addColumn({ type: 'datetime', id: 'Time' });
      dataTable.addColumn('number', states[states.length - 1].entityDisplay);
      const data = [];

      let prevValue;

      states.forEach(state => {
        const value = parseFloat(state.state);
        if (!isNaN(value) && isFinite(value)) {
          if (noInterpolation) {
            data.push([state.lastChangedAsDate, prevValue]);
          }
          data.push([state.lastChangedAsDate, value]);
          prevValue = value;
        }
      });

      data.push([endTime, prevValue]);

      dataTable.addRows(data);
      return dataTable;
    });


    let finalDataTable;

    if (dataTables.length === 1) {
      finalDataTable = dataTables[0];
    } else {
      finalDataTable = dataTables.slice(1).reduce(
        (tot, cur) => window.google.visualization.data.join(
          tot, cur, 'full', [[0, 0]], range(1, tot.getNumberOfColumns()), [1]),
        dataTables[0]);
    }

    this.chartEngine.draw(finalDataTable, options);
  },
});
