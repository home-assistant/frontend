/* eslint-disable no-unused-vars */
// Exists so all methods can safely call super method
export default superClass => class extends superClass {
  hassConnected() {}
  hassReconnected() {}
  panelUrlChanged(newPanelUrl) {}

  _updateHass(obj) {
    this.hass = Object.assign({}, this.hass, obj);
  }
};
