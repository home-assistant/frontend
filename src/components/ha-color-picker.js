import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { hs2rgb, rgb2hs } from "../common/color/convert-color";
import { EventsMixin } from "../mixins/events-mixin";
/**
 * Color-picker custom element
 *
 * @appliesMixin EventsMixin
 */
class HaColorPicker extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
      <style>
        :host {
          user-select: none;
          -webkit-user-select: none;
        }

        #canvas {
          position: relative;
          width: 100%;
          max-width: 330px;
        }
        #canvas > * {
          display: block;
        }
        #interactionLayer {
          color: white;
          position: absolute;
          cursor: crosshair;
          width: 100%;
          height: 100%;
          overflow: visible;
        }
        #backgroundLayer {
          width: 100%;
          overflow: visible;
          --wheel-bordercolor: var(--ha-color-picker-wheel-bordercolor, white);
          --wheel-borderwidth: var(--ha-color-picker-wheel-borderwidth, 3);
          --wheel-shadow: var(
            --ha-color-picker-wheel-shadow,
            rgb(15, 15, 15) 10px 5px 5px 0px
          );
        }

        #marker {
          fill: currentColor;
          stroke: var(--ha-color-picker-marker-bordercolor, white);
          stroke-width: var(--ha-color-picker-marker-borderwidth, 3);
          filter: url(#marker-shadow);
        }
        .dragging #marker {
        }

        #colorTooltip {
          display: none;
          fill: currentColor;
          stroke: var(--ha-color-picker-tooltip-bordercolor, white);
          stroke-width: var(--ha-color-picker-tooltip-borderwidth, 3);
        }

        .touch.dragging #colorTooltip {
          display: inherit;
        }
      </style>
      <div id="canvas">
        <svg id="interactionLayer">
          <defs>
            <filter
              id="marker-shadow"
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
              filterUnits="objectBoundingBox"
            >
              <feOffset
                result="offOut"
                in="SourceAlpha"
                dx="2"
                dy="2"
              ></feOffset>
              <feGaussianBlur
                result="blurOut"
                in="offOut"
                stdDeviation="2"
              ></feGaussianBlur>
              <feComponentTransfer in="blurOut" result="alphaOut">
                <feFuncA type="linear" slope="0.3"></feFuncA>
              </feComponentTransfer>
              <feBlend
                in="SourceGraphic"
                in2="alphaOut"
                mode="normal"
              ></feBlend>
            </filter>
          </defs>
        </svg>
        <canvas id="backgroundLayer"></canvas>
      </div>
    `;
  }

  static get properties() {
    return {
      hsColor: {
        type: Object,
      },

      // use these properties to update the state via attributes
      desiredHsColor: {
        type: Object,
        observer: "applyHsColor",
      },

      // use these properties to update the state via attributes
      desiredRgbColor: {
        type: Object,
        observer: "applyRgbColor",
      },

      // width, height and radius apply to the coordinates of
      // of the canvas.
      // border width are relative to these numbers
      // the onscreen displayed size should be controlled with css
      // and should be the same or smaller
      width: {
        type: Number,
        value: 500,
      },

      height: {
        type: Number,
        value: 500,
      },

      radius: {
        type: Number,
        value: 225,
      },

      // the amount segments for the hue
      // 0 = continuous gradient
      // other than 0 gives 'pie-pieces'
      hueSegments: {
        type: Number,
        value: 0,
        observer: "segmentationChange",
      },

      // the amount segments for the hue
      // 0 = continuous gradient
      // 1 = only fully saturated
      // > 1 = segments from white to fully saturated
      saturationSegments: {
        type: Number,
        value: 0,
        observer: "segmentationChange",
      },

      // set to true to make the segments purely esthetical
      // this allows selection off all collors, also
      // interpolated between the segments
      ignoreSegments: {
        type: Boolean,
        value: false,
      },

      // throttle te amount of 'colorselected' events fired
      // value is timeout in milliseconds
      throttle: {
        type: Number,
        value: 500,
      },
    };
  }

  ready() {
    super.ready();
    this.setupLayers();
    this.drawColorWheel();
    this.drawMarker();

    if (this.desiredHsColor) {
      this.applyHsColor(this.desiredHsColor);
    }

    if (this.desiredRgbColor) {
      this.applyRgbColor(this.desiredRgbColor);
    }

    this.interactionLayer.addEventListener("mousedown", (ev) =>
      this.onMouseDown(ev)
    );
    this.interactionLayer.addEventListener("touchstart", (ev) =>
      this.onTouchStart(ev)
    );
  }

  // converts browser coordinates to canvas canvas coordinates
  // origin is wheel center
  // returns {x: X, y: Y} object
  convertToCanvasCoordinates(clientX, clientY) {
    const svgPoint = this.interactionLayer.createSVGPoint();
    svgPoint.x = clientX;
    svgPoint.y = clientY;
    const cc = svgPoint.matrixTransform(
      this.interactionLayer.getScreenCTM().inverse()
    );
    return { x: cc.x, y: cc.y };
  }

  // Mouse events

  onMouseDown(ev) {
    const cc = this.convertToCanvasCoordinates(ev.clientX, ev.clientY);
    // return if we're not on the wheel
    if (!this.isInWheel(cc.x, cc.y)) {
      return;
    }
    // a mousedown in wheel is always a color select action
    this.onMouseSelect(ev);
    // allow dragging
    this.canvas.classList.add("mouse", "dragging");
    this.addEventListener("mousemove", this.onMouseSelect);
    this.addEventListener("mouseup", this.onMouseUp);
  }

  onMouseUp() {
    this.canvas.classList.remove("mouse", "dragging");
    this.removeEventListener("mousemove", this.onMouseSelect);
  }

  onMouseSelect(ev) {
    requestAnimationFrame(() => this.processUserSelect(ev));
  }

  // Touch events

  onTouchStart(ev) {
    const touch = ev.changedTouches[0];
    const cc = this.convertToCanvasCoordinates(touch.clientX, touch.clientY);
    // return if we're not on the wheel
    if (!this.isInWheel(cc.x, cc.y)) {
      return;
    }
    if (ev.target === this.marker) {
      // drag marker
      ev.preventDefault();
      this.canvas.classList.add("touch", "dragging");
      this.addEventListener("touchmove", this.onTouchSelect);
      this.addEventListener("touchend", this.onTouchEnd);
      return;
    }
    // don't fire color selection immediately,
    // wait for touchend and invalidate when we scroll
    this.tapBecameScroll = false;
    this.addEventListener("touchend", this.onTap);
    this.addEventListener(
      "touchmove",
      () => {
        this.tapBecameScroll = true;
      },
      { passive: true }
    );
  }

  onTap(ev) {
    if (this.tapBecameScroll) {
      return;
    }
    ev.preventDefault();
    this.onTouchSelect(ev);
  }

  onTouchEnd() {
    this.canvas.classList.remove("touch", "dragging");
    this.removeEventListener("touchmove", this.onTouchSelect);
  }

  onTouchSelect(ev) {
    requestAnimationFrame(() => this.processUserSelect(ev.changedTouches[0]));
  }

  /*
   * General event/selection handling
   */

  // Process user input to color
  processUserSelect(ev) {
    const canvasXY = this.convertToCanvasCoordinates(ev.clientX, ev.clientY);
    const hs = this.getColor(canvasXY.x, canvasXY.y);
    let rgb;
    if (!this.isInWheel(canvasXY.x, canvasXY.y)) {
      const [r, g, b] = hs2rgb([hs.h, hs.s]);
      rgb = { r, g, b };
    } else {
      rgb = this.getRgbColor(canvasXY.x, canvasXY.y);
    }
    this.onColorSelect(hs, rgb);
  }

  // apply color to marker position and canvas
  onColorSelect(hs, rgb) {
    this.setMarkerOnColor(hs); // marker always follows mouse 'raw' hs value (= mouse position)
    if (!this.ignoreSegments) {
      // apply segments if needed
      hs = this.applySegmentFilter(hs);
    }
    // always apply the new color to the interface / canvas
    this.applyColorToCanvas(hs);
    // throttling is applied to updating the exposed colors (properties)
    // and firing of events
    if (this.colorSelectIsThrottled) {
      // make sure we apply the last selected color
      // eventually after throttle limit has passed
      clearTimeout(this.ensureFinalSelect);
      this.ensureFinalSelect = setTimeout(() => {
        this.fireColorSelected(hs, rgb); // do it for the final time
      }, this.throttle);
      return;
    }
    this.fireColorSelected(hs, rgb); // do it
    this.colorSelectIsThrottled = true;
    setTimeout(() => {
      this.colorSelectIsThrottled = false;
    }, this.throttle);
  }

  // set color values and fire colorselected event
  fireColorSelected(hs, rgb) {
    this.hsColor = hs;
    this.fire("colorselected", { hs, rgb });
  }

  /*
   * Interface updating
   */

  // set marker position to the given color
  setMarkerOnColor(hs) {
    if (!this.marker || !this.tooltip) {
      return;
    }
    const dist = hs.s * this.radius;
    const theta = ((hs.h - 180) / 180) * Math.PI;
    const markerdX = -dist * Math.cos(theta);
    const markerdY = -dist * Math.sin(theta);
    const translateString = `translate(${markerdX},${markerdY})`;
    this.marker.setAttribute("transform", translateString);
    this.tooltip.setAttribute("transform", translateString);
  }

  // apply given color to interface elements
  applyColorToCanvas(hs) {
    if (!this.interactionLayer) {
      return;
    }
    // we're not really converting hs to hsl here, but we keep it cheap
    // setting the color on the interactionLayer, the svg elements can inherit
    this.interactionLayer.style.color = `hsl(${hs.h}, 100%, ${
      100 - hs.s * 50
    }%)`;
  }

  applyHsColor(hs) {
    // do nothing is we already have the same color
    if (this.hsColor && this.hsColor.h === hs.h && this.hsColor.s === hs.s) {
      return;
    }
    this.setMarkerOnColor(hs); // marker is always set on 'raw' hs position
    if (!this.ignoreSegments) {
      // apply segments if needed
      hs = this.applySegmentFilter(hs);
    }
    this.hsColor = hs;
    // always apply the new color to the interface / canvas
    this.applyColorToCanvas(hs);
  }

  applyRgbColor(rgb) {
    const [h, s] = rgb2hs(rgb);
    this.applyHsColor({ h, s });
  }

  /*
   * input processing helpers
   */

  // get angle (degrees)
  getAngle(dX, dY) {
    const theta = Math.atan2(-dY, -dX); // radians from the left edge, clockwise = positive
    const angle = (theta / Math.PI) * 180 + 180; // degrees, clockwise from right
    return angle;
  }

  // returns true when coordinates are in the colorwheel
  isInWheel(x, y) {
    return this.getDistance(x, y) <= 1;
  }

  // returns distance from wheel center, 0 = center, 1 = edge, >1 = outside
  getDistance(dX, dY) {
    return Math.sqrt(dX * dX + dY * dY) / this.radius;
  }

  /*
   * Getting colors
   */

  getColor(x, y) {
    const hue = this.getAngle(x, y); // degrees, clockwise from right
    const relativeDistance = this.getDistance(x, y); // edge of radius = 1
    const sat = Math.min(relativeDistance, 1); // Distance from center
    return { h: hue, s: sat };
  }

  getRgbColor(x, y) {
    // get current pixel
    const imageData = this.backgroundLayer
      .getContext("2d")
      .getImageData(x + 250, y + 250, 1, 1);
    const pixel = imageData.data;
    return { r: pixel[0], g: pixel[1], b: pixel[2] };
  }

  applySegmentFilter(hs) {
    // apply hue segment steps
    if (this.hueSegments) {
      const angleStep = 360 / this.hueSegments;
      const halfAngleStep = angleStep / 2;
      hs.h -= halfAngleStep; // take the 'centered segemnts' into account
      if (hs.h < 0) {
        hs.h += 360;
      } // don't end up below 0
      const rest = hs.h % angleStep;
      hs.h -= rest - angleStep;
    }

    // apply saturation segment steps
    if (this.saturationSegments) {
      if (this.saturationSegments === 1) {
        hs.s = 1;
      } else {
        const segmentSize = 1 / this.saturationSegments;
        const saturationStep = 1 / (this.saturationSegments - 1);
        const calculatedSat = Math.floor(hs.s / segmentSize) * saturationStep;
        hs.s = Math.min(calculatedSat, 1);
      }
    }
    return hs;
  }

  /*
   * Drawing related stuff
   */

  setupLayers() {
    this.canvas = this.$.canvas;
    this.backgroundLayer = this.$.backgroundLayer;
    this.interactionLayer = this.$.interactionLayer;

    // coordinate origin position (center of the wheel)
    this.originX = this.width / 2;
    this.originY = this.originX;

    // synchronise width/height coordinates
    this.backgroundLayer.width = this.width;
    this.backgroundLayer.height = this.height;
    this.interactionLayer.setAttribute(
      "viewBox",
      `${-this.originX} ${-this.originY} ${this.width} ${this.height}`
    );
  }

  drawColorWheel() {
    /*
     *  Setting up all paremeters
     */
    let shadowColor;
    let shadowOffsetX;
    let shadowOffsetY;
    let shadowBlur;
    const context = this.backgroundLayer.getContext("2d");
    // postioning and sizing
    const cX = this.originX;
    const cY = this.originY;
    const radius = this.radius;
    const counterClockwise = false;
    // styling of the wheel
    const wheelStyle = window.getComputedStyle(this.backgroundLayer, null);
    const borderWidth = parseInt(
      wheelStyle.getPropertyValue("--wheel-borderwidth"),
      10
    );
    const borderColor = wheelStyle
      .getPropertyValue("--wheel-bordercolor")
      .trim();
    const wheelShadow = wheelStyle.getPropertyValue("--wheel-shadow").trim();
    // extract shadow properties from CSS variable
    // the shadow should be defined as: "10px 5px 5px 0px COLOR"
    if (wheelShadow !== "none") {
      const values = wheelShadow.split("px ");
      shadowColor = values.pop();
      shadowOffsetX = parseInt(values[0], 10);
      shadowOffsetY = parseInt(values[1], 10);
      shadowBlur = parseInt(values[2], 10) || 0;
    }
    const borderRadius = radius + borderWidth / 2;
    const wheelRadius = radius;
    const shadowRadius = radius + borderWidth;

    /*
     *  Drawing functions
     */
    function drawCircle(hueSegments, saturationSegments) {
      hueSegments = hueSegments || 360; // reset 0 segments to 360
      const angleStep = 360 / hueSegments;
      const halfAngleStep = angleStep / 2; // center segments on color
      for (let angle = 0; angle <= 360; angle += angleStep) {
        const startAngle = (angle - halfAngleStep) * (Math.PI / 180);
        const endAngle = (angle + halfAngleStep + 1) * (Math.PI / 180);
        context.beginPath();
        context.moveTo(cX, cY);
        context.arc(
          cX,
          cY,
          wheelRadius,
          startAngle,
          endAngle,
          counterClockwise
        );
        context.closePath();
        // gradient
        const gradient = context.createRadialGradient(
          cX,
          cY,
          0,
          cX,
          cY,
          wheelRadius
        );
        let lightness = 100;
        // first gradient stop
        gradient.addColorStop(0, `hsl(${angle}, 100%, ${lightness}%)`);
        // segment gradient stops
        if (saturationSegments > 0) {
          const ratioStep = 1 / saturationSegments;
          let ratio = 0;
          for (let stop = 1; stop < saturationSegments; stop += 1) {
            const prevLighness = lightness;
            ratio = stop * ratioStep;
            lightness = 100 - 50 * ratio;
            gradient.addColorStop(
              ratio,
              `hsl(${angle}, 100%, ${prevLighness}%)`
            );
            gradient.addColorStop(ratio, `hsl(${angle}, 100%, ${lightness}%)`);
          }
          gradient.addColorStop(ratio, `hsl(${angle}, 100%, 50%)`);
        }
        // last gradient stop
        gradient.addColorStop(1, `hsl(${angle}, 100%, 50%)`);

        context.fillStyle = gradient;
        context.fill();
      }
    }

    function drawShadow() {
      context.save();
      context.beginPath();
      context.arc(cX, cY, shadowRadius, 0, 2 * Math.PI, false);
      context.shadowColor = shadowColor;
      context.shadowOffsetX = shadowOffsetX;
      context.shadowOffsetY = shadowOffsetY;
      context.shadowBlur = shadowBlur;
      context.fillStyle = "white";
      context.fill();
      context.restore();
    }

    function drawBorder() {
      context.beginPath();
      context.arc(cX, cY, borderRadius, 0, 2 * Math.PI, false);
      context.lineWidth = borderWidth;
      context.strokeStyle = borderColor;
      context.stroke();
    }

    /*
     *   Call the drawing functions
     *   draws the shadow, wheel and border
     */
    if (wheelStyle.shadow !== "none") {
      drawShadow();
    }
    drawCircle(this.hueSegments, this.saturationSegments);
    if (borderWidth > 0) {
      drawBorder();
    }
  }

  /*
   *   Draw the (draggable) marker and tooltip
   *   on the interactionLayer)
   */

  drawMarker() {
    const svgElement = this.interactionLayer;
    const markerradius = this.radius * 0.08;
    const tooltipradius = this.radius * 0.15;
    const TooltipOffsetY = -(tooltipradius * 3);
    const TooltipOffsetX = 0;

    svgElement.marker = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );
    svgElement.marker.setAttribute("id", "marker");
    svgElement.marker.setAttribute("r", markerradius);
    this.marker = svgElement.marker;
    svgElement.appendChild(svgElement.marker);

    svgElement.tooltip = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );
    svgElement.tooltip.setAttribute("id", "colorTooltip");
    svgElement.tooltip.setAttribute("r", tooltipradius);
    svgElement.tooltip.setAttribute("cx", TooltipOffsetX);
    svgElement.tooltip.setAttribute("cy", TooltipOffsetY);
    this.tooltip = svgElement.tooltip;
    svgElement.appendChild(svgElement.tooltip);
  }

  segmentationChange() {
    if (this.backgroundLayer) {
      this.drawColorWheel();
    }
  }
}
customElements.define("ha-color-picker", HaColorPicker);
