import 'web-animations-js/web-animations-next-lite.min.js';

import '@polymer/app-route/app-location.js';
import '@polymer/app-route/app-route.js';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '@polymer/paper-styles/typography.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { setPassiveTouchGestures } from '@polymer/polymer/lib/utils/settings.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import translationMetadata from '../../build-translations/translationMetadata.json';
import '../layouts/home-assistant-main.js';
import '../layouts/login-form.js';
import '../managers/notification-manager.js';
import '../resources/ha-style.js';
import '../resources/html-import/polyfill.js';
import '../util/ha-pref-storage.js';
import '../util/hass-call-api.js';
import '../util/hass-translation.js';
import '../util/legacy-support';
import '../util/roboto.js';
// For mdi icons.
import '../components/ha-iconset-svg.js';

import computeStateName from '../common/entity/compute_state_name.js';
import applyThemesOnElement from '../common/dom/apply_themes_on_element.js';

setPassiveTouchGestures(true);
/* LastPass createElement workaround. See #428 */
document.createElement = Document.prototype.createElement;
/* polyfill for paper-dropdown */
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
window.removeInitMsg = function () {
  var initMsg = document.getElementById('ha-init-skeleton');
  if (initMsg) {
    initMsg.parentElement.removeChild(initMsg);
  }
};

class HomeAssistant extends PolymerElement {
  static get template() {
    return html`
    <ha-pref-storage hass="[[hass]]" id="storage"></ha-pref-storage>
    <notification-manager id="notifications" hass="[[hass]]"></notification-manager>
    <app-location route="{{route}}"></app-location>
    <app-route route="{{route}}" pattern="/:panel" data="{{routeData}}"></app-route>
    <template is="dom-if" if="[[showMain]]" restamp="">
      <home-assistant-main on-hass-more-info="handleMoreInfo" on-hass-dock-sidebar="handleDockSidebar" on-hass-notification="handleNotification" on-hass-logout="handleLogout" hass="[[hass]]" route="{{route}}"></home-assistant-main>
    </template>

    <template is="dom-if" if="[[!showMain]]" restamp="">
      <login-form hass="[[hass]]" connection-promise="{{connectionPromise}}" show-loading="[[computeShowLoading(connectionPromise, hass)]]">
      </login-form>
    </template>
`;
  }

  static get properties() {
    return {
      connectionPromise: {
        type: Object,
        value: window.hassConnection || null,
        observer: 'handleConnectionPromise',
      },
      connection: {
        type: Object,
        value: null,
        observer: 'connectionChanged',
      },
      hass: {
        type: Object,
        value: null,
      },
      showMain: {
        type: Boolean,
        computed: 'computeShowMain(hass)',
      },
      route: Object,
      routeData: Object,
      panelUrl: {
        type: String,
        computed: 'computePanelUrl(routeData)',
        observer: 'panelUrlChanged',
      },
    };
  }

  ready() {
    super.ready();
    this.addEventListener('settheme', e => this.setTheme(e));
    this.addEventListener('hass-language-select', e => this.selectLanguage(e));
    this.loadResources();
  }

  computeShowMain(hass) {
    return hass && hass.states && hass.config;
  }

  computeShowLoading(connectionPromise, hass) {
    // Show loading when connecting or when connected but not all pieces loaded yet
    return (connectionPromise != null
      || (hass && hass.connection && (!hass.states || !hass.config)));
  }

  loadResources(fragment) {
    window.getTranslation(fragment).then((result) => {
      this._updateResources(result.language, result.data);
    });
  }

  loadBackendTranslations() {
    if (!this.hass.language) return;

    const language = this.hass.selectedLanguage || this.hass.language;
    this.hass.callApi('get', `translations/${language}`).then((result) => {
      // If we've switched selected languages just ignore this response
      if ((this.hass.selectedLanguage || this.hass.language) !== language) return;

      this._updateResources(language, result.resources);
    });
  }

  _updateResources(language, data) {
    // Update the language in hass, and update the resources with the newly
    // loaded resources. This merges the new data on top of the old data for
    // this language, so that the full translation set can be loaded across
    // multiple fragments.
    this._updateHass({
      language: language,
      resources: {
        [language]: Object.assign({}, this.hass
          && this.hass.resources && this.hass.resources[language], data),
      },
    });
  }

  connectionChanged(conn, oldConn) {
    if (oldConn) {
      this.unsubConnection();
      this.unsubConnection = null;
    }
    if (!conn) {
      this._updateHass({
        connection: null,
        connected: false,
        states: null,
        config: null,
        themes: null,
        dockedSidebar: false,
        moreInfoEntityId: null,
        callService: null,
        callApi: null,
      });
      return;
    }
    var notifications = this.$.notifications;
    this.hass = Object.assign({
      connection: conn,
      connected: true,
      states: null,
      config: null,
      themes: null,
      panelUrl: this.panelUrl,

      language: window.getActiveTranslation(),
      // If resources are already loaded, don't discard them
      resources: (this.hass && this.hass.resources) || null,

      translationMetadata: translationMetadata,
      dockedSidebar: false,
      moreInfoEntityId: null,
      callService: (domain, service, serviceData) =>
        conn.callService(domain, service, serviceData || {})
          .then(
            () => {
              var message;
              var name;
              if (serviceData.entity_id && this.hass.states &&
                this.hass.states[serviceData.entity_id]) {
                name = computeStateName(this.hass.states[serviceData.entity_id]);
              }
              if (service === 'turn_on' && serviceData.entity_id) {
                message = 'Turned on ' + (name || serviceData.entity_id) + '.';
              } else if (service === 'turn_off' && serviceData.entity_id) {
                message = 'Turned off ' + (name || serviceData.entity_id) + '.';
              } else {
                message = 'Service ' + domain + '/' + service + ' called.';
              }
              notifications.showNotification(message);
            },
            function () {
              notifications.showNotification('Failed to call service ' + domain + '/' + service);
              return Promise.reject();
            }
          ),
      callApi: (method, path, parameters) => {
        const host = window.location.protocol + '//' + window.location.host;
        const auth = conn.options;
        return window.hassCallApi(host, auth, method, path, parameters).catch((err) => {
          if (err.status_code !== 401 || !auth.accessToken) throw err;

          // If we connect with access token and get 401, refresh token and try again
          return window.refreshToken().then((accessToken) => {
            conn.options.accessToken = accessToken;
            return window.hassCallApi(host, auth, method, path, parameters);
          });
        });
      },
    }, this.$.storage.getStoredState());

    var reconnected = () => {
      this._updateHass({ connected: true });
      this.loadBackendTranslations();
    };

    const disconnected = () => {
      this._updateHass({ connected: false });
    };

    conn.addEventListener('ready', reconnected);

    // If we reconnect after losing connection and access token is no longer
    // valid.
    conn.addEventListener('reconnect-error', (_conn, err) => {
      if (err !== window.HAWS.ERR_INVALID_AUTH) return;
      disconnected();
      this.unsubConnection();
      window.refreshToken().then(accessToken =>
        this.handleConnectionPromise(window.createHassConnection(null, accessToken)));
    });
    conn.addEventListener('disconnected', disconnected);

    var unsubEntities;

    window.HAWS.subscribeEntities(conn, (states) => {
      this._updateHass({ states: states });
    }).then(function (unsub) {
      unsubEntities = unsub;
    });

    var unsubConfig;

    window.HAWS.subscribeConfig(conn, (config) => {
      this._updateHass({ config: config });
    }).then(function (unsub) {
      unsubConfig = unsub;
    });

    var unsubThemes;

    this.hass.callApi('get', 'themes').then((themes) => {
      this._updateHass({ themes: themes });
      applyThemesOnElement(
        document.documentElement,
        themes,
        this.hass.selectedTheme,
        true
      );
    });
    conn.subscribeEvents((event) => {
      this._updateHass({ themes: event.data });
      applyThemesOnElement(
        document.documentElement,
        event.data,
        this.hass.selectedTheme,
        true
      );
    }, 'themes_updated').then(function (unsub) {
      unsubThemes = unsub;
    });

    this.loadBackendTranslations();

    this.unsubConnection = function () {
      conn.removeEventListener('ready', reconnected);
      conn.removeEventListener('disconnected', disconnected);
      unsubEntities();
      unsubConfig();
      unsubThemes();
    };
  }

  computePanelUrl(routeData) {
    return (routeData && routeData.panel) || 'states';
  }

  panelUrlChanged(newPanelUrl) {
    this._updateHass({ panelUrl: newPanelUrl });
    this.loadTranslationFragment(newPanelUrl);
  }

  handleConnectionPromise(prom) {
    if (!prom) return;

    prom.then((conn) => {
      this.connection = conn;
    }, () => {
      this.connectionPromise = null;
    });
  }

  handleMoreInfo(ev) {
    ev.stopPropagation();

    this._updateHass({ moreInfoEntityId: ev.detail.entityId });
  }

  handleDockSidebar(ev) {
    ev.stopPropagation();
    this._updateHass({ dockedSidebar: ev.detail.dock });
    this.$.storage.storeState();
  }

  handleNotification(ev) {
    this.$.notifications.showNotification(ev.detail.message);
  }

  handleLogout() {
    this.connection.close();
    localStorage.clear();
    document.location = '/';
  }

  setTheme(event) {
    this._updateHass({ selectedTheme: event.detail });
    applyThemesOnElement(
      document.documentElement,
      this.hass.themes,
      this.hass.selectedTheme,
      true
    );
    this.$.storage.storeState();
  }

  selectLanguage(event) {
    this._updateHass({ selectedLanguage: event.detail.language });
    this.$.storage.storeState();
    this.loadResources();
    this.loadBackendTranslations();
    this.loadTranslationFragment(this.panelUrl);
  }

  loadTranslationFragment(panelUrl) {
    if (translationMetadata.fragments.includes(panelUrl)) {
      this.loadResources(panelUrl);
    }
  }

  _updateHass(obj) {
    this.hass = Object.assign({}, this.hass, obj);
  }
}

customElements.define('home-assistant', HomeAssistant);
