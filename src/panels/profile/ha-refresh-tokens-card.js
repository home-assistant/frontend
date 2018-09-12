import '@polymer/paper-icon-button/paper-icon-button.js';

import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import EventsMixin from '../../mixins/events-mixin.js';
import LocalizeMixin from '../../mixins/localize-mixin.js';
import formatDateTime from '../../common/datetime/format_date_time.js';

import './ha-settings-row.js';

/*
 * @appliesMixin EventsMixin
 * @appliesMixin LocalizeMixin
 */
class HaRefreshTokens extends LocalizeMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
    <style>
      paper-card {
        display: block;
      }
      paper-icon-button {
        color: var(--primary-text-color);
      }
      paper-icon-button[disabled] {
        color: var(--disabled-text-color);
      }
    </style>
    <paper-card heading="[[localize('ui.panel.profile.refresh_tokens.header')]]">
      <div class="card-content">[[localize('ui.panel.profile.refresh_tokens.description')]]</div>
      <template is='dom-repeat' items='[[_computeTokens(refreshTokens)]]'>
        <ha-settings-row>
          <span slot='heading'>[[_formatTitle(item.client_id)]]</span>
          <span slot='description'>[[_formatCreatedAt(item.created_at)]]</span>
          <paper-icon-button icon="hass:delete" on-click='_handleDelete' disabled="[[item.is_current]]"></paper-icon-button>
        </ha-settings-row>
      </template>
    </paper-card>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      refreshTokens: Array,
    };
  }

  _computeTokens(refreshTokens) {
    return refreshTokens.filter(tkn => tkn.type === 'normal').reverse();
  }

  _formatTitle(clientId) {
    return this.localize(
      'ui.panel.profile.refresh_tokens.token_title',
      'clientId', clientId
    );
  }

  _formatCreatedAt(created) {
    return this.localize(
      'ui.panel.profile.refresh_tokens.created_at',
      'date', formatDateTime(new Date(created))
    );
  }

  async _handleDelete(ev) {
    if (!confirm(this.localize('ui.panel.profile.refresh_tokens.confirm_delete', 'name', ev.model.item.client_id))) {
      return;
    }
    try {
      await this.hass.callWS({
        type: 'auth/delete_refresh_token',
        refresh_token_id: ev.model.item.id,
      });
      this.fire('hass-refresh-tokens');
    } catch (err) {
      // eslint-disable-next-line
      console.error(err);
      alert(this.localize('ui.panel.profile.refresh_tokens.delete_failed'));
    }
  }
}

customElements.define('ha-refresh-tokens-card', HaRefreshTokens);
