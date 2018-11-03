import "@polymer/app-route/app-route";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { Debouncer } from "@polymer/polymer/lib/utils/debounce";
import { timeOut } from "@polymer/polymer/lib/utils/async";

import "./ha-config-entries-dashboard";
import "./ha-config-entry-page";
import NavigateMixin from "../../../mixins/navigate-mixin";
import compare from "../../../common/string/compare";

class HaConfigEntries extends NavigateMixin(PolymerElement) {
  static get template() {
    return html`
  <app-route route="[[route]]" pattern="/integrations/:page" data="{{_routeData}}" tail="{{_routeTail}}"></app-route>

  <template is='dom-if' if='[[_configEntry]]'>
    <ha-config-entry-page
      hass='[[hass]]'
      config-entry='[[_configEntry]]'
      entries='[[_entries]]'
      entities='[[_entities]]'
      devices='[[_devices]]'
      narrow='[[narrow]]'
    ></ha-config-entry-page>
  </template>
  <template is='dom-if' if='[[!_configEntry]]'>
    <ha-config-entries-dashboard
      hass='[[hass]]'
      entries='[[_entries]]'
      entities='[[_entities]]'
      handlers='[[_handlers]]'
      progress='[[_progress]]'
    ></ha-config-entries-dashboard>
  </template>
`;
  }

  static get properties() {
    return {
      hass: Object,
      isWide: Boolean,
      narrow: Boolean,
      route: Object,

      _configEntry: {
        type: Object,
        computed: "_computeConfigEntry(_routeData, _entries)",
      },

      /**
       * Existing entries.
       */
      _entries: Array,

      /**
       * Entity Registry entries.
       */
      _entities: Array,

      /**
       * Device Registry entries.
       */
      _devices: Array,

      /**
       * Current flows that are in progress and have not been started by a user.
       * For example, can be discovered devices that require more config.
       */
      _progress: Array,

      _handlers: Array,

      _routeData: Object,
      _routeTail: Object,
    };
  }

  ready() {
    super.ready();
    this._loadData();
    this.addEventListener("hass-reload-entries", () => this._loadData());
  }

  connectedCallback() {
    super.connectedCallback();

    this.hass.connection
      .subscribeEvents(() => {
        this._debouncer = Debouncer.debounce(
          this._debouncer,
          timeOut.after(500),
          () => this._loadData()
        );
      }, "config_entry_discovered")
      .then((unsub) => {
        this._unsubEvents = unsub;
      });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubEvents) this._unsubEvents();
  }

  _loadData() {
    this.hass.callApi("get", "config/config_entries/entry").then((entries) => {
      this._entries = entries.sort((conf1, conf2) =>
        compare(conf1.title, conf2.title)
      );
    });

    this.hass.callApi("get", "config/config_entries/flow").then((progress) => {
      this._progress = progress;
    });

    this.hass
      .callApi("get", "config/config_entries/flow_handlers")
      .then((handlers) => {
        this._handlers = handlers;
      });

    this.hass
      .callWS({ type: "config/entity_registry/list" })
      .then((entities) => {
        this._entities = entities;
      });

    this.hass
      .callWS({ type: "config/device_registry/list" })
      .then((devices) => {
        this._devices = devices;
      });
  }

  _computeConfigEntry(routeData, entries) {
    return (
      !!entries &&
      !!routeData &&
      entries.find((ent) => ent.entry_id === routeData.page)
    );
  }
}

customElements.define("ha-config-entries", HaConfigEntries);
