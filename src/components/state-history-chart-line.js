import range from 'lodash/utility/range';

import Polymer from '../polymer';

function saveParseFloat(value) {
  const parsed = parseFloat(value);
  return !isNaN(parsed) && isFinite(parsed) ? parsed : null;
}

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
        0: { title: unit },
      },
      hAxis: {
        format: 'H:mm',
      },
      chartArea: { left: '60', width: '95%' },
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
      const last = states[states.length - 1];
      const domain = last.domain;
      const name = last.entityDisplay;
      const dataTable = new window.google.visualization.DataTable();
      dataTable.addColumn({ type: 'datetime', id: 'Time' });
      const data = [];

      // array containing [time, value1, value2, etc]
      let prevValues;
      function pushData(values, noInterpolations) {
        if (prevValues && noInterpolations) {
          // if we have to prevent interpolation, we add an old value for each
          // value that should not be interpolated at the same time that our new
          // line will be published.
          data.push([values[0]].concat(prevValues.slice(1).map(
            (val, index) => noInterpolations[index] ? val : null)));
        }
        data.push(values);
        prevValues = values;
      }

      if (domain === 'thermostat') {
        // We differentiate between thermostats that have a target temperature
        // range versus ones that have just a target temperature
        const hasTargetRange = states.reduce(
          (cum, cur) => cum || cur.attributes.target_temp_high !== cur.attributes.target_temp_low,
          false);

        dataTable.addColumn('number', `${name} current temperature`);

        let processState;

        if (hasTargetRange) {
          dataTable.addColumn('number', `${name} target temperature high`);
          dataTable.addColumn('number', `${name} target temperature low`);

          const noInterpolations = [false, true, true];

          processState = state => {
            const curTemp = saveParseFloat(state.attributes.current_temperature);
            const targetHigh = saveParseFloat(state.attributes.target_temp_high);
            const targetLow = saveParseFloat(state.attributes.target_temp_low);
            pushData([state.lastChangedAsDate, curTemp, targetHigh, targetLow], noInterpolations);
          };
        } else {
          dataTable.addColumn('number', `${name} target temperature`);

          const noInterpolations = [false, true];

          processState = state => {
            const curTemp = saveParseFloat(state.attributes.current_temperature);
            const target = saveParseFloat(state.attributes.temperature);
            pushData([state.lastChangedAsDate, curTemp, target], noInterpolations);
          };
        }

        states.forEach(processState);
      } else {
        dataTable.addColumn('number', name);

        // Only disable interpolation for sensors
        const noInterpolation = domain !== 'sensor' && [true];

        states.forEach(state => {
          const value = saveParseFloat(state.state);
          pushData([state.lastChangedAsDate, value], noInterpolation);
        });
      }

      // Add an entry for final values
      pushData([endTime].concat(prevValues.slice(1)), false);

      dataTable.addRows(data);
      return dataTable;
    });


    let finalDataTable;

    if (dataTables.length === 1) {
      finalDataTable = dataTables[0];
    } else {
      finalDataTable = dataTables.slice(1).reduce(
        (tot, cur) => window.google.visualization.data.join(
          tot, cur, 'full', [[0, 0]],
          range(1, tot.getNumberOfColumns()),
          range(1, cur.getNumberOfColumns())),
        dataTables[0]);
    }

    this.chartEngine.draw(finalDataTable, options);
  },
});
