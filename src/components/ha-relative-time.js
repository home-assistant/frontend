import { dom } from '@polymer/polymer/lib/legacy/polymer.dom.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import relativeTime from '../common/datetime/relative_time.js';

import LocalizeMixin from '../mixins/localize-mixin.js';

/*
 * @appliesMixin LocalizeMixin
 */
class HaRelativeTime extends LocalizeMixin(PolymerElement) {
  static get properties() {
    return {
      hass: Object,
      datetime: {
        type: String,
        observer: 'datetimeChanged',
      },

      datetimeObj: {
        type: Object,
        observer: 'datetimeObjChanged',
      },

      parsedDateTime: Object
    };
  }

  constructor() {
    super();
    this.updateRelative = this.updateRelative.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    // update every 60 seconds
    this.updateInterval = setInterval(this.updateRelative, 60000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this.updateInterval);
  }

  datetimeChanged(newVal) {
    this.parsedDateTime = newVal ? new Date(newVal) : null;

    this.updateRelative();
  }

  datetimeObjChanged(newVal) {
    this.parsedDateTime = newVal;

    this.updateRelative();
  }

  updateRelative() {
    const root = dom(this);
    if (!this.parsedDateTime) {
      root.innerHTML = this.localize('ui.relative_time.never');
    } else {
      const rel = relativeTime(this.parsedDateTime);
      const time = this.localize(`ui.duration.${rel.unit}`, 'count', rel.value);
      const relTime = this.localize(`ui.relative_time.${rel.tense}`, 'time', time);
      root.innerHTML = relTime;
    }
  }
}

customElements.define('ha-relative-time', HaRelativeTime);
