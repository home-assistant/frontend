import { afterNextRender } from '@polymer/polymer/lib/utils/render-status.js';
import { clearState } from '../../util/ha-pref-storage.js';
import { askWrite } from '../../common/auth/token_storage.js';

export default superClass => class extends superClass {
  ready() {
    super.ready();
    this.addEventListener('hass-logout', () => this._handleLogout());

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

    // only for new auth
    if (this.hass.connection.options.accessToken) {
      this.hass.callWS({
        type: 'auth/current_user',
      }).then(user => this._updateHass({ user }), () => {});
    }
  }

  _handleLogout() {
    this.hass.connection.close();
    clearState();
    document.location.href = '/';
  }
};
