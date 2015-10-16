import Polymer from '../polymer';

export default new Polymer({
  is: 'state-history-chart-timeline',

  properties: {
    data: {
      type: Object,
      observer: 'dataChanged',
    },

    isAttached: {
      type: Boolean,
      value: false,
      observer: 'dataChanged',
    },
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
    const root = Polymer.dom(this);
    const stateHistory = this.data;

    while (root.node.lastChild) {
      root.node.removeChild(root.node.lastChild);
    }

    if (!stateHistory || stateHistory.length === 0) {
      return;
    }

    const chart = new window.google.visualization.Timeline(this);
    const dataTable = new window.google.visualization.DataTable();

    dataTable.addColumn({ type: 'string', id: 'Entity' });
    dataTable.addColumn({ type: 'string', id: 'State' });
    dataTable.addColumn({ type: 'date', id: 'Start' });
    dataTable.addColumn({ type: 'date', id: 'End' });

    function addRow(entityDisplay, stateStr, start, end) {
      const stateDisplay = stateStr.replace(/_/g, ' ');
      dataTable.addRow([entityDisplay, stateDisplay, start, end]);
    }

    const startTime = new Date(
      stateHistory.reduce((minTime, stateInfo) => Math.min(
          minTime, stateInfo[0].lastChangedAsDate), new Date())
    );

    // end time is Math.min(curTime, start time + 1 day)
    let endTime = new Date(startTime);
    endTime.setDate(endTime.getDate() + 1);
    if (endTime > new Date()) {
      endTime = new Date();
    }

    let numTimelines = 0;
    // stateHistory is a list of lists of sorted state objects
    stateHistory.forEach((stateInfo) => {
      if (stateInfo.length === 0) return;

      const entityDisplay = stateInfo[0].entityDisplay;
      let newLastChanged;
      let prevState = null;
      let prevLastChanged = null;

      stateInfo.forEach((state) => {
        if (prevState !== null && state.state !== prevState) {
          newLastChanged = state.lastChangedAsDate;

          addRow(entityDisplay, prevState, prevLastChanged, newLastChanged);

          prevState = state.state;
          prevLastChanged = newLastChanged;
        } else if (prevState === null) {
          prevState = state.state;
          prevLastChanged = state.lastChangedAsDate;
        }
      });

      addRow(entityDisplay, prevState, prevLastChanged, endTime);
      numTimelines++;
    });

    chart.draw(dataTable, {
      height: 55 + numTimelines * 42,

      timeline: {
        showRowLabels: stateHistory.length > 1,
      },

      hAxis: {
        format: 'H:mm',
      },
    });
  },
});
