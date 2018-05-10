import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-item/paper-item-body.js';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '../../../src/util/hass-mixins.js';
import '../../../src/resources/ha-style.js';
import '../../../src/layouts/hass-subpage.js';
import '../ha-config-section.js';
import './ha-config-flow.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
{
  /*
   * @appliesMixin window.hassMixins.LocalizeMixin
   * @appliesMixin window.hassMixins.EventsMixin
   */
  class HaConfigManager extends
    window.hassMixins.LocalizeMixin(window.hassMixins.EventsMixin(PolymerElement)) {
    static get template() {
      return html`
    <style include="iron-flex ha-style">
      paper-button {
        color: var(--primary-color);
        font-weight: 500;
        top: 3px;
        margin-right: -.57em;
      }
      paper-card:last-child {
        margin-top: 12px;
      }
      .config-entry-row {
        display: flex;
        padding: 0 16px;
      }
    </style>

    <hass-subpage header="Integrations">
      <template is="dom-if" if="[[_progress.length]]">
        <ha-config-section is-wide="[[isWide]]">
          <span slot="header">In Progress</span>
          <paper-card>
            <template is="dom-repeat" items="[[_progress]]">
              <div class="config-entry-row">
                <paper-item-body>
                  [[_computeIntegrationTitle(localize, item.handler)]]
                </paper-item-body>
                <paper-button on-click="_continueFlow">Configure</paper-button>
              </div>
            </template>
          </paper-card>
        </ha-config-section>
      </template>

      <ha-config-section is-wide="[[isWide]]">
        <span slot="header">Configured</span>
        <paper-card>
          <template is="dom-if" if="[[!_entries.length]]">
            <div class="config-entry-row">
              <paper-item-body>
                Nothing configured yet
              </paper-item-body>
            </div>
          </template>
          <template is="dom-repeat" items="[[_entries]]">
            <div class="config-entry-row">
              <paper-item-body three-line="">
                [[item.title]]
                <div secondary="">Integration: [[_computeIntegrationTitle(localize, item.domain)]]</div>
                <div secondary="">Added by: [[item.source]]</div>
                <div secondary="">State: [[item.state]]</div>
              </paper-item-body>
              <paper-button on-click="_removeEntry">Remove</paper-button>
            </div>
          </template>
        </paper-card>
      </ha-config-section>

      <ha-config-section is-wide="[[isWide]]">
        <span slot="header">Available</span>
        <paper-card>
          <template is="dom-repeat" items="[[_handlers]]">
            <div class="config-entry-row">
              <paper-item-body>
                [[_computeIntegrationTitle(localize, item)]]
              </paper-item-body>
              <paper-button on-click="_createFlow">Configure</paper-button>
            </div>
          </template>
        </paper-card>
      </ha-config-section>
    </hass-subpage>

    <ha-config-flow hass="[[hass]]" flow-id="[[_flowId]]" step="{{_flowStep}}" on-flow-closed="_flowClose"></ha-config-flow>
`;
    }

    static get is() { return 'ha-config-entries'; }

    static get properties() {
      return {
        hass: Object,
        isWide: Boolean,

        _flowId: {
          type: String,
          value: null,
        },
        /*
         * The step of the current selected flow, if available.
         */
        _flowStep: Object,

        /**
         * Existing entries.
         */
        _entries: Array,

        /**
         * Current flows that are in progress and have not been started by a user.
         * For example, can be discovered devices that require more config.
         */
        _progress: Array,

        _handlers: Array,
      };
    }

    ready() {
      super.ready();
      this._loadData();
    }

    _createFlow(ev) {
      this.hass.callApi('post', 'config/config_entries/flow', { handler: ev.model.item })
        .then((flow) => {
          this._userCreatedFlow = true;
          this.setProperties({
            _flowStep: flow,
            _flowId: flow.flow_id,
          });
        });
    }

    _continueFlow(ev) {
      this._userCreatedFlow = false;
      this.setProperties({
        _flowId: ev.model.item.flow_id,
        _flowStep: null,
      });
    }

    _removeEntry(ev) {
      if (!confirm('Are you sure you want to delete this integration?')) return;

      const entryId = ev.model.item.entry_id;

      this.hass.callApi('delete', `config/config_entries/entry/${entryId}`)
        .then((result) => {
          this._entries = this._entries.filter(entry => entry.entry_id !== entryId);
          if (result.require_restart) {
            alert('Restart Home Assistant to finish removing this integration');
          }
        });
    }

    _flowClose(ev) {
      // Was the flow completed?
      if (ev.detail.flowFinished) {
        this._loadData();

      // Remove a flow if it was not finished and was started by the user
      } else if (this._userCreatedFlow) {
        this.hass.callApi('delete', `config/config_entries/flow/${this._flowId}`);
      }

      this._flowId = null;
    }

    _loadData() {
      this._loadEntries();
      this._loadDiscovery();
      this.hass.callApi('get', 'config/config_entries/flow_handlers')
        .then((handlers) => { this._handlers = handlers; });
    }

    _loadEntries() {
      this.hass.callApi('get', 'config/config_entries/entry')
        .then((entries) => { this._entries = entries; });
    }

    _loadDiscovery() {
      this.hass.callApi('get', 'config/config_entries/flow')
        .then((progress) => { this._progress = progress; });
    }

    _computeIntegrationTitle(localize, integration) {
      return localize(`component.${integration}.config.title`);
    }
  }

  customElements.define(HaConfigManager.is, HaConfigManager);
}
