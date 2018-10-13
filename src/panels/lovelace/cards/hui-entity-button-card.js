import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import "../../../components/ha-card.js";

import { STATES_OFF } from "../../../common/const.js";
import toggleEntity from "../common/entity/toggle-entity.js";
import stateIcon from "../../../common/entity/state_icon.js";
import EventsMixin from "../../../mixins/events-mixin.js";
import LocalizeMixin from "../../../mixins/localize-mixin.js";

/*
 * @appliesMixin EventsMixin
 */
class HuiEntityButtonCard extends LocalizeMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
    <style>
      ha-icon {
        display: flex;
        margin: auto;
        width: 40%;
        height: 40%;
        color: var(--paper-item-icon-color, #44739e);
      }
      state-badge {
        display: flex;
        margin: auto;
        width:40%;
        height:40%;
      }
      paper-button {
        display: flex;
        margin: auto;
        text-align: center;
      }
      .not-found {
        flex: 1;
        background-color: yellow;
        padding: 8px;
      }
    </style>
    <ha-card on-click='_handleClick'>
      <paper-button>
        <div class$='[[_computeClassName(_stateObj)]]'>
          <ha-icon id='ButtonIcon' icon='[[_computeIcon(_stateObj)]]'></ha-icon>
          <span>[[_computeName(_stateObj)]]</span>
        </div>
      </paper-button>
    </ha-card>
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
      },
      _config: Object,
      _stateObj: {
        type: Object,
        computed: "_computeStateObj(hass.states, _config.entity)",
        observer: "stateObjChanged",
      },
    };
  }

  getCardSize() {
    return 1;
  }

  setConfig(config) {
    if (!config || !config.entity)
      throw new Error("Invalid card configuration");
    this._config = Object.assign({ show_state: true }, config);
  }

  _computeStateObj(states, entityId) {
    return states && entityId in states ? states[entityId] : null;
  }

  stateObjChanged() {
    const stateObj = this._stateObj;
    if (!stateObj) return;

    const iconStyle = {
      color: "",
      filter: "",
    };
    if (stateObj.attributes.hs_color) {
      const hue = stateObj.attributes.hs_color[0];
      const sat = stateObj.attributes.hs_color[1];
      if (sat > 10) iconStyle.color = `hsl(${hue}, 100%, ${100 - sat / 2}%)`;
    } else if (!STATES_OFF.includes(stateObj.state)) {
      iconStyle.color = "var(--paper-item-icon-active-color";
    }

    if (stateObj.attributes.brightness) {
      const brightness = stateObj.attributes.brightness;
      iconStyle.filter = `brightness(${(brightness + 245) / 5}%)`;
    }
    Object.assign(this.$.ButtonIcon.style, iconStyle);
  }

  _computeName(stateObj) {
    const config = this._config;
    if (!stateObj) return "Entity not available: " + this._config.entity;
    return config.name ? config.name : stateObj.attributes.friendly_name;
  }

  _computeIcon(stateObj) {
    const config = this._config;
    if (!stateObj) return "";
    return config.icon ? config.icon : stateIcon(stateObj);
  }

  _computeClassName(stateObj) {
    if (!stateObj) return "not-found";
    return "";
  }

  _handleClick() {
    if (!this._stateObj) return;
    const config = this._config;
    const stateObj = this._stateObj;
    var entityId = stateObj.entity_id;
    switch (config.tap_action) {
      case "toggle":
        toggleEntity(this.hass, entityId);
        break;
      case "call-service": {
        const [domain, service] = config.service.split(".", 2);
        const serviceData = Object.assign(
          { entity_id: entityId },
          config.service_data
        );
        this.hass.callService(domain, service, serviceData);
        break;
      }
      default:
        this.fire("hass-more-info", { entityId });
    }
  }
}

customElements.define("hui-entity-button-card", HuiEntityButtonCard);
