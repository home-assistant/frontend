import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '../../../components/ha-relative-time.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
class MoreInfoSun extends PolymerElement {
  static get template() {
    return html`
    <style is="custom-style" include="iron-flex iron-flex-alignment"></style>

    <template is="dom-repeat" items="[[computeOrder(risingDate, settingDate)]]">
      <div class="data-entry layout justified horizontal">
        <div class="key">
          <span>[[itemCaption(item)]]</span>
          <ha-relative-time datetime-obj="[[itemDate(item)]]"></ha-relative-time>
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

  static get is() { return 'more-info-sun'; }

  static get properties() {
    return {
      stateObj: {
        type: Object,
      },

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
    return window.hassUtil.formatTime(this.itemDate(type));
  }
}

customElements.define(MoreInfoSun.is, MoreInfoSun);
