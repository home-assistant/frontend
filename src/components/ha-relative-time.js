import { dom } from '@polymer/polymer/lib/legacy/polymer.dom.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import relativeTime from '../../js/common/datetime/relative_time.js';

class HaRelativeTime extends PolymerElement {
  static get properties() {
    return {
      datetime: {
        type: String,
        observer: 'datetimeChanged',
      },

      datetimeObj: {
        type: Object,
        observer: 'datetimeObjChanged',
      },

      parsedDateTime: {
        type: Object,
      },
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
    var root = dom(this);
    root.innerHTML = this.parsedDateTime ?
      relativeTime(this.parsedDateTime) : 'never';
  }
}

customElements.define('ha-relative-time', HaRelativeTime);
