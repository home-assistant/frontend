import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import "../../../src/components/ha-card";
import "../../../src/dialogs/more-info/more-info-content";
import "../../../src/state-summary/state-card-content";

class DemoMoreInfo extends PolymerElement {
  static get template() {
    return html`
      <style>
        .root {
          display: flex;
        }
        #card {
          max-width: 400px;
          width: 100vw;
        }
        ha-card {
          width: 352px;
          padding: 20px 24px;
        }
        state-card-content {
          display: block;
          margin-bottom: 16px;
        }
        pre {
          width: 400px;
          margin: 0 16px;
          overflow: auto;
          color: var(--primary-text-color);
        }
        @media only screen and (max-width: 800px) {
          .root {
            flex-direction: column;
          }
          pre {
            margin: 16px 0;
          }
        }
      </style>
      <div class="root">
        <div id="card">
          <ha-card>
            <state-card-content
              state-obj="[[_stateObj]]"
              hass="[[hass]]"
              in-dialog
            ></state-card-content>

            <more-info-content
              hass="[[hass]]"
              state-obj="[[_stateObj]]"
            ></more-info-content>
          </ha-card>
        </div>
        <template is="dom-if" if="[[showConfig]]">
          <pre>[[_jsonEntity(_stateObj)]]</pre>
        </template>
      </div>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      entityId: String,
      showConfig: Boolean,
      _stateObj: {
        type: Object,
        computed: "_getState(entityId, hass.states)",
      },
    };
  }

  _getState(entityId, states) {
    return states[entityId];
  }

  _jsonEntity(stateObj) {
    // We are caching some things on stateObj
    // (it sucks, we will remove in the future)
    const tmp = {};
    Object.keys(stateObj).forEach((key) => {
      if (key[0] !== "_") {
        tmp[key] = stateObj[key];
      }
    });
    return JSON.stringify(tmp, null, 2);
  }
}

customElements.define("demo-more-info", DemoMoreInfo);
