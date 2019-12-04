import { PolymerElement } from "@polymer/polymer/polymer-element";
import { IronResizableBehavior } from "@polymer/iron-resizable-behavior/iron-resizable-behavior";
import "@polymer/paper-icon-button/paper-icon-button";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { Debouncer } from "@polymer/polymer/lib/utils/debounce";
import { timeOut } from "@polymer/polymer/lib/utils/async";
import { mixinBehaviors } from "@polymer/polymer/lib/legacy/class";

import formatTime from "../../common/datetime/format_time";
// eslint-disable-next-line no-unused-vars
/* global Chart moment Color */

let scriptsLoaded = null;

class HaChartBase extends mixinBehaviors(
  [IronResizableBehavior],
  PolymerElement
) {
  static get template() {
    return html`
      <style>
        :host {
          display: block;
        }
        .chartHeader {
          padding: 6px 0 0 0;
          width: 100%;
          display: flex;
          flex-direction: row;
        }
        .chartHeader > div {
          vertical-align: top;
          padding: 0 8px;
        }
        .chartHeader > div.chartTitle {
          padding-top: 8px;
          flex: 0 0 0;
          max-width: 30%;
        }
        .chartHeader > div.chartLegend {
          flex: 1 1;
          min-width: 70%;
        }
        :root {
          user-select: none;
          -moz-user-select: none;
          -webkit-user-select: none;
          -ms-user-select: none;
        }
        .chartTooltip {
          font-size: 90%;
          opacity: 1;
          position: absolute;
          background: rgba(80, 80, 80, 0.9);
          color: white;
          border-radius: 3px;
          pointer-events: none;
          transform: translate(-50%, 12px);
          z-index: 1000;
          width: 200px;
          transition: opacity 0.15s ease-in-out;
        }
        :host([rtl]) .chartTooltip {
          direction: rtl;
        }
        .chartLegend ul,
        .chartTooltip ul {
          display: inline-block;
          padding: 0 0px;
          margin: 5px 0 0 0;
          width: 100%;
        }
        .chartTooltip li {
          display: block;
          white-space: pre-line;
        }
        .chartTooltip .title {
          text-align: center;
          font-weight: 500;
        }
        .chartLegend li {
          display: inline-block;
          padding: 0 6px;
          max-width: 49%;
          text-overflow: ellipsis;
          white-space: nowrap;
          overflow: hidden;
          box-sizing: border-box;
        }
        .chartLegend li:nth-child(odd):last-of-type {
          /* Make last item take full width if it is odd-numbered. */
          max-width: 100%;
        }
        .chartLegend li[data-hidden] {
          text-decoration: line-through;
        }
        .chartLegend em,
        .chartTooltip em {
          border-radius: 5px;
          display: inline-block;
          height: 10px;
          margin-right: 4px;
          width: 10px;
        }
        :host([rtl]) .chartTooltip em {
          margin-right: inherit;
          margin-left: 4px;
        }
        paper-icon-button {
          color: var(--secondary-text-color);
        }
      </style>
      <template is="dom-if" if="[[unit]]">
        <div class="chartHeader">
          <div class="chartTitle">[[unit]]</div>
          <div class="chartLegend">
            <ul>
              <template is="dom-repeat" items="[[metas]]">
                <li on-click="_legendClick" data-hidden$="[[item.hidden]]">
                  <em style$="background-color:[[item.bgColor]]"></em>
                  [[item.label]]
                </li>
              </template>
            </ul>
          </div>
        </div>
      </template>
      <div id="chartTarget" style="height:40px; width:100%">
        <canvas id="chartCanvas"></canvas>
        <div
          class$="chartTooltip [[tooltip.yAlign]]"
          style$="opacity:[[tooltip.opacity]]; top:[[tooltip.top]]; left:[[tooltip.left]]; padding:[[tooltip.yPadding]]px [[tooltip.xPadding]]px"
        >
          <div class="title">[[tooltip.title]]</div>
          <div>
            <ul>
              <template is="dom-repeat" items="[[tooltip.lines]]">
                <li>
                  <em style$="background-color:[[item.bgColor]]"></em
                  >[[item.text]]
                </li>
              </template>
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  get chart() {
    return this._chart;
  }

  static get properties() {
    return {
      data: Object,
      identifier: String,
      rendered: {
        type: Boolean,
        notify: true,
        value: false,
        readOnly: true,
      },
      metas: {
        type: Array,
        value: () => [],
      },
      tooltip: {
        type: Object,
        value: () => ({
          opacity: "0",
          left: "0",
          top: "0",
          xPadding: "5",
          yPadding: "3",
        }),
      },
      unit: Object,
      rtl: {
        type: Boolean,
        reflectToAttribute: true,
      },
    };
  }

  static get observers() {
    return ["onPropsChange(data)"];
  }

  connectedCallback() {
    super.connectedCallback();
    this._isAttached = true;
    this.onPropsChange();
    this._resizeListener = () => {
      this._debouncer = Debouncer.debounce(
        this._debouncer,
        timeOut.after(10),
        () => {
          if (this._isAttached) {
            this.resizeChart();
          }
        }
      );
    };

    if (typeof ResizeObserver === "function") {
      this.resizeObserver = new ResizeObserver((entries) => {
        entries.forEach(() => {
          this._resizeListener();
        });
      });
      this.resizeObserver.observe(this.$.chartTarget);
    } else {
      this.addEventListener("iron-resize", this._resizeListener);
    }

    if (scriptsLoaded === null) {
      scriptsLoaded = import(
        /* webpackChunkName: "load_chart" */ "../../resources/ha-chart-scripts.js"
      );
    }
    scriptsLoaded.then((ChartModule) => {
      this.ChartClass = ChartModule.default;
      this.onPropsChange();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._isAttached = false;
    if (this.resizeObserver) {
      this.resizeObserver.unobserve(this.$.chartTarget);
    }

    this.removeEventListener("iron-resize", this._resizeListener);

    if (this._resizeTimer !== undefined) {
      clearInterval(this._resizeTimer);
      this._resizeTimer = undefined;
    }
  }

  onPropsChange() {
    if (!this._isAttached || !this.ChartClass || !this.data) {
      return;
    }
    this.drawChart();
  }

  _customTooltips(tooltip) {
    // Hide if no tooltip
    if (tooltip.opacity === 0) {
      this.set(["tooltip", "opacity"], 0);
      return;
    }
    // Set caret Position
    if (tooltip.yAlign) {
      this.set(["tooltip", "yAlign"], tooltip.yAlign);
    } else {
      this.set(["tooltip", "yAlign"], "no-transform");
    }

    const title = tooltip.title ? tooltip.title[0] || "" : "";
    this.set(["tooltip", "title"], title);

    const bodyLines = tooltip.body.map((n) => n.lines);

    // Set Text
    if (tooltip.body) {
      this.set(
        ["tooltip", "lines"],
        bodyLines.map((body, i) => {
          const colors = tooltip.labelColors[i];
          return {
            color: colors.borderColor,
            bgColor: colors.backgroundColor,
            text: body.join("\n"),
          };
        })
      );
    }
    const parentWidth = this.$.chartTarget.clientWidth;
    let positionX = tooltip.caretX;
    const positionY = this._chart.canvas.offsetTop + tooltip.caretY;
    if (tooltip.caretX + 100 > parentWidth) {
      positionX = parentWidth - 100;
    } else if (tooltip.caretX < 100) {
      positionX = 100;
    }
    positionX += this._chart.canvas.offsetLeft;
    // Display, position, and set styles for font
    this.tooltip = {
      ...this.tooltip,
      opacity: 1,
      left: `${positionX}px`,
      top: `${positionY}px`,
    };
  }

  _legendClick(event) {
    event = event || window.event;
    event.stopPropagation();
    let target = event.target || event.srcElement;
    while (target.nodeName !== "LI") {
      // user clicked child, find parent LI
      target = target.parentElement;
    }
    const index = event.model.itemsIndex;

    const meta = this._chart.getDatasetMeta(index);
    meta.hidden =
      meta.hidden === null ? !this._chart.data.datasets[index].hidden : null;
    this.set(
      ["metas", index, "hidden"],
      this._chart.isDatasetVisible(index) ? null : "hidden"
    );
    this._chart.update();
  }

  _drawLegend() {
    const chart = this._chart;
    // New data for old graph. Keep metadata.
    const preserveVisibility =
      this._oldIdentifier && this.identifier === this._oldIdentifier;
    this._oldIdentifier = this.identifier;
    this.set(
      "metas",
      this._chart.data.datasets.map((x, i) => ({
        label: x.label,
        color: x.color,
        bgColor: x.backgroundColor,
        hidden:
          preserveVisibility && i < this.metas.length
            ? this.metas[i].hidden
            : !chart.isDatasetVisible(i),
      }))
    );
    let updateNeeded = false;
    if (preserveVisibility) {
      for (let i = 0; i < this.metas.length; i++) {
        const meta = chart.getDatasetMeta(i);
        if (!!meta.hidden !== !!this.metas[i].hidden) updateNeeded = true;
        meta.hidden = this.metas[i].hidden ? true : null;
      }
    }
    if (updateNeeded) {
      chart.update();
    }
    this.unit = this.data.unit;
  }

  _formatTickValue(value, index, values) {
    if (values.length === 0) {
      return value;
    }
    const date = new Date(values[index].value);
    return formatTime(date);
  }

  drawChart() {
    const data = this.data.data;
    const ctx = this.$.chartCanvas;

    if ((!data.datasets || !data.datasets.length) && !this._chart) {
      return;
    }
    if (this.data.type !== "timeline" && data.datasets.length > 0) {
      const cnt = data.datasets.length;
      const colors = this.constructor.getColorList(cnt);
      for (let loopI = 0; loopI < cnt; loopI++) {
        data.datasets[loopI].borderColor = colors[loopI].rgbString();
        data.datasets[loopI].backgroundColor = colors[loopI]
          .alpha(0.6)
          .rgbaString();
      }
    }

    if (this._chart) {
      this._customTooltips({ opacity: 0 });
      this._chart.data = data;
      this._chart.update({ duration: 0 });
      if (this.isTimeline) {
        this._chart.options.scales.yAxes[0].gridLines.display = data.length > 1;
      } else if (this.data.legend === true) {
        this._drawLegend();
      }
      this.resizeChart();
    } else {
      if (!data.datasets) {
        return;
      }
      this._customTooltips({ opacity: 0 });
      const plugins = [{ afterRender: () => this._setRendered(true) }];
      let options = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 0,
        },
        hover: {
          animationDuration: 0,
        },
        responsiveAnimationDuration: 0,
        tooltips: {
          enabled: false,
          custom: this._customTooltips.bind(this),
        },
        legend: {
          display: false,
        },
        line: {
          spanGaps: true,
        },
        elements: {
          font: "12px 'Roboto', 'sans-serif'",
        },
        ticks: {
          fontFamily: "'Roboto', 'sans-serif'",
        },
      };
      options = Chart.helpers.merge(options, this.data.options);
      options.scales.xAxes[0].ticks.callback = this._formatTickValue;
      if (this.data.type === "timeline") {
        this.set("isTimeline", true);
        if (this.data.colors !== undefined) {
          this._colorFunc = this.constructor.getColorGenerator(
            this.data.colors.staticColors,
            this.data.colors.staticColorIndex
          );
        }
        if (this._colorFunc !== undefined) {
          options.elements.colorFunction = this._colorFunc;
        }
        if (data.datasets.length === 1) {
          if (options.scales.yAxes[0].ticks) {
            options.scales.yAxes[0].ticks.display = false;
          } else {
            options.scales.yAxes[0].ticks = { display: false };
          }
          if (options.scales.yAxes[0].gridLines) {
            options.scales.yAxes[0].gridLines.display = false;
          } else {
            options.scales.yAxes[0].gridLines = { display: false };
          }
        }
        this.$.chartTarget.style.height = "50px";
      } else {
        this.$.chartTarget.style.height = "160px";
      }
      const chartData = {
        type: this.data.type,
        data: this.data.data,
        options: options,
        plugins: plugins,
      };
      // Async resize after dom update
      this._chart = new this.ChartClass(ctx, chartData);
      if (this.isTimeline !== true && this.data.legend === true) {
        this._drawLegend();
      }
      this.resizeChart();
    }
  }

  resizeChart() {
    if (!this._chart) return;
    // Chart not ready
    if (this._resizeTimer === undefined) {
      this._resizeTimer = setInterval(this.resizeChart.bind(this), 10);
      return;
    }

    clearInterval(this._resizeTimer);
    this._resizeTimer = undefined;

    this._resizeChart();
  }

  _resizeChart() {
    const chartTarget = this.$.chartTarget;

    const options = this.data;
    const data = options.data;

    if (data.datasets.length === 0) {
      return;
    }

    if (!this.isTimeline) {
      this._chart.resize();
      return;
    }

    // Recalculate chart height for Timeline chart
    const areaTop = this._chart.chartArea.top;
    const areaBot = this._chart.chartArea.bottom;
    const height1 = this._chart.canvas.clientHeight;
    if (areaBot > 0) {
      this._axisHeight = height1 - areaBot + areaTop;
    }

    if (!this._axisHeight) {
      chartTarget.style.height = "50px";
      this._chart.resize();
      this.resizeChart();
      return;
    }
    if (this._axisHeight) {
      const cnt = data.datasets.length;
      const targetHeight = 30 * cnt + this._axisHeight + "px";
      if (chartTarget.style.height !== targetHeight) {
        chartTarget.style.height = targetHeight;
      }
      this._chart.resize();
    }
  }

  // Get HSL distributed color list
  static getColorList(count) {
    let processL = false;
    if (count > 10) {
      processL = true;
      count = Math.ceil(count / 2);
    }
    const h1 = 360 / count;
    const result = [];
    for (let loopI = 0; loopI < count; loopI++) {
      result[loopI] = Color().hsl(h1 * loopI, 80, 38);
      if (processL) {
        result[loopI + count] = Color().hsl(h1 * loopI, 80, 62);
      }
    }
    return result;
  }

  static getColorGenerator(staticColors, startIndex) {
    // Known colors for static data,
    // should add for very common state string manually.
    // Palette modified from http://google.github.io/palette.js/ mpn65, Apache 2.0
    const palette = [
      "ff0029",
      "66a61e",
      "377eb8",
      "984ea3",
      "00d2d5",
      "ff7f00",
      "af8d00",
      "7f80cd",
      "b3e900",
      "c42e60",
      "a65628",
      "f781bf",
      "8dd3c7",
      "bebada",
      "fb8072",
      "80b1d3",
      "fdb462",
      "fccde5",
      "bc80bd",
      "ffed6f",
      "c4eaff",
      "cf8c00",
      "1b9e77",
      "d95f02",
      "e7298a",
      "e6ab02",
      "a6761d",
      "0097ff",
      "00d067",
      "f43600",
      "4ba93b",
      "5779bb",
      "927acc",
      "97ee3f",
      "bf3947",
      "9f5b00",
      "f48758",
      "8caed6",
      "f2b94f",
      "eff26e",
      "e43872",
      "d9b100",
      "9d7a00",
      "698cff",
      "d9d9d9",
      "00d27e",
      "d06800",
      "009f82",
      "c49200",
      "cbe8ff",
      "fecddf",
      "c27eb6",
      "8cd2ce",
      "c4b8d9",
      "f883b0",
      "a49100",
      "f48800",
      "27d0df",
      "a04a9b",
    ];
    function getColorIndex(idx) {
      // Reuse the color if index too large.
      return Color("#" + palette[idx % palette.length]);
    }
    const colorDict = {};
    let colorIndex = 0;
    if (startIndex > 0) colorIndex = startIndex;
    if (staticColors) {
      Object.keys(staticColors).forEach((c) => {
        const c1 = staticColors[c];
        if (isFinite(c1)) {
          colorDict[c.toLowerCase()] = getColorIndex(c1);
        } else {
          colorDict[c.toLowerCase()] = Color(staticColors[c]);
        }
      });
    }
    // Custom color assign
    function getColor(__, data) {
      let ret;
      const name = data[3];
      if (name === null) return Color().hsl(0, 40, 38);
      if (name === undefined) return Color().hsl(120, 40, 38);
      const name1 = name.toLowerCase();
      if (ret === undefined) {
        ret = colorDict[name1];
      }
      if (ret === undefined) {
        ret = getColorIndex(colorIndex);
        colorIndex++;
        colorDict[name1] = ret;
      }
      return ret;
    }
    return getColor;
  }
}
customElements.define("ha-chart-base", HaChartBase);
