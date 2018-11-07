import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-button/paper-button";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-input/paper-input";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import EventsMixin from "../../mixins/events-mixin";
import LocalizeMixin from "../../mixins/localize-mixin";

import computeStateName from "../../common/entity/compute_state_name";
import computeDomain from "../../common/entity/compute_domain";
import isComponentLoaded from "../../common/config/is_component_loaded";

/*
 * @appliesMixin EventsMixin
 * @appliesMixin LocalizeMixin
 */
class MoreInfoSettings extends LocalizeMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
      <style>
        app-toolbar {
          color: var(--more-info-header-color);
          background-color: var(--more-info-header-background);

          /* to fit save button */
          padding-right: 0;
        }

        app-toolbar [main-title] {
          @apply --ha-more-info-app-toolbar-title;
        }

        app-toolbar paper-button {
          font-size: 0.8em;
          margin: 0;
        }

        .form {
          padding: 0 24px 24px;
        }
      </style>

      <app-toolbar>
        <paper-icon-button
          icon="hass:arrow-left"
          on-click="_backTapped"
        ></paper-icon-button>
        <div main-title="">[[_computeStateName(stateObj)]]</div>
        <paper-button on-click="_save" disabled="[[_computeInvalid(_entityId)]]"
          >[[localize('ui.dialogs.more_info_settings.save')]]</paper-button
        >
      </app-toolbar>

      <div class="form">
        <paper-input
          value="{{_name}}"
          label="[[localize('ui.dialogs.more_info_settings.name')]]"
        ></paper-input>
        <paper-input
          value="{{_entityId}}"
          label="[[localize('ui.dialogs.more_info_settings.entity_id')]]"
          error-message="Domain needs to stay the same"
          invalid="[[_computeInvalid(_entityId)]]"
        ></paper-input>
      </div>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      stateObj: Object,

      _componentLoaded: {
        type: Boolean,
        computed: "_computeComponentLoaded(hass)",
      },

      registryInfo: {
        type: Object,
        observer: "_registryInfoChanged",
        notify: true,
      },

      _name: String,
      _entityId: String,
    };
  }

  _computeStateName(stateObj) {
    if (!stateObj) return "";
    return computeStateName(stateObj);
  }

  _computeComponentLoaded(hass) {
    return isComponentLoaded(hass, "config.entity_registry");
  }

  _computeInvalid(entityId) {
    return computeDomain(this.stateObj.entity_id) !== computeDomain(entityId);
  }

  _registryInfoChanged(newVal) {
    if (newVal) {
      this.setProperties({
        _name: newVal.name,
        _entityId: newVal.entity_id,
      });
    } else {
      this.setProperties({
        _name: "",
        _entityId: "",
      });
    }
  }

  _backTapped() {
    this.fire("more-info-page", { page: null });
  }

  async _save() {
    try {
      const info = await this.hass.callWS({
        type: "config/entity_registry/update",
        entity_id: this.stateObj.entity_id,
        name: this._name,
        new_entity_id: this._entityId,
      });

      this.registryInfo = info;

      // Keep the more info dialog open at the new entity.
      if (this.stateObj.entity_id !== this._entityId) {
        this.fire("hass-more-info", { entityId: this._entityId });
      }
    } catch (err) {
      alert(`save failed: ${err.message}`);
    }
  }
}
customElements.define("more-info-settings", MoreInfoSettings);
