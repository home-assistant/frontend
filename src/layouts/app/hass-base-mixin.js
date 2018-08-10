/* eslint-disable no-unused-vars */
export default superClass => class extends superClass {
  constructor() {
    super();
    this.__pendingHass = false;
  }

  // Exists so all methods can safely call super method
  hassConnected() {}
  hassReconnected() {}
  panelUrlChanged(newPanelUrl) {}
  hassChanged(hass, oldHass) {}

  async _updateHass(obj) {
    const oldHass = this.hass;
    this.hass = Object.assign({}, this.hass, obj);
    this.__pendingHass = true;

    await 0;

    if (!this.__pendingHass) return;

    this.__pendingHass = false;
    this.hassChanged(this.hass, oldHass);
  }
};
