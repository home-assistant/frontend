import '@polymer/polymer/polymer-legacy.js';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '../../../components/ha-relative-time.js';
import '@vaadin/vaadin-date-picker/vaadin-date-picker.js';
// import 'paper-time-input/paper-time-input.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

class DatetimeInput extends PolymerElement {
  static get template() {
    return html`
    <div class\$="[[computeClassNames(stateObj)]]">
      <template is="dom-if" if="[[doesHaveDate(stateObj)]]" restamp="">
        <div>
          <vaadin-date-picker id="dateInput" on-value-changed="dateTimeChanged" label="Date" value="{{selectedDate}}"></vaadin-date-picker>
        </div>
      </template>
      <template is="dom-if" if="[[doesHaveTime(stateObj)]]" restamp="">
        <div>
          <paper-time-input hour="{{selectedHour}}" min="{{selectedMinute}}" format="24"></paper-time-input>
        </div>
      </template>
    </div>
`;
  }

  static get is() {
    return 'more-info-input_datetime';
  }

  constructor() {
    super();
    this.is_ready = false;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
      },

      stateObj: {
        type: Object,
        observer: 'stateObjChanged',
      },

      selectedHour: {
        type: Number,
        observer: 'dateTimeChanged',
      },

      selectedMinute: {
        type: Number,
        observer: 'dateTimeChanged',
      },

      selectedDate: {
        type: String,
      }
    };
  }

  ready() {
    super.ready();
    this.is_ready = true;
  }

  /* Convert the date in the stateObj into a string useable by vaadin-date-picker */
  getDateString(stateObj) {
    var monthFiller;
    if (stateObj.attributes.month < 10) {
      monthFiller = '0';
    } else {
      monthFiller = '';
    }

    var dayFiller;
    if (stateObj.attributes.day < 10) {
      dayFiller = '0';
    } else {
      dayFiller = '';
    }

    return stateObj.attributes.year + '-' + monthFiller + stateObj.attributes.month + '-' + dayFiller + stateObj.attributes.day;
  }

  /* Should fire when any value was changed *by the user*, not b/c of setting
   * initial values. */
  dateTimeChanged() {
    // Check if the change is really coming from the user
    if (!this.is_ready) {
      return;
    }

    var minuteFiller;
    var changed = false;

    var serviceData = {
      entity_id: this.stateObj.entity_id
    };

    if (this.stateObj.attributes.has_time) {
      changed |= (parseInt(this.selectedMinute) !== this.stateObj.attributes.minute);
      changed |= (parseInt(this.selectedHour) !== this.stateObj.attributes.hour);

      if (this.selectedMinute < 10) {
        minuteFiller = '0';
      } else {
        minuteFiller = '';
      }

      var timeStr = this.selectedHour + ':' + minuteFiller + this.selectedMinute;

      serviceData.time = timeStr;
    }

    if (this.stateObj.attributes.has_date) {
      const dateInput = this.shadowRoot.querySelector('#dateInput');
      const dateValInput = new Date(dateInput.value);
      const dateValState = new Date(
        this.stateObj.attributes.year,
        this.stateObj.attributes.month - 1,
        this.stateObj.attributes.day
      );

      changed |= (dateValState !== dateValInput);

      serviceData.date = dateInput.value;
      if (dateInput.value.length < 1) {
        return; // Date was not set
      }
    }

    if (changed) {
      this.hass.callService('input_datetime', 'set_datetime', serviceData);
    }
  }

  stateObjChanged(newVal) {
    // Set to non-ready s.t. dateTimeChanged does not fire
    this.is_ready = false;

    if (newVal.attributes.has_time) {
      this.selectedHour = newVal.attributes.hour;
      this.selectedMinute = newVal.attributes.minute;
    }

    if (newVal.attributes.has_date) {
      this.selectedDate = this.getDateString(newVal);
    }

    this.is_ready = true;
  }

  doesHaveDate(stateObj) {
    return stateObj.attributes.has_date;
  }

  doesHaveTime(stateObj) {
    return stateObj.attributes.has_time;
  }

  computeClassNames(stateObj) {
    return 'more-info-input_datetime ' + window.hassUtil.attributeClassNames(stateObj, ['has_time', 'has_date']);
  }
}

customElements.define(DatetimeInput.is, DatetimeInput);
