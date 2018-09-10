import '@polymer/app-layout/app-header/app-header.js';
import '@polymer/app-layout/app-toolbar/app-toolbar.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../layouts/hass-subpage.js';
import '../../../resources/ha-style.js';

import './ha-config-section-core.js';

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

    <hass-subpage header="[[localize('ui.panel.config.core.caption')]]">
      <div class$="[[computeClasses(isWide)]]">
        <ha-config-section-core is-wide="[[isWide]]" hass="[[hass]]"></ha-config-section-core>
      </div>
    </hass-subpage>
`;
  }

  static get properties() {
    return {
      hass: Object,
      isWide: Boolean,
    };
  }

  computeClasses(isWide) {
    return isWide ? 'content' : 'content narrow';
  }
}

customElements.define('ha-config-core', HaConfigCore);
