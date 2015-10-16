import uniq from 'lodash/array/uniq';

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

    const dataTable = new window.google.visualization.DataTable();

    dataTable.addColumn({ type: 'datetime', id: 'Time' });

    const options = {
      legend: { position: 'top' },
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

    // Get a unique list of times of state changes for all the devices
    let times = uniq(deviceStates.map(
                  states => states.map(
                    state => state.lastChangedAsDate)).reduce(
                      (tot, cur) => tot.concat(cur), [])).sort();

    // end time is Math.min(curTime, start time + 1 day)
    let endTime = new Date(times[0]);
    endTime.setDate(endTime.getDate() + 1);
    if (endTime > new Date()) {
      endTime = new Date();
    }

    times = times.concat(endTime);

    // This is going to be an array of arrays. Each array contains:
    // [Time, valueSensor1, valueSensor2, etc]

    // Google Graph requires each data series to have an entry for each point.
    // Since not all sensors have a value for each time, we'll put in the last
    // known value at that point in time.

    // Because we put in last known value, the 'average' line shown between
    // times is incorrect. To fix this, we add each time twice and have
    // transitions shown as a vertical line :-(

    const data = [];
    times.forEach(time => {
      data.push([time]);
      data.push([time]);
    });

    deviceStates.forEach(states => {
      let startIndex = 0;
      let curTime;
      let curValue;

      const nextState = function nextState() {
        if (startIndex === null) {
          return;
        }
        let value;
        for (let ind = startIndex; ind < states.length; ind++) {
          value = parseFloat(states[ind].state);
          if (!isNaN(value) && isFinite(value)) {
            startIndex = ind + 1;
            curValue = value;
            curTime = states[ind].lastChangedAsDate;
            return;
          }
        }
        startIndex = null;
      };

      nextState();

      // no usable states found.
      if (startIndex === null) {
        return;
      }

      dataTable.addColumn('number', states[states.length - 1].entityDisplay);

      times.forEach((time, index) => {
        data[index * 2].push(curValue);
        if (curTime === time) {
          nextState();
        }
        data[index * 2 + 1].push(curValue);
      });
    });

    dataTable.addRows(data);
    this.chartEngine.draw(dataTable, options);
  },
});
