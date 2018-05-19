import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import config from '../../../hassio/config.js';
import EventsMixin from '../../mixins/events-mixin.js';
import NavigateMixin from '../../mixins/navigate-mixin.js';

/*
 * Mixins are used by ifram to communicate with main frontend.
 * @appliesMixin EventsMixin
 * @appliesMixin NavigateMixin
 */
class HaPanelHassio extends NavigateMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
    <style>
      iframe {
        border: 0;
        width: 100%;
        height: 100%;
        display: block;
      }
    </style>
    <iframe
      id='iframe'
      src="[[iframeUrl]]"
    ></iframe>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      narrow: Boolean,
      showMenu: Boolean,
      route: Object,

      iframeUrl: {
        type: String,
        value: __DEV__ ?
          '/home-assistant-polymer/hassio/build-es5/index.html' : `${config.publicPath}/index.html`,
      }
    };
  }

  static get observers() {
    return [
      '_dataChanged(hass, narrow, showMenu, route)'
    ];
  }

  ready() {
    super.ready();
    // Make it available for the iframe to interact
    window.hassioPanel = this;
  }

  _dataChanged(hass, narrow, showMenu, route) {
    this._updateProperties({ hass, narrow, showMenu, route });
  }

  _updateProperties(data) {
    const setProperties = this.$.iframe.contentWindow && this.$.iframe.contentWindow.setProperties;

    // Delay calling setProperties until iframe loaded
    if (!setProperties) {
      // Check if we already have a setTimeout scheduled
      const needTimeout = !this._dataToSet;
      this._dataToSet = data;

      if (needTimeout) {
        setTimeout(() => {
          const dataToSet = this._dataToSet;
          this._dataToSet = null;
          this._updateProperties(dataToSet);
        }, 100);
      }
      return;
    }

    setProperties(data);
  }
}

customElements.define('ha-panel-hassio', HaPanelHassio);
