import '@polymer/iron-icon/iron-icon.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-item/paper-item-body.js';
import '@polymer/paper-item/paper-item.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import LocalizeMixin from '../../../mixins/localize-mixin.js';

/*
 * @appliesMixin LocalizeMixin
 */
class HaConfigUsersMenu extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="iron-flex">
      paper-card {
        display: block;
      }
      a {
        color: var(--primary-text-color);
      }
    </style>
    <paper-card>
      <a href='/config/users'>
        <paper-item>
          <paper-item-body two-line>
            [[localize('ui.panel.config.users.caption')]]
            <div secondary>
              [[localize('ui.panel.config.users.description')]]
            </div>
          </paper-item-body>
          <iron-icon icon="hass:chevron-right"></iron-icon>
        </paper-item>
      </a>
    </paper-card>
`;
  }

  static get properties() {
    return {
      hass: Object,
    };
  }
}

customElements.define('ha-config-users-menu', HaConfigUsersMenu);
