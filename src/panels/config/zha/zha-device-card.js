import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-card/paper-card";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../layouts/hass-subpage";

import EventsMixin from "../../../mixins/events-mixin";
import LocalizeMixin from "../../../mixins/localize-mixin";
import "../../../components/entity/state-badge";

/*
 * @appliesMixin EventsMixin
 */
class ZHADeviceCard extends EventsMixin(LocalizeMixin(PolymerElement)) {
  static get template() {
    return html`
      <style>
        :host(:not([narrow])) .device-entities {
          max-height: 225px;
          overflow: auto;
        }
        paper-card {
          flex: 1 0 100%;
          padding-bottom: 10px;
          min-width: 0;
        }
        .device {
          width: 30%;
        }
        .label {
          font-weight: bold;
        }
        .info {
          color: var(--secondary-text-color);
          font-weight: bold;
        }
        dl dt {
          float: left;
          width: 100px;
          text-align: left;
        }
        dt dd {
          margin-left: 10px;
          text-align: left;
        }
        paper-icon-item {
          cursor: pointer;
          padding-top: 4px;
          padding-bottom: 4px;
        }
      </style>
      <paper-card>
        <div class="card-content">
          <dl>
            <dt class="label">IEEE:</dt>
            <dd class="info">[[device.ieee]]</dd>
            <dt class="label">Quirk applied:</dt>
            <dd class="info">[[device.quirk_applied]]</dd>
            <dt class="label">Quirk:</dt>
            <dd class="info">[[device.quirk_class]]</dd>
          </dl>
        </div>

        <div class="device-entities">
          <template is="dom-repeat" items="[[device.entities]]" as="entity">
            <paper-icon-item on-click="_openMoreInfo">
              <state-badge
                state-obj="[[_computeStateObj(entity, hass)]]"
                slot="item-icon"
              ></state-badge>
              <paper-item-body>
                <div class="name">[[entity.name]]</div>
                <div class="secondary entity-id">[[entity.entity_id]]</div>
              </paper-item-body>
            </paper-icon-item>
          </template>
        </div>
      </paper-card>
    `;
  }

  static get properties() {
    return {
      device: Object,
      hass: Object,
      narrow: {
        type: Boolean,
        reflectToAttribute: true,
      },
    };
  }

  _computeStateObj(entity, hass) {
    return hass.states[entity.entity_id];
  }

  _openMoreInfo(ev) {
    this.fire("hass-more-info", { entityId: ev.model.entity.entity_id });
  }
}

customElements.define("zha-device-card", ZHADeviceCard);
