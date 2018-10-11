import "@polymer/app-route/app-route.js";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import "./ha-automation-editor.js";
import "./ha-automation-picker.js";

import computeStateDomain from "../../../common/entity/compute_state_domain.js";

class HaConfigAutomation extends PolymerElement {
  static get template() {
    return html`
    <style>
      ha-automation-picker,
      ha-automation-editor {
        height: 100%;
      }
    </style>
    <app-route route="[[route]]" pattern="/automation/edit/:automation" data="{{_routeData}}" active="{{_edittingAutomation}}"></app-route>
    <app-route route="[[route]]" pattern="/automation/new" active="{{_creatingNew}}"></app-route>

    <template is="dom-if" if="[[!showEditor]]">
      <ha-automation-picker hass="[[hass]]" narrow="[[narrow]]" show-menu="[[showMenu]]" automations="[[automations]]" is-wide="[[isWide]]"></ha-automation-picker>
    </template>

    <template is="dom-if" if="[[showEditor]]" restamp="">
      <ha-automation-editor hass="[[hass]]" automation="[[automation]]" is-wide="[[isWide]]" creating-new="[[_creatingNew]]"></ha-automation-editor>
    </template>
`;
  }

  static get properties() {
    return {
      hass: Object,
      narrow: Boolean,
      showMenu: Boolean,
      route: Object,
      isWide: Boolean,
      _routeData: Object,
      _routeMatches: Boolean,
      _creatingNew: Boolean,
      _edittingAutomation: Boolean,

      automations: {
        type: Array,
        computed: "computeAutomations(hass)",
      },

      automation: {
        type: Object,
        computed:
          "computeAutomation(automations, _edittingAutomation, _routeData)",
      },

      showEditor: {
        type: Boolean,
        computed: "computeShowEditor(_edittingAutomation, _creatingNew)",
      },
    };
  }

  computeAutomation(automations, edittingAddon, routeData) {
    if (!automations || !edittingAddon) {
      return null;
    }
    for (var i = 0; i < automations.length; i++) {
      if (automations[i].attributes.id === routeData.automation) {
        return automations[i];
      }
    }
    return null;
  }

  computeAutomations(hass) {
    var automations = [];

    Object.keys(hass.states).forEach(function(key) {
      var entity = hass.states[key];

      if (
        computeStateDomain(entity) === "automation" &&
        "id" in entity.attributes
      ) {
        automations.push(entity);
      }
    });

    return automations.sort(function entitySortBy(entityA, entityB) {
      var nameA = (entityA.attributes.alias || entityA.entity_id).toLowerCase();
      var nameB = (entityB.attributes.alias || entityB.entity_id).toLowerCase();

      if (nameA < nameB) {
        return -1;
      }
      if (nameA > nameB) {
        return 1;
      }
      return 0;
    });
  }

  computeShowEditor(_edittingAutomation, _creatingNew) {
    return _creatingNew || _edittingAutomation;
  }
}

customElements.define("ha-config-automation", HaConfigAutomation);
