import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/iron-icon/iron-icon.js';
import '../components/ha-card.js';
import '../util/hass-mixins.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
class HaPlantCard extends window.hassMixins.EventsMixin(PolymerElement) {
  static get template() {
    return html`
    <style>
      .content {
        display: flex;
        justify-content: space-between;
        padding: 0 32px 24px 32px;
      }
      iron-icon {
        color: var(--paper-item-icon-color);
        margin-bottom: 8px;
      }
      .attributes {
        cursor: pointer;
      }
      .attributes div {
        text-align: center;
      }
      .problem {
        color: var(--google-red-500);
        font-weight: bold;
      }
      .uom {
        color: var(--secondary-text-color);
      }
    </style>

    <ha-card header="[[computeTitle(stateObj)]]">
      <div class="content">
        <template is="dom-repeat" items="[[computeAttributes(stateObj.attributes)]]">
          <div class="attributes" on-click="attributeClicked">
            <div><iron-icon icon="[[computeIcon(item, stateObj.attributes.battery)]]"></iron-icon></div>
            <div class\$="[[computeClass(stateObj.attributes.problem, item)]]">
              [[computeValue(stateObj.attributes, item)]]
            </div>
            <div class="uom">[[computeUom(stateObj.attributes.unit_of_measurement_dict, item)]]</div>
          </div>
        </template>
      </div>
    </ha-card>
`;
  }

  static get is() { return 'ha-plant-card'; }
  static get properties() {
    return {
      hass: Object,
      stateObj: Object
    };
  }

  constructor() {
    super();
    this.sensors = {
      moisture: 'mdi:water',
      temperature: 'mdi:thermometer',
      brightness: 'mdi:white-balance-sunny',
      conductivity: 'mdi:emoticon-poop',
      battery: 'mdi:battery'
    };
  }

  computeTitle(stateObj) {
    return window.hassUtil.computeStateName(stateObj);
  }

  computeAttributes(data) {
    return Object.keys(this.sensors).filter(key => key in data);
  }

  computeIcon(attr, batLvl) {
    const icon = this.sensors[attr];
    if (attr === 'battery') {
      if (batLvl <= 5) {
        return `${icon}-alert`;
      } else if (batLvl < 95) {
        return `${icon}-${Math.round((batLvl / 10) - 0.01) * 10}`;
      }
    }
    return icon;
  }

  computeValue(attributes, attr) {
    return attributes[attr];
  }

  computeUom(dict, attr) {
    return dict[attr] || '';
  }

  computeClass(problem, attr) {
    return problem.indexOf(attr) === -1 ? '' : 'problem';
  }

  attributeClicked(ev) {
    this.fire('hass-more-info', { entityId: this.stateObj.attributes.sensors[ev.model.item] });
  }
}

customElements.define(HaPlantCard.is, HaPlantCard);
