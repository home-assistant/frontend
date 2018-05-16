import '@polymer/app-layout/app-header/app-header.js';
import '@polymer/app-layout/app-toolbar/app-toolbar.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../layouts/ha-app-layout.js';
import '../../../resources/ha-style.js';

import './ha-config-section-core.js';
import './ha-config-section-push-notifications.js';
import './ha-config-section-themes.js';
import './ha-config-section-translation.js';

import isComponentLoaded from '../../../common/config/is_component_loaded.js';
import LocalizeMixin from '../../../mixins/localize-mixin.js';

/*
 * @appliesMixin LocalizeMixin
 */
class HaConfigCore extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="iron-flex ha-style">
      .content {
        padding-bottom: 32px;
      }

      .border {
        margin: 32px auto 0;
        border-bottom: 1px solid rgba(0, 0, 0, 0.12);
        max-width: 1040px;
      }

      .narrow .border {
        max-width: 640px;
      }
    </style>

    <ha-app-layout has-scrolling-region="">
      <app-header slot="header" fixed="">
        <app-toolbar>
          <paper-icon-button icon="mdi:arrow-left" on-click="_backTapped"></paper-icon-button>
          <div main-title="">[[localize('ui.panel.config.core.caption')]]</div>
        </app-toolbar>
      </app-header>

      <div class\$="[[computeClasses(isWide)]]">
        <ha-config-section-core is-wide="[[isWide]]" hass="[[hass]]"></ha-config-section-core>

        <template is="dom-if" if="[[pushSupported]]">
          <div class="border"></div>
          <ha-config-section-push-notifications is-wide="[[isWide]]" hass="[[hass]]" push-supported="{{pushSupported}}"></ha-config-section-push-notifications>
        </template>
        <template is="dom-if" if="[[computeIsTranslationLoaded(hass)]]">
          <div class="border"></div>
          <ha-config-section-translation is-wide="[[isWide]]" hass="[[hass]]"></ha-config-section-translation>
        </template>

        <template is="dom-if" if="[[computeIsThemesLoaded(hass)]]">
          <div class="border"></div>
          <ha-config-section-themes is-wide="[[isWide]]" hass="[[hass]]"></ha-config-section-themes>
        </template>

      </div>
    </ha-app-layout>
`;
  }

  static get properties() {
    return {
      hass: Object,
      isWide: Boolean,
      pushSupported: {
        type: Boolean,
        value: true,
      },
    };
  }

  computeClasses(isWide) {
    return isWide ? 'content' : 'content narrow';
  }

  computeIsZwaveLoaded(hass) {
    return isComponentLoaded(hass, 'config.zwave');
  }

  computeIsTranslationLoaded(hass) {
    return hass.translationMetadata &&
      Object.keys(hass.translationMetadata.translations).length;
  }

  computeIsThemesLoaded(hass) {
    return hass.themes && hass.themes.themes &&
      Object.keys(hass.themes.themes).length;
  }

  _backTapped() {
    history.back();
  }
}

customElements.define('ha-config-core', HaConfigCore);
