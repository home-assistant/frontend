import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/iron-label/iron-label.js';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '../../../src/util/hass-mixins.js';
import '../ha-config-section.js';
import '../../../src/components/ha-push-notifications-toggle.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
/*
 * @appliesMixin window.hassMixins.LocalizeMixin
 */
class HaConfigSectionPushNotifications extends window.hassMixins.LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="iron-flex iron-flex-alignment iron-positioning">
      ha-push-notifications-toggle {
        margin-left: 16px;
      }
    </style>
    <ha-config-section is-wide="[[isWide]]">
      <span slot="header">[[localize('ui.panel.config.core.section.push_notifications.header')]]</span>
      <span slot="introduction">
        [[localize('ui.panel.config.core.section.push_notifications.introduction')]]
      </span>

      <paper-card>
        <div class="card-content">
          <iron-label class="horizontal layout">            
            [[localize('ui.panel.config.core.section.push_notifications.push_notifications')]]
            <ha-push-notifications-toggle hass="[[hass]]" push-supported="{{pushSupported}}"></ha-push-notifications-toggle>
          </iron-label>
        </div>
      </paper-card>
    </ha-config-section>
`;
  }

  static get is() { return 'ha-config-section-push-notifications'; }

  static get properties() {
    return {
      hass: Object,
      isWide: Boolean,
      pushSupported: {
        type: Boolean,
        notify: true,
      },
    };
  }
}

customElements.define(HaConfigSectionPushNotifications.is, HaConfigSectionPushNotifications);
