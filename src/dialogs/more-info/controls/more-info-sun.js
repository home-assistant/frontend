import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../components/ha-relative-time.js';

import formatTime from '../../../common/datetime/format_time.js';

class MoreInfoSun extends PolymerElement {
  static get template() {
    return html`
    <style include="iron-flex iron-flex-alignment"></style>

    <template is="dom-repeat" items="[[computeOrder(risingDate, settingDate)]]">
      <div class="data-entry layout justified horizontal">
        <div class="key">
          <span>[[itemCaption(item)]]</span>
          <ha-relative-time hass="[[hass]]" datetime-obj="[[itemDate(item)]]"></ha-relative-time>
        </div>
        <div class="value">[[itemValue(item)]]</div>
      </div>
    </template>
      <div class="data-entry layout justified horizontal">
        <div class="key">Elevation</div>
        <div class="value">[[stateObj.attributes.elevation]]</div>
     </div>
`;
  }

  static get properties() {
    return {
      hass: Object,
      stateObj: Object,
      risingDate: {
        type: Object,
        computed: 'computeRising(stateObj)',
      },

      settingDate: {
        type: Object,
        computed: 'computeSetting(stateObj)',
      },
    };
  }

  computeRising(stateObj) {
    return new Date(stateObj.attributes.next_rising);
  }

  computeSetting(stateObj) {
    return new Date(stateObj.attributes.next_setting);
  }

  computeOrder(risingDate, settingDate) {
    return risingDate > settingDate ? ['set', 'ris'] : ['ris', 'set'];
  }

  itemCaption(type) {
    return type === 'ris' ? 'Rising ' : 'Setting ';
  }

  itemDate(type) {
    return type === 'ris' ? this.risingDate : this.settingDate;
  }

  itemValue(type) {
    return formatTime(this.itemDate(type));
  }
}

customElements.define('more-info-sun', MoreInfoSun);
