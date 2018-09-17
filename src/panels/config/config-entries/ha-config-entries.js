import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '@polymer/paper-tooltip/paper-tooltip.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-item/paper-item-body.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js';
import { timeOut } from '@polymer/polymer/lib/utils/async.js';

import '../../../components/entity/ha-state-icon.js';
import '../../../layouts/hass-subpage.js';
import '../../../resources/ha-style.js';

import '../ha-config-section.js';
import EventsMixin from '../../../mixins/events-mixin.js';
import LocalizeMixin from '../../../mixins/localize-mixin.js';
import computeStateName from '../../../common/entity/compute_state_name.js';

let registeredDialog = false;

/*
 * @appliesMixin LocalizeMixin
 * @appliesMixin EventsMixin
 */
class HaConfigManager extends
  LocalizeMixin(EventsMixin(PolymerElement)) {
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
      <ha-config-section>
        <span slot="header">Discovered</span>
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

    <ha-config-section>
      <span slot="header">Configured</span>
      <paper-card>
        <template is="dom-if" if="[[!_entries.length]]">
          <div class="config-entry-row">
            <paper-item-body two-line>
              <div>Nothing configured yet</div>
            </paper-item-body>
          </div>
        </template>
        <template is="dom-repeat" items="[[_entries]]">
          <div class="config-entry-row">
            <paper-item-body three-line>
              <div>[[_computeIntegrationTitle(localize, item.domain)]]: [[item.title]]</div>
              <div secondary>[[item.state]] – added by [[item.source]]</div>
              <div secondary>
                <template is='dom-repeat' items='[[_computeConfigEntryEntities(hass, item, _entities)]]'>
                  <span>
                    <ha-state-icon state-obj='[[item]]'></ha-state-icon>
                    <paper-tooltip position="bottom">[[_computeStateName(item)]]</paper-tooltip>
                  </span>
                </template>
              </div>
            </paper-item-body>
            <paper-button on-click="_removeEntry">Remove</paper-button>
          </div>
        </template>
      </paper-card>
    </ha-config-section>

    <ha-config-section>
      <span slot="header">Set up a new integration</span>
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
`;
  }

  static get properties() {
    return {
      hass: Object,
      isWide: Boolean,

      /**
       * Existing entries.
       */
      _entries: Array,

      /**
       * Entity Registry entries.
       */
      _entities: Array,

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

  connectedCallback() {
    super.connectedCallback();

    if (!registeredDialog) {
      registeredDialog = true;
      this.fire('register-dialog', {
        dialogShowEvent: 'show-config-flow',
        dialogTag: 'ha-config-flow',
        dialogImport: () => import('./ha-config-flow.js'),
      });
    }

    this.hass.connection.subscribeEvents(() => {
      this._debouncer = Debouncer.debounce(
        this._debouncer,
        timeOut.after(500),
        () => this._loadData()
      );
    }, 'config_entry_discovered').then((unsub) => { this._unsubEvents = unsub; });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubEvents) this._unsubEvents();
  }

  _createFlow(ev) {
    this.fire('show-config-flow', {
      hass: this.hass,
      newFlowForHandler: ev.model.item,
      dialogClosedCallback: () => this._loadData(),
    });
  }

  _continueFlow(ev) {
    this.fire('show-config-flow', {
      hass: this.hass,
      continueFlowId: ev.model.item.flow_id,
      dialogClosedCallback: () => this._loadData(),
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

  _loadData() {
    this.hass.callApi('get', 'config/config_entries/entry')
      .then((entries) => { this._entries = entries; });

    this.hass.callApi('get', 'config/config_entries/flow')
      .then((progress) => { this._progress = progress; });

    this.hass.callApi('get', 'config/config_entries/flow_handlers')
      .then((handlers) => { this._handlers = handlers; });

    this.hass.callWS({ type: 'config/entity_registry/list' })
      .then((entities) => { this._entities = entities; });
  }

  _computeIntegrationTitle(localize, integration) {
    return localize(`component.${integration}.config.title`);
  }

  _computeConfigEntryEntities(hass, configEntry, entities) {
    if (!entities) {
      return [];
    }
    const states = [];
    entities.forEach((entity) => {
      if (entity.config_entry_id === configEntry.entry_id && entity.entity_id in hass.states) {
        states.push(hass.states[entity.entity_id]);
      }
    });
    return states;
  }

  _computeStateName(stateObj) {
    return computeStateName(stateObj);
  }
}

customElements.define('ha-config-entries', HaConfigManager);
