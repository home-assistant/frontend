import '@polymer/paper-card/paper-card.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../layouts/hass-subpage.js';

import EventsMixin from '../../../mixins/events-mixin.js';
import computeStateName from '../../../common/entity/compute_state_name.js';
import '../../../components/entity/state-badge.js';
import compare from '../../../common/string/compare.js';

function computeEntityName(hass, entity) {
  if (entity.name) return enitiy.name;

  const state = hass.states[entity.entity_id];

  return state ? computeStateName(state) : null;
}

/*
 * @appliesMixin EventsMixin
 */
class HaDeviceRow extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
    <style>
      :host {
        display: block;
      }
      .device-row {
        display: flex;
        flex-direction: row;
        margin-bottom: 8px;
      }
      .device {
        width: 30%;
      }
      .device .name {
        font-weight: bold;
      }
      .device .model,
      .device .manuf {
        color: var(--secondary-text-color);
      }
      .entity-rows {
        padding-top: 12px;
        margin-left: 8px;
      }
      .entity-row {
        margin: 8px 0;
        display: flex;
        flex-direction: row;
      }
      state-badge {
        margin-right: 8px;
        cursor: pointer;
      }
      .entity-row .entity-id {
        color: var(--secondary-text-color);
      }
      ha-overview-device-row {
        margin-left: 16px;
      }
    </style>
    <div>
      <div class='device-row'>
      <div class='device'>
        <div class='name'>[[device.name]]</div>
        <div class='model'>[[device.model]]</div>
        <div class='manuf'>by [[device.manufacturer]]</div>
      </div>

      <div class='entity-rows'>
        <template is='dom-repeat' items='[[_computeDeviceEntities(hass, device, entities)]]' as='entity'>
          <div class='entity-row'>
            <state-badge
              state-obj="[[_computeStateObj(entity, hass)]]"
              on-click='_openMoreInfo'
            ></state-badge>
            <div>
              <div class='name'>[[_computeEntityName(entity, hass)]]</div>
              <div class='entity-id'>[[entity.entity_id]]</div>
            </div>
          </div class='entity-row'>
        </template>
      </div>
      </div>
      <template is='dom-repeat' items='[[_childDevices]]' as='device'>
        <ha-overview-device-row
          hass='[[hass]]'
          devices='[[devices]]'
          device='[[device]]'
          entities='[[entities]]'
        ></ha-overview-device-row>
      </template>
    </div>
    `;
  }

  static get properties() {
    return {
      device: Object,
      devices: Array,
      entities: Array,
      hass: Object,
      _childDevices: {
        type: Array,
        computed: '_computeChildDevices(device, devices)',
      }
    };
  }

  _computeChildDevices(device, devices) {
    return devices
      .filter(dev => dev.hub_device_id === device.id)
      .sort((dev1, dev2) => compare(dev1.name, dev2.name));
  }

  _computeDeviceEntities(hass, device, entities) {
    return entities
      .filter(entity => entity.device_id === device.id)
      .sort((ent1, ent2) => compare(
        computeEntityName(hass, ent1) || `zzz${ent1.entity_id}`,
        computeEntityName(hass, ent2) || `zzz${ent2.entity_id}`));
  }

  _computeStateObj(entity, hass) {
    return hass.states[entity.entity_id];
  }

  _computeEntityName(entity, hass) {
    return computeEntityName(hass, entity) || '(entity unavailable)';
  }

  _computeDeviceName(devices, device_id) {
    const device = devices.find(device => device.id === device_id);
    return device ? device.name : '(device unavailable)';
  }

  _openMoreInfo(ev) {
    this.fire('hass-more-info', { entityId: ev.model.entity.entity_id });
  }
}

customElements.define('ha-overview-device-row', HaDeviceRow);
