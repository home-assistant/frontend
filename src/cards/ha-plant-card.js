import '@polymer/iron-icon/iron-icon.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/ha-card.js';

import computeStateName from '../common/entity/compute_state_name.js';
import EventsMixin from '../mixins/events-mixin.js';

class HaPlantCard extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
    <style>
      .banner {
        display: flex;
        align-items: flex-end;
        background-repeat: no-repeat;
        background-size: cover;
        background-position: center;
        padding-top: 12px;
      }
      .has-plant-image .banner {
        padding-top: 30%;
      }
      .header {
        @apply --paper-font-headline;
        line-height: 40px;
        padding: 8px 16px;
      }
      .has-plant-image .header {
        color: white;
        width: 100%;
        background:rgba(0, 0, 0, var(--dark-secondary-opacity));
      }
      .content {
        display: flex;
        justify-content: space-between;
        padding: 16px 32px 24px 32px;
      }
      .has-plant-image .content {
        padding-bottom: 16px;
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

    <ha-card class$="[[computeImageClass(stateObj.attributes.entity_picture)]]">
      <div class="banner" style="background-image:url([[stateObj.attributes.entity_picture]])">
        <div class="header">[[computeTitle(stateObj)]]</div>
      </div>
      <div class="content">
        <template is="dom-repeat" items="[[computeAttributes(stateObj.attributes)]]">
          <div class="attributes" on-click="attributeClicked">
            <div><iron-icon icon="[[computeIcon(item, stateObj.attributes.battery)]]"></iron-icon></div>
            <div class$="[[computeAttributeClass(stateObj.attributes.problem, item)]]">
              [[computeValue(stateObj.attributes, item)]]
            </div>
            <div class="uom">[[computeUom(stateObj.attributes.unit_of_measurement_dict, item)]]</div>
          </div>
        </template>
      </div>
    </ha-card>
`;
  }

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
    return computeStateName(stateObj);
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

  computeAttributeClass(problem, attr) {
    return problem.indexOf(attr) === -1 ? '' : 'problem';
  }

  computeImageClass(entityPicture) {
    return entityPicture ? 'has-plant-image' : '';
  }

  attributeClicked(ev) {
    this.fire('hass-more-info', { entityId: this.stateObj.attributes.sensors[ev.model.item] });
  }
}

customElements.define('ha-plant-card', HaPlantCard);
