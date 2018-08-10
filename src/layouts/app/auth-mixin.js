export default superClass => class extends superClass {
  hassConnected() {
    super.hassConnected();

    // only for new auth
    if (this.hass.connection.options.accessToken) {
      this.hass.callWS({
        type: 'auth/current_user',
      }).then(user => this._updateHass({ user }), () => {});
    }
  }
};
