import { dom } from '@polymer/polymer/lib/legacy/polymer.dom.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../state-summary/state-card-content.js';

import computeStateDomain from '../../../common/entity/compute_state_domain';
import dynamicContentUpdater from '../../../common/dom/dynamic_content_updater.js';
import stateMoreInfoType from '../../../common/entity/state_more_info_type.js';

class MoreInfoGroup extends PolymerElement {
  static get template() {
    return html`
    <style>
      .child-card {
        margin-bottom: 8px;
      }

      .child-card:last-child {
        margin-bottom: 0;
      }
    </style>

    <div id="groupedControlDetails"></div>
    <template is="dom-repeat" items="[[states]]" as="state">
      <div class="child-card">
        <state-card-content state-obj="[[state]]" hass="[[hass]]"></state-card-content>
      </div>
    </template>
`;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
      },

      stateObj: {
        type: Object,
      },

      states: {
        type: Array,
        computed: 'computeStates(stateObj, hass)',
      },
    };
  }

  static get observers() {
    return [
      'statesChanged(stateObj, states)',
    ];
  }

  computeStates(stateObj, hass) {
    var states = [];
    var entIds = stateObj.attributes.entity_id;

    for (var i = 0; i < entIds.length; i++) {
      var state = hass.states[entIds[i]];

      if (state) {
        states.push(state);
      }
    }

    return states;
  }

  statesChanged(stateObj, states) {
    let groupDomainStateObj = false;

    if (states && states.length > 0) {
      const baseStateObj = states.find(s => s.state === 'on') || states[0];
      const groupDomain = computeStateDomain(baseStateObj);

      // Groups need to be filtered out or we'll show content of
      // first child above the children of the current group
      if (groupDomain !== 'group') {
        groupDomainStateObj = Object.assign({}, baseStateObj, {
          entity_id: stateObj.entity_id,
          attributes: Object.assign({}, baseStateObj.attributes)
        });

        for (let i = 0; i < states.length; i++) {
          if (groupDomain !== computeStateDomain(states[i])) {
            groupDomainStateObj = false;
            break;
          }
        }
      }
    }

    if (!groupDomainStateObj) {
      const el = dom(this.$.groupedControlDetails);
      if (el.lastChild) {
        el.removeChild(el.lastChild);
      }
    } else {
      dynamicContentUpdater(
        this.$.groupedControlDetails,
        'MORE-INFO-' + stateMoreInfoType(groupDomainStateObj).toUpperCase(),
        { stateObj: groupDomainStateObj, hass: this.hass }
      );
    }
  }
}

customElements.define('more-info-group', MoreInfoGroup);
