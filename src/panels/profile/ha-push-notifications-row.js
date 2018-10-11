import "@polymer/iron-flex-layout/iron-flex-layout-classes.js";
import "@polymer/iron-label/iron-label.js";
import "@polymer/paper-card/paper-card.js";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import isComponentLoaded from "../../common/config/is_component_loaded.js";
import { pushSupported } from "../../components/ha-push-notifications-toggle.js";

import LocalizeMixin from "../../mixins/localize-mixin.js";

import "./ha-settings-row.js";

/*
 * @appliesMixin LocalizeMixin
 */
class HaPushNotificationsRow extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
    <style>
      a { color: var(--primary-color); }
    </style>
    <ha-settings-row narrow='[[narrow]]'>
      <span slot='heading'>[[localize('ui.panel.profile.push_notifications.header')]]</span>
      <span
        slot='description'
      >
        [[_description(_platformLoaded, _pushSupported)]]
        <a
          href='https://www.home-assistant.io/components/notify.html5/'
          target='_blank'>[[localize('ui.panel.profile.push_notifications.link_promo')]]</a>
      </span>
      <ha-push-notifications-toggle
        hass="[[hass]]"
        disabled='[[_error]]'
      ></ha-push-notifications-toggle>
    </ha-settings-row>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      narrow: Boolean,
      _platformLoaded: {
        type: Boolean,
        computed: "_compPlatformLoaded(hass)",
      },
      _pushSupported: {
        type: Boolean,
        value: pushSupported,
      },
      _error: {
        type: Boolean,
        computed: "_compError(_platformLoaded, _pushSupported)",
      },
    };
  }

  _compPlatformLoaded(hass) {
    return isComponentLoaded(hass, "notify.html5");
  }

  _compError(platformLoaded, pushSupported_) {
    return !platformLoaded || !pushSupported_;
  }

  _description(platformLoaded, pushSupported_) {
    let key;
    if (!pushSupported_) {
      key = "error_use_https";
    } else if (!platformLoaded) {
      key = "error_load_platform";
    } else {
      key = "description";
    }
    return this.localize(`ui.panel.profile.push_notifications.${key}`);
  }
}

customElements.define("ha-push-notifications-row", HaPushNotificationsRow);
