import '@polymer/paper-card/paper-card.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../layouts/hass-subpage.js';

import '../../../components/entity/state-badge.js';
import compare from '../../../common/string/compare.js';

import './ha-device-card.js';
import EventsMixin from '../../../mixins/events-mixin.js';
import NavigateMixin from '../../../mixins/navigate-mixin.js';

class HaConfigEntryPage extends NavigateMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
  <style>
    .content {
      display: flex;
      flex-wrap: wrap;
      padding: 4px;
      justify-content: center;
    }
    ha-device-card {
      flex: 1;
      min-width: 300px;
      max-width: 300px;
      margin: 8px;

    }
    @media(max-width: 600px) {
      ha-device-card {
        max-width: 500px;
        margin-left: auto;
        margin-right: auto;
      }
    }
  </style>
  <hass-subpage header='[[configEntry.title]]'>
    <paper-icon-button
      slot='toolbar-icon'
      icon='hass:delete'
      on-click='_removeEntry'
    ></paper-icon-button>
    <div class='content'>
      <template is='dom-repeat' items='[[_computeConfigEntryDevices(configEntry, devices)]]' as='device'>
        <ha-device-card
          hass='[[hass]]'
          devices='[[devices]]'
          device='[[device]]'
          entities='[[entities]]'
        ></ha-device-card>
      </template>
    </div>
  </hass-subpage>
`;
  }

  static get properties() {
    return {
      hass: Object,
      isWide: Boolean,

      configEntry: {
        type: Object,
        value: null,
      },

      /**
       * Existing entries.
       */
      _entries: Array,

      /**
       * Entity Registry entries.
       */
      _entities: Array,
    };
  }

  _computeConfigEntryDevices(configEntry, devices) {
    if (!devices) return [];
    return devices
      .filter(device => device.config_entries.includes(configEntry.entry_id))
      .sort((dev1, dev2) => (!!dev1.hub_device_id - !!dev2.hub_device_id)
            || compare(dev1.name, dev2.name));
  }

  _removeEntry() {
    if (!confirm('Are you sure you want to delete this integration?')) return;

    const entryId = this.configEntry.entry_id;

    this.hass.callApi('delete', `config/config_entries/entry/${entryId}`)
      .then((result) => {
        this.fire('hass-reload-entries');
        if (result.require_restart) {
          alert('Restart Home Assistant to finish removing this integration');
        }
        this.navigate('/config/integrations/dashboard', true);
      });
  }
}

customElements.define('ha-config-entry-page', HaConfigEntryPage);
