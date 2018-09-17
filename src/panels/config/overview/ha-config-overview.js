import '@polymer/paper-card/paper-card.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../layouts/hass-subpage.js';

import computeStateName from '../../../common/entity/compute_state_name.js';
import '../../../components/entity/state-badge.js';

import './ha-overview-device-row.js';
import compare from '../../../common/string/compare.js';

class HaConfigOverview extends PolymerElement {
  static get template() {
    return html`
    <style>
      a {
        color: var(--primary-color);
      }
      paper-card {
        display: block;
        margin: 16px auto;
        max-width: 500px;
      }
      li {
        color: var(--primary-text-color);
      }
      .secondary {
        color: var(--secondary-text-color);
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
      .device .manuf,
      .device .hub {
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
      }
      .entity-row .entity-id {
        color: var(--secondary-text-color);
      }
    </style>
    <hass-subpage header="Overview">
      <div class='content'>
        <template is='dom-if' if='[[!_configs.length]]'>
          <paper-card heading='No integrations'>
            <div class='card-content'>
              No integrations found. <a href='/config/integrations'>Configure an integration</a>
            </div>
          </paper-card>
        </template>
        <template is='dom-repeat' items='[[_configs]]' as='configEntry'>
          <paper-card heading='[[configEntry.title]]'>
            <div class='card-content'>
              <!-- <h1>[[configEntry.title]] ([[_computeIntegrationTitle(localize, configEntry.domain)]])</h1> -->

              <template is='dom-repeat' items='[[_computeConfigEntryDevices(configEntry, _devices)]]' as='device'>
                <ha-overview-device-row
                  hass='[[hass]]'
                  devices='[[_devices]]'
                  device='[[device]]'
                  entities='[[_entities]]'
                ></ha-overview-device-row>
              </template>
            </div>
          </paper-card>
        </dom-repeat>
      </div>
    </hass-subpage>
`;
  }

  static get properties() {
    return {
      hass: Object,
      isWide: Boolean,

      _loading: {
        type: Boolean,
        computed: '_computeLoading(_configs, _devices, _entities)'
      },
      _configs: {
        type: Array,
        value: null,
      },
      _devices: {
        type: Array,
        value: null,
      },
      _entities: {
        type: Array,
        value: null,
      }
    };
  }

  ready() {
    super.ready();
    this._loadData();
  }

  connectedCallback() {
    super.connectedCallback();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }

  _loadData() {
    this.hass.callWS({ type: 'config/entity_registry/list' })
      .then((entities) => { this._entities = entities; });
    this.hass.callWS({ type: 'config/device_registry/list' })
      .then((devices) => { this._devices = devices; });
    this.hass.callApi('get', 'config/config_entries/entry')
      .then((configs) => {
        this._configs = configs.sort((conf1, conf2) => compare(conf1.title, conf2.title));
      });
  }

  _computeLoading(configs, devices, entities) {
    return configs && devices && entities;
  }

  _computeIntegrationTitle(localize, integration) {
    return localize(`component.${integration}.config.title`);
  }

  _computeConfigEntryDevices(configEntry, devices) {
    return devices.filter(device =>
      device.config_entries.includes(configEntry.entry_id) &&
      !device.hub_device_id).sort((dev1, dev2) => compare(dev1.name, dev2.name));
  }

  _computeDeviceEntities(device, entities) {
    return entities.filter(entity => entity.device_id === device.id);
  }

  _computeStateObj(entity, hass) {
    return hass.states[entity.entity_id];
  }

  _computeEntityName(entity, hass) {
    const state = hass.states[entity.entity_id];

    if (state) {
      return computeStateName(state);
    }
    return `${entity.name || ''} (entity unavailable)`;
  }

  _computeDeviceName(devices, deviceId) {
    const device = devices.find(dev => dev.id === deviceId);
    return device ? device.name : '(device unavailable)';
  }
}

customElements.define('ha-config-overview', HaConfigOverview);
