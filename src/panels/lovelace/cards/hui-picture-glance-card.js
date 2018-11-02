import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../components/ha-card";
import "../../../components/ha-icon";
import "../components/hui-image";

import computeStateDisplay from "../../../common/entity/compute_state_display";
import computeStateName from "../../../common/entity/compute_state_name";
import { DOMAINS_TOGGLE } from "../../../common/const";
import stateIcon from "../../../common/entity/state_icon";
import toggleEntity from "../common/entity/toggle-entity";
import processConfigEntities from "../common/process-config-entities";

import EventsMixin from "../../../mixins/events-mixin";
import LocalizeMixin from "../../../mixins/localize-mixin";
import NavigateMixin from "../../../mixins/navigate-mixin";
import computeDomain from "../../../common/entity/compute_domain";

const STATES_OFF = new Set(["closed", "locked", "not_home", "off"]);

/*
 * @appliesMixin EventsMixin
 * @appliesMixin LocalizeMixin
 * @appliesMixin NavigateMixin
 */
class HuiPictureGlanceCard extends NavigateMixin(
  LocalizeMixin(EventsMixin(PolymerElement))
) {
  static get template() {
    return html`
      <style>
        ha-card {
          position: relative;
          min-height: 48px;
          overflow: hidden;
        }
        hui-image.clickable {
          cursor: pointer;
        }
        .box {
          @apply --paper-font-common-nowrap;
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.3);
          padding: 4px 8px;
          font-size: 16px;
          line-height: 40px;
          color: white;
          display: flex;
          justify-content: space-between;
        }
        .box .title {
          font-weight: 500;
          margin-left: 8px;
        }
        ha-icon {
          cursor: pointer;
          padding: 8px;
          color: #A9A9A9;
        }
        ha-icon.state-on {
          color: white;
        }
      </style>

      <ha-card>
        <hui-image
          class$='[[_computeImageClass(_config)]]'
          on-click='_handleImageClick'
          hass="[[hass]]"
          image="[[_config.image]]"
          state-image="[[_config.state_image]]"
          camera-image="[[_config.camera_image]]"
          entity="[[_config.entity]]"
          aspect-ratio="[[_config.aspect_ratio]]"
        ></hui-image>
        <div class="box">
          <template is="dom-if" if="[[_config.title]]">
            <div class="title">[[_config.title]]</div>
          </template>
          <div>
            <template is="dom-repeat" items="[[_computeVisible(_entitiesDialog, hass.states)]]">
              <ha-icon
                on-click="_openDialog"
                class$="[[_computeButtonClass(item.entity, hass.states)]]"
                icon="[[_computeIcon(item, hass.states)]]"
                title="[[_computeTooltip(item.entity, hass.states)]]"
              ></ha-icon>
            </template>
          </div>
          <div>
            <template is="dom-repeat" items="[[_computeVisible(_entitiesToggle, hass.states)]]">
              <ha-icon
                on-click="_callService"
                class$="[[_computeButtonClass(item.entity, hass.states)]]"
                icon="[[_computeIcon(item, hass.states)]]"
                title="[[_computeTooltip(item.entity, hass.states)]]"
              ></ha-icon>
            </template>
          </div>
        </div>
      </ha-card>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      _config: Object,
      _entitiesDialog: Array,
      _entitiesToggle: Array,
    };
  }

  getCardSize() {
    return 3;
  }

  setConfig(config) {
    if (
      !config ||
      !config.entities ||
      !Array.isArray(config.entities) ||
      !(config.image || config.camera_image || config.state_image) ||
      (config.state_image && !config.entity)
    ) {
      throw new Error("Invalid card configuration");
    }
    const entities = processConfigEntities(config.entities);
    const dialog = [];
    const toggle = [];

    entities.forEach((item) => {
      if (
        config.force_dialog ||
        !DOMAINS_TOGGLE.has(computeDomain(item.entity))
      ) {
        dialog.push(item);
      } else {
        toggle.push(item);
      }
    });
    this.setProperties({
      _config: config,
      _entitiesDialog: dialog,
      _entitiesToggle: toggle,
    });
  }

  _computeVisible(collection, states) {
    return collection.filter((el) => el.entity in states);
  }

  _computeIcon(item, states) {
    return item.icon || stateIcon(states[item.entity]);
  }

  _computeButtonClass(entityId, states) {
    return STATES_OFF.has(states[entityId].state) ? "" : "state-on";
  }

  _computeTooltip(entityId, states) {
    return `${computeStateName(states[entityId])}: ${computeStateDisplay(
      this.localize,
      states[entityId]
    )}`;
  }

  _computeImageClass(config) {
    return config.navigation_path || config.camera_image ? "clickable" : "";
  }

  _openDialog(ev) {
    this.fire("hass-more-info", { entityId: ev.model.item.entity });
  }

  _callService(ev) {
    toggleEntity(this.hass, ev.model.item.entity);
  }

  _handleImageClick() {
    if (this._config.navigation_path) {
      this.navigate(this._config.navigation_path);
      return;
    }

    if (this._config.camera_image) {
      this.fire("hass-more-info", { entityId: this._config.camera_image });
    }
  }
}
customElements.define("hui-picture-glance-card", HuiPictureGlanceCard);
