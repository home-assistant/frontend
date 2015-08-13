import pluck from 'lodash/collection/pluck';
import flatten from 'lodash/array/flatten';
import uniq from 'lodash/array/uniq';
import sortBy from 'lodash/collection/sortBy';

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

  /* *************************************************
  The following code gererates line graphs for devices with continuous
  values(which are devices that have a unit_of_measurement values defined).
  On each graph the devices are grouped by their unit of measurement, eg. all
  sensors measuring MB will be a separate line on single graph.  The google
  chart API takes data as a 2 dimensional array in the format:

  DateTime,   device1,  device2,  device3
  2015-04-01, 1,        2,        0
  2015-04-01, 0,        1,        0
  2015-04-01, 2,        1,        1

  NOTE: the first column is a javascript date objects.

  The first thing we do is build up the data with rows for each time of a state
  change and initialise the values to 0.  THen we loop through each device and
  fill in its data.

  **************************************************/
  drawChart() {
    if (!this.isAttached) {
      return;
    }

    const root = Polymer.dom(this);
    const unit = this.unit;
    const deviceStates = this.data;

    while (root.lastChild) {
      root.removeChild(root.lastChild);
    }

    if (deviceStates.length === 0) {
      return;
    }

    const chart = new google.visualization.LineChart(this);
    const dataTable = new google.visualization.DataTable();

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

    // Get a unique list of times of state changes for all the device
    // for a particular unit of measureent.
    let times = pluck(flatten(deviceStates), 'lastChangedAsDate');
    times = sortBy(uniq(times, (e) => e.getTime()));

    const data = [];
    const empty = new Array(deviceStates.length);
    for (let i = 0; i < empty.length; i++) {
      empty[i] = 0;
    }

    let timeIndex = 1;
    const endDate = new Date();

    for (i = 0; i < times.length; i++) {
      // because we only have state changes we add an extra point at the same time
      // that holds the previous state which makes the line display correctly
      const beforePoint = new Date(times[i]);
      data.push([beforePoint].concat(empty));

      data.push([times[i]].concat(empty));
      timeIndex++;
    }
    data.push([endDate].concat(empty));

    let deviceCount = 0;
    deviceStates.forEach((device) => {
      const attributes = device[device.length - 1].attributes;
      dataTable.addColumn('number', attributes.friendly_name);

      let currentState = 0;
      let previousState = 0;
      let lastIndex = 0;
      let count = 0;
      let prevTime = data[0][0];
      device.forEach((state) => {
        currentState = state.state;
        const start = state.lastChangedAsDate;
        if (state.state === 'None') {
          currentState = previousState;
        }
        for (let i = lastIndex; i < data.length; i++) {
          data[i][1 + deviceCount] = parseFloat(previousState);
          // this is where data gets filled in for each time for the particular device
          // because for each time two entries were create we fill the first one with the
          // previous value and the second one with the new value
          if (prevTime.getTime() === data[i][0].getTime() && data[i][0].getTime() === start.getTime()) {
            data[i][1 + deviceCount] = parseFloat(currentState);
            lastIndex = i;
            prevTime = data[i][0];
            break;
          }
          prevTime = data[i][0];
        }

        previousState = currentState;

        count++;
      });

      // fill in the rest of the Array
      for (let i = lastIndex; i < data.length; i++) {
        data[i][1 + deviceCount] = parseFloat(previousState);
      }

      deviceCount++;
    });

    dataTable.addRows(data);
    chart.draw(dataTable, options);
  },
});
