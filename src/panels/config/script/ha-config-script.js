import '@polymer/app-route/app-route.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import './ha-script-editor.js';
import './ha-script-picker.js';

import computeStateName from '../../../common/entity/compute_state_name.js';
import computeStateDomain from '../../../common/entity/compute_state_domain.js';

class HaConfigScript extends PolymerElement {
  static get template() {
    return html`
    <style>
      ha-script-picker,
      ha-script-editor {
        height: 100%;
      }
    </style>
    <app-route route="[[route]]" pattern="/script/edit/:script" data="{{_routeData}}" active="{{_edittingScript}}"></app-route>
    <app-route route="[[route]]" pattern="/script/new" active="{{_creatingNew}}"></app-route>

    <template is="dom-if" if="[[!showEditor]]">
      <ha-script-picker hass="[[hass]]" narrow="[[narrow]]" show-menu="[[showMenu]]" scripts="[[scripts]]" is-wide="[[isWide]]"></ha-script-picker>
    </template>

    <template is="dom-if" if="[[showEditor]]" restamp="">
      <ha-script-editor hass="[[hass]]" script="[[script]]" is-wide="[[isWide]]" creating-new="[[_creatingNew]]"></ha-script-editor>
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
      _edittingScript: Boolean,

      scripts: {
        type: Array,
        computed: 'computeScripts(hass)',
      },

      script: {
        type: Object,
        computed: 'computeScript(scripts, _edittingScript, _routeData)',
      },

      showEditor: {
        type: Boolean,
        computed: 'computeShowEditor(_edittingScript, _creatingNew)',
      }
    };
  }

  computeScript(scripts, edittingAddon, routeData) {
    if (!scripts || !edittingAddon) {
      return null;
    }
    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i].entity_id === routeData.script) {
        return scripts[i];
      }
    }
    return null;
  }

  computeScripts(hass) {
    var scripts = [];

    Object.keys(hass.states).forEach(function (key) {
      var entity = hass.states[key];

      if (computeStateDomain(entity) === 'script') {
        scripts.push(entity);
      }
    });

    return scripts.sort(function entitySortBy(entityA, entityB) {
      var nameA = computeStateName(entityA);
      var nameB = computeStateName(entityB);

      if (nameA < nameB) {
        return -1;
      }
      if (nameA > nameB) {
        return 1;
      }
      return 0;
    });
  }

  computeShowEditor(_edittingScript, _creatingNew) {
    return _creatingNew || _edittingScript;
  }
}

customElements.define('ha-config-script', HaConfigScript);
