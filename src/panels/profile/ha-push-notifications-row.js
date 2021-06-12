import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { pushSupported } from "../../components/ha-push-notifications-toggle";
import "../../components/ha-settings-row";
import LocalizeMixin from "../../mixins/localize-mixin";
import { documentationUrl } from "../../util/documentation-url";

/*
 * @appliesMixin LocalizeMixin
 */
class HaPushNotificationsRow extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style>
        a {
          color: var(--primary-color);
        }
      </style>
      <ha-settings-row narrow="[[narrow]]">
        <span slot="heading"
          >[[localize('ui.panel.profile.push_notifications.header')]]</span
        >
        <span slot="description">
          [[localize(_descrLocalizeKey)]]
          <a
            href="[[_computeDocumentationUrl(hass)]]"
            target="_blank"
            rel="noreferrer"
            >[[localize('ui.panel.profile.push_notifications.link_promo')]]</a
          >
        </span>
        <ha-push-notifications-toggle
          hass="[[hass]]"
          disabled="[[_error]]"
        ></ha-push-notifications-toggle>
      </ha-settings-row>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      narrow: Boolean,
      _descrLocalizeKey: {
        type: String,
        computed: "_descriptionKey(_platformLoaded, _pushSupported)",
      },
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

  _computeDocumentationUrl(hass) {
    return documentationUrl(hass, "/integrations/html5");
  }

  _compPlatformLoaded(hass) {
    return isComponentLoaded(hass, "notify.html5");
  }

  _compError(platformLoaded, pushSupported_) {
    return !platformLoaded || !pushSupported_;
  }

  _descriptionKey(platformLoaded, pushSupported_) {
    let key;
    if (!pushSupported_) {
      key = "error_use_https";
    } else if (!platformLoaded) {
      key = "error_load_platform";
    } else {
      key = "description";
    }
    return `ui.panel.profile.push_notifications.${key}`;
  }
}

customElements.define("ha-push-notifications-row", HaPushNotificationsRow);
