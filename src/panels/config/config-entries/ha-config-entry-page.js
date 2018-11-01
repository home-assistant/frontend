import "@polymer/paper-card/paper-card";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../layouts/hass-subpage";

import "../../../components/entity/state-badge";
import compare from "../../../common/string/compare";

import "./ha-device-card";
import "./ha-ce-entities-card";
import EventsMixin from "../../../mixins/events-mixin";
import LocalizeMixin from "../../../mixins/localize-mixin";
import NavigateMixin from "../../../mixins/navigate-mixin";

class HaConfigEntryPage extends NavigateMixin(
  EventsMixin(LocalizeMixin(PolymerElement))
) {
  static get template() {
    return html`
  <style>
    .content {
      display: flex;
      flex-wrap: wrap;
      padding: 4px;
      justify-content: center;
    }
    .card {
      box-sizing: border-box;
      display: flex;
      flex: 1 0 300px;
      max-width: 500px;
      padding: 8px;
    }
  </style>
  <hass-subpage header='[[configEntry.title]]'>
    <paper-icon-button
      slot='toolbar-icon'
      icon='hass:delete'
      on-click='_removeEntry'
    ></paper-icon-button>
    <div class='content'>
      <template is='dom-if' if='[[_computeIsEmpty(_configEntryDevices, _noDeviceEntities)]]'>
        <p>[[localize('ui.panel.config.integrations.config_entry.no_devices')]]</p>
      </template>
      <template is='dom-repeat' items='[[_configEntryDevices]]' as='device'>
        <ha-device-card
          class="card"
          hass='[[hass]]'
          devices='[[devices]]'
          device='[[device]]'
          entities='[[entities]]'
          narrow='[[narrow]]'
        ></ha-device-card>
      </template>
      <template is='dom-if' if='[[_noDeviceEntities.length]]'>
        <ha-ce-entities-card
          class="card"
          heading="[[localize('ui.panel.config.integrations.config_entry.no_device')]]"
          entities='[[_noDeviceEntities]]'
          hass='[[hass]]'
          narrow='[[narrow]]'
        ></ha-ce-entities-card>
      </template>
    </div>
  </hass-subpage>
`;
  }

  static get properties() {
    return {
      hass: Object,
      isWide: Boolean,
      narrow: Boolean,
      configEntry: {
        type: Object,
        value: null,
      },

      _configEntryDevices: {
        type: Array,
        computed: "_computeConfigEntryDevices(configEntry, devices)",
      },

      /**
       * All entity registry entries for this config entry that do not belong
       * to a device.
       */
      _noDeviceEntities: {
        type: Array,
        computed: "_computeNoDeviceEntities(configEntry, entities)",
      },

      /**
       * Device registry entries
       */
      devices: Array,

      /**
       * Existing entries.
       */
      entries: Array,

      /**
       * Entity Registry entries.
       */
      entities: Array,
    };
  }

  _computeConfigEntryDevices(configEntry, devices) {
    if (!devices) return [];
    return devices
      .filter((device) => device.config_entries.includes(configEntry.entry_id))
      .sort(
        (dev1, dev2) =>
          !!dev1.hub_device_id - !!dev2.hub_device_id ||
          compare(dev1.name, dev2.name)
      );
  }

  _computeNoDeviceEntities(configEntry, entities) {
    if (!entities) return [];
    return entities.filter(
      (ent) => !ent.device_id && ent.config_entry_id === configEntry.entry_id
    );
  }

  _computeIsEmpty(configEntryDevices, noDeviceEntities) {
    return configEntryDevices.length === 0 && noDeviceEntities.length === 0;
  }

  _removeEntry() {
    if (
      !confirm(
        this.localize(
          "ui.panel.config.integrations.config_entry.delete_confirm"
        )
      )
    )
      return;

    const entryId = this.configEntry.entry_id;

    this.hass
      .callApi("delete", `config/config_entries/entry/${entryId}`)
      .then((result) => {
        this.fire("hass-reload-entries");
        if (result.require_restart) {
          alert(
            this.localize(
              "ui.panel.config.integrations.config_entry.restart_confirm"
            )
          );
        }
        this.navigate("/config/integrations/dashboard", true);
      });
  }
}

customElements.define("ha-config-entry-page", HaConfigEntryPage);
