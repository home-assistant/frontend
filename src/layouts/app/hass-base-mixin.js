/* eslint-disable no-unused-vars */
// Exists so all methods can safely call super method
export default superClass => class extends superClass {
  hassConnected() {}
  hassReconnected() {}
  panelUrlChanged(newPanelUrl) {}
};
