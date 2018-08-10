import { clearState } from '../../util/ha-pref-storage.js';

export default superClass => class extends superClass {
  ready() {
    super.ready();
    this.addEventListener('hass-logout', () => this._handleLogout());
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
