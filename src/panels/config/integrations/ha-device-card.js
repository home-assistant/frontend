import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../components/ha-card";
import "../../../layouts/hass-subpage";

import EventsMixin from "../../../mixins/events-mixin";
import LocalizeMixin from "../../../mixins/localize-mixin";
import computeStateName from "../../../common/entity/compute_state_name";
import "../../../components/entity/state-badge";
import compare from "../../../common/string/compare";
import { updateDeviceRegistryEntry } from "../../../data/device_registry";

function computeEntityName(hass, entity) {
  if (entity.name) return entity.name;
  const state = hass.states[entity.entity_id];
  return state ? computeStateName(state) : null;
}

/*
 * @appliesMixin EventsMixin
 */
class HaDeviceCard extends EventsMixin(LocalizeMixin(PolymerElement)) {
  static get template() {
    return html`
      <style>
        :host(:not([narrow])) .device-entities {
          max-height: 225px;
          overflow: auto;
        }
        ha-card {
          flex: 1 0 100%;
          padding-bottom: 10px;
          min-width: 0;
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
        .extra-info {
          margin-top: 8px;
        }
        paper-icon-item {
          cursor: pointer;
          padding-top: 4px;
          padding-bottom: 4px;
        }
        .manuf,
        .entity-id {
          color: var(--secondary-text-color);
        }
      </style>
      <ha-card header="[[device.name]]">
        <div class="card-content">
          <!--
            <h1>[[configEntry.title]] ([[_computeIntegrationTitle(localize, configEntry.domain)]])</h1>
          -->
          <div class="info">
            <div class="model">[[device.model]]</div>
            <div class="manuf">
              [[localize('ui.panel.config.integrations.config_entry.manuf',
              'manufacturer', device.manufacturer)]]
            </div>
            <div class="area">
              <paper-dropdown-menu
                selected-item-label="{{selectedArea}}"
                label="Area"
              >
                <paper-listbox
                  slot="dropdown-content"
                  selected="[[_computeSelectedArea(areas, device)]]"
                >
                  <paper-item>
                    [[localize('ui.panel.config.integrations.config_entry.no_area')]]
                  </paper-item>
                  <template is="dom-repeat" items="[[areas]]">
                    <paper-item area="[[item]]">[[item.name]]</paper-item>
                  </template>
                </paper-listbox>
              </paper-dropdown-menu>
            </div>
          </div>
          <template is="dom-if" if="[[device.hub_device_id]]">
            <div class="extra-info">
              [[localize('ui.panel.config.integrations.config_entry.hub')]]
              <span class="hub"
                >[[_computeDeviceName(devices, device.hub_device_id)]]</span
              >
            </div>
          </template>
          <template is="dom-if" if="[[device.sw_version]]">
            <div class="extra-info">
              [[localize('ui.panel.config.integrations.config_entry.firmware',
              'version', device.sw_version)]]
            </div>
          </template>
        </div>

        <div class="device-entities">
          <template
            is="dom-repeat"
            items="[[_computeDeviceEntities(hass, device, entities)]]"
            as="entity"
          >
            <paper-icon-item on-click="_openMoreInfo">
              <state-badge
                state-obj="[[_computeStateObj(entity, hass)]]"
                slot="item-icon"
              ></state-badge>
              <paper-item-body>
                <div class="name">[[_computeEntityName(entity, hass)]]</div>
                <div class="secondary entity-id">[[entity.entity_id]]</div>
              </paper-item-body>
            </paper-icon-item>
          </template>
        </div>
      </ha-card>
    `;
  }

  static get properties() {
    return {
      device: Object,
      devices: Array,
      areas: Array,
      entities: Array,
      hass: Object,
      narrow: {
        type: Boolean,
        reflectToAttribute: true,
      },
      _childDevices: {
        type: Array,
        computed: "_computeChildDevices(device, devices)",
      },
      selectedArea: {
        type: String,
        observer: "_selectedAreaChanged",
      },
    };
  }

  _computeSelectedArea(areas, device) {
    if (!areas || !device || !device.area_id) {
      return 0;
    }
    // +1 because of "No Area" entry
    return areas.findIndex((area) => area.area_id === device.area_id) + 1;
  }

  async _selectedAreaChanged(option) {
    // Selected Option will transition to '' before transitioning to new value
    if (option === "" || !this.device || !this.areas) {
      return;
    }
    const area =
      option === "No Area"
        ? undefined
        : this.areas.find((ar) => ar.name === option);

    if (
      (!area && !this.device.area_id) ||
      (area && area.area_id === this.device.area_id)
    ) {
      return;
    }

    await updateDeviceRegistryEntry(this.hass, this.device.id, {
      area_id: area ? area.area_id : null,
    });
  }

  _computeChildDevices(device, devices) {
    return devices
      .filter((dev) => dev.hub_device_id === device.id)
      .sort((dev1, dev2) => compare(dev1.name, dev2.name));
  }

  _computeDeviceEntities(hass, device, entities) {
    return entities
      .filter((entity) => entity.device_id === device.id)
      .sort((ent1, ent2) =>
        compare(
          computeEntityName(hass, ent1) || `zzz${ent1.entity_id}`,
          computeEntityName(hass, ent2) || `zzz${ent2.entity_id}`
        )
      );
  }

  _computeStateObj(entity, hass) {
    return hass.states[entity.entity_id];
  }

  _computeEntityName(entity, hass) {
    return (
      computeEntityName(hass, entity) ||
      `(${this.localize(
        "ui.panel.config.integrations.config_entry.entity_unavailable"
      )})`
    );
  }

  _computeDeviceName(devices, deviceId) {
    const device = devices.find((dev) => dev.id === deviceId);
    return device
      ? device.name
      : `(${this.localize(
          "ui.panel.config.integrations.config_entry.device_unavailable"
        )})`;
  }

  _openMoreInfo(ev) {
    this.fire("hass-more-info", { entityId: ev.model.entity.entity_id });
  }
}

customElements.define("ha-device-card", HaDeviceCard);
