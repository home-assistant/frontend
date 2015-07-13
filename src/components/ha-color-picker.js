/**
 * Color-picker custom element
 * Originally created by bbrewer97202 (Ben Brewer). MIT Licensed.
 * https://github.com/bbrewer97202/color-picker-element
 *
 * Adapted to work with Polymer.
 */
import Polymer from '../polymer';

/**
 * given red, green, blue values, return the equivalent hexidecimal value
 * base source: http://stackoverflow.com/a/5624139
 */
var componentToHex = function(c) {
  var hex = c.toString(16);
  return hex.length === 1 ? "0" + hex : hex;
};

var rgbToHex = function(color) {
  return "#" + componentToHex(color.r) + componentToHex(color.g) +
         componentToHex(color.b);
};

export default Polymer({
    is: 'ha-color-picker',

    properties: {
        width: {
            type: Number,
            value: 300,
        },
        height: {
            type: Number,
            value: 300,
        },
        color: {
          type: Object,
        },
    },

    listeners: {
      'mousedown': 'onMouseDown',
      'mouseup': 'onMouseUp',
      'touchstart': 'onTouchStart',
      'touchend': 'onTouchEnd',
      'tap': 'onTap',
    },

    onMouseDown(e) {
        this.onMouseMove(e);
        this.addEventListener('mousemove', this.onMouseMove);
    },

    onMouseUp(e) {
        this.removeEventListener('mousemove', this.onMouseMove);
    },

    onTouchStart(e) {
        this.onTouchMove(e);
        this.addEventListener('touchmove', this.onTouchMove);
    },

    onTouchEnd(e) {
        this.removeEventListener('touchmove', this.onTouchMove);
    },

    onTap(e) {
      e.stopPropagation();
    },

    onTouchMove(e) {
      var touch = e.touches[0];
      this.onColorSelect(e, {x: touch.clientX, y: touch.clientY});
    },

    onMouseMove(e) {
      e.preventDefault();
      if (this.mouseMoveIsThrottled) {
        this.mouseMoveIsThrottled = false;
        this.onColorSelect(e);
        this.async(
          function() { this.mouseMoveIsThrottled = true; }.bind(this), 100);
      }
    },

    onColorSelect(e, coords) {
      if (this.context) {
        coords = coords || this.relativeMouseCoordinates(e);
        var data = this.context.getImageData(coords.x, coords.y, 1, 1).data;

        this.setColor({r: data[0], g: data[1], b: data[2]});
      }
    },

    setColor(rgb) {
      //save calculated color
      this.color = {hex: rgbToHex(rgb), rgb: rgb};

      this.fire('colorselected', {
        rgb: this.color.rgb,
        hex: this.color.hex
      });
    },

    /**
     * given a mouse click event, return x,y coordinates relative to the clicked target
     * @returns object with x, y values
     */
    relativeMouseCoordinates(e) {
      var x = 0, y = 0;

      if (this.canvas) {
        var rect = this.canvas.getBoundingClientRect();
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
      }

      return {
          x: x,
          y: y
      };
    },

    ready() {
      this.setColor = this.setColor.bind(this);
      this.mouseMoveIsThrottled = true;
      this.canvas = this.children[0];
      this.context = this.canvas.getContext('2d');

      var colorGradient = this.context.createLinearGradient(0, 0, this.width, 0);
      colorGradient.addColorStop(0, "rgb(255,0,0)");
      colorGradient.addColorStop(0.16, "rgb(255,0,255)");
      colorGradient.addColorStop(0.32, "rgb(0,0,255)");
      colorGradient.addColorStop(0.48, "rgb(0,255,255)");
      colorGradient.addColorStop(0.64, "rgb(0,255,0)");
      colorGradient.addColorStop(0.80, "rgb(255,255,0)");
      colorGradient.addColorStop(1, "rgb(255,0,0)");
      this.context.fillStyle = colorGradient;
      this.context.fillRect(0, 0, this.width, this.height);

      var bwGradient = this.context.createLinearGradient(0, 0, 0, this.height);
      bwGradient.addColorStop(0, "rgba(255,255,255,1)");
      bwGradient.addColorStop(0.5, "rgba(255,255,255,0)");
      bwGradient.addColorStop(0.5, "rgba(0,0,0,0)");
      bwGradient.addColorStop(1, "rgba(0,0,0,1)");

      this.context.fillStyle = bwGradient;
      this.context.fillRect(0, 0, this.width, this.height);
    },

});
