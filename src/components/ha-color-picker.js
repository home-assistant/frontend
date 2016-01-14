/**
 * Color-picker custom element
 * Originally created by bbrewer97202 (Ben Brewer). MIT Licensed.
 * https://github.com/bbrewer97202/color-picker-element
 *
 * Adapted to work with Polymer.
 */
import Polymer from '../polymer';

export default new Polymer({
  is: 'ha-color-picker',

  properties: {
    color: {
      type: Object,
    },

    width: {
      type: Number,
    },

    height: {
      type: Number,
    },
  },

  listeners: {
    mousedown: 'onMouseDown',
    mouseup: 'onMouseUp',
    touchstart: 'onTouchStart',
    touchend: 'onTouchEnd',
  },

  onMouseDown(ev) {
    this.onMouseMove(ev);
    this.addEventListener('mousemove', this.onMouseMove);
  },

  onMouseUp() {
    this.removeEventListener('mousemove', this.onMouseMove);
  },

  onTouchStart(ev) {
    this.onTouchMove(ev);
    this.addEventListener('touchmove', this.onTouchMove);
  },

  onTouchEnd() {
    this.removeEventListener('touchmove', this.onTouchMove);
  },

  onTouchMove(ev) {
    if (!this.mouseMoveIsThrottled) {
      return;
    }
    this.mouseMoveIsThrottled = false;
    this.processColorSelect(ev.touches[0]);
    this.async(() => this.mouseMoveIsThrottled = true, 100);
  },

  onMouseMove(ev) {
    if (!this.mouseMoveIsThrottled) {
      return;
    }
    this.mouseMoveIsThrottled = false;
    this.processColorSelect(ev);
    this.async(() => this.mouseMoveIsThrottled = true, 100);
  },

  processColorSelect(ev) {
    const rect = this.canvas.getBoundingClientRect();

    // boundary check because people can move off-canvas.
    if (ev.clientX < rect.left || ev.clientX >= rect.left + rect.width ||
        ev.clientY < rect.top || ev.clientY >= rect.top + rect.height) {
      return;
    }

    this.onColorSelect(ev.clientX - rect.left, ev.clientY - rect.top);
  },

  onColorSelect(x, y) {
    const data = this.context.getImageData(x, y, 1, 1).data;

    this.setColor({ r: data[0], g: data[1], b: data[2] });
  },

  setColor(rgb) {
    this.color = rgb;

    this.fire('colorselected', { rgb: this.color });
  },

  ready() {
    this.setColor = this.setColor.bind(this);
    this.mouseMoveIsThrottled = true;
    this.canvas = this.children[0];
    this.context = this.canvas.getContext('2d');

    this.debounce('drawGradient', () => {
      const style = getComputedStyle(this);
      const width = parseInt(style.width, 10);
      const height = parseInt(style.height, 10);

      this.width = width;
      this.height = height;

      const colorGradient = this.context.createLinearGradient(0, 0, width, 0);
      colorGradient.addColorStop(0, 'rgb(255,0,0)');
      colorGradient.addColorStop(0.16, 'rgb(255,0,255)');
      colorGradient.addColorStop(0.32, 'rgb(0,0,255)');
      colorGradient.addColorStop(0.48, 'rgb(0,255,255)');
      colorGradient.addColorStop(0.64, 'rgb(0,255,0)');
      colorGradient.addColorStop(0.80, 'rgb(255,255,0)');
      colorGradient.addColorStop(1, 'rgb(255,0,0)');
      this.context.fillStyle = colorGradient;
      this.context.fillRect(0, 0, width, height);

      const bwGradient = this.context.createLinearGradient(0, 0, 0, height);
      bwGradient.addColorStop(0, 'rgba(255,255,255,1)');
      bwGradient.addColorStop(0.5, 'rgba(255,255,255,0)');
      bwGradient.addColorStop(0.5, 'rgba(0,0,0,0)');
      bwGradient.addColorStop(1, 'rgba(0,0,0,1)');

      this.context.fillStyle = bwGradient;
      this.context.fillRect(0, 0, width, height);
    }, 100);
  },

});
