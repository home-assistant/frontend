import { afterNextRender } from '@polymer/polymer/lib/utils/render-status.js';
import { clearState } from '../../util/ha-pref-storage.js';
import { askWrite } from '../../common/auth/token_storage.js';
import { subscribeUser } from '../../data/ws-user.js';
import { getUser } from 'home-assistant-js-websocket';

export default superClass => class extends superClass {
  ready() {
    super.ready();
    this.addEventListener('hass-logout', () => this._handleLogout());
    // HACK :( We don't have a way yet to trigger an update of `subscribeUser`
    this.addEventListener('hass-refresh-current-user', () =>
      getUser(this.hass.connection).then(user => this._updateHass({ user })));

    afterNextRender(null, () => {
      if (askWrite()) {
        const el = document.createElement('ha-store-auth-card');
        this.shadowRoot.appendChild(el);
        this.provideHass(el);
        import(/* webpackChunkName: "ha-store-auth-card" */ '../../dialogs/ha-store-auth-card.js');
      }
    });
  }

  hassConnected() {
    super.hassConnected();
    subscribeUser(this.hass.connection, user => this._updateHass({ user }));
  }

  _handleLogout() {
    this.hass.connection.close();
    clearState();
    document.location.href = '/';
  }
};
