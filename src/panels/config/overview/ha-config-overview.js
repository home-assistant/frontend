import '@polymer/paper-card/paper-card.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../layouts/hass-subpage.js';

import EventsMixin from '../../../mixins/events-mixin.js';
import LocalizeMixin from '../../../mixins/localize-mixin.js';
import computeStateName from '../../../common/entity/compute_state_name.js';
import '../../../components/entity/state-badge.js';

/*
 * @appliesMixin LocalizeMixin
 * @appliesMixin EventsMixin
 */
class HaConfigOverview extends
  LocalizeMixin(EventsMixin(PolymerElement)) {
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
      .device .model, .device .manuf {
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
                <div class='device-row'>
                  <div class='device'>
                    <div class='name'>[[device.name]]</div>
                    <div class='model'>[[device.model]]</div>
                    <div class='manuf'>by [[device.manufacturer]]</div>
                  </div>

                  <div class='entity-rows'>
                    <template is='dom-repeat' items='[[_computeDeviceEntities(device, _entities)]]' as='entity'>
                      <div class='entity-row'>
                        <state-badge
                          state-obj="[[_computeStateObj(entity, hass)]]"
                        ></state-badge>
                        <div>
                          <div class='name'>[[_computeEntityName(entity, hass)]]</div>
                          <div class='entity-id'>[[entity.entity_id]]</div>
                        </div>
                      </div class='entity-row'>
                    </template>
                  </div>
                </div>
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
      .then((configs) => { this._configs = configs; });
  }

  _computeLoading(configs, devices, entities) {
    return configs && devices && entities;
  }

  _computeIntegrationTitle(localize, integration) {
    return localize(`component.${integration}.config.title`);
  }

  _computeConfigEntryDevices(configEntry, devices) {
    return devices.filter(device => device.config_entries.includes(configEntry.entry_id));
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
    return `${entity.name || entity.entity_id} (unavailable)`;
  }
}

customElements.define('ha-config-overview', HaConfigOverview);
