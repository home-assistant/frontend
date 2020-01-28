import "@polymer/paper-icon-button/paper-icon-button";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../layouts/hass-tabs-subpage";
import "../../../resources/ha-style";
import "../../../components/ha-paper-icon-button-arrow-prev";

import "../ha-config-section";
import "../ha-entity-config";
import "./ha-form-customize";

import { computeStateName } from "../../../common/entity/compute_state_name";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { sortStatesByName } from "../../../common/entity/states_sort_by_name";
import LocalizeMixin from "../../../mixins/localize-mixin";

import { configSections } from "../ha-panel-config";

/*
 * @appliesMixin LocalizeMixin
 */
class HaConfigCustomize extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style include="ha-style">
        ha-paper-icon-button-arrow-prev[hide] {
          visibility: hidden;
        }
      </style>

      <hass-tabs-subpage
        hass="[[hass]]"
        narrow="[[narrow]]"
        route="[[route]]"
        back-path="/config"
        tabs="[[_computeTabs()]]"
        show-advanced="[[showAdvanced]]"
      >
        <div class$="[[computeClasses(isWide)]]">
          <ha-config-section is-wide="[[isWide]]">
            <span slot="header">
              [[localize('ui.panel.config.customize.picker.header')]]
            </span>
            <span slot="introduction">
              [[localize('ui.panel.config.customize.picker.introduction')]]
            </span>
            <ha-entity-config
              hass="[[hass]]"
              label="Entity"
              entities="[[entities]]"
              config="[[entityConfig]]"
            >
            </ha-entity-config>
          </ha-config-section>
        </div>
      </hass-tabs-subpage>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      isWide: Boolean,
      narrow: Boolean,
      route: Object,
      showAdvanced: Boolean,
      entities: {
        type: Array,
        computed: "computeEntities(hass)",
      },

      entityConfig: {
        type: Object,
        value: {
          component: "ha-form-customize",
          computeSelectCaption: (stateObj) =>
            computeStateName(stateObj) +
            " (" +
            computeStateDomain(stateObj) +
            ")",
        },
      },
    };
  }

  computeClasses(isWide) {
    return isWide ? "content" : "content narrow";
  }

  _backTapped() {
    history.back();
  }

  _computeTabs() {
    return configSections.general;
  }

  computeEntities(hass) {
    return Object.keys(hass.states)
      .map((key) => hass.states[key])
      .sort(sortStatesByName);
  }
}
customElements.define("ha-config-customize", HaConfigCustomize);
