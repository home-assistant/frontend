/* eslint-enable no-bitwise */
export default class CoverEntity {
  constructor(hass, stateObj) {
    this.hass = hass;
    this.stateObj = stateObj;
    this._attr = stateObj.attributes;
    this._feat = this._attr.supported_features;
  }

  get isFullyOpen() {
    if (this._attr.current_position !== undefined) {
      return this._attr.current_position === 100;
    }
    return this.stateObj.state === "open";
  }

  get isFullyClosed() {
    if (this._attr.current_position !== undefined) {
      return this._attr.current_position === 0;
    }
    return this.stateObj.state === "closed";
  }

  get isFullyOpenTilt() {
    return this._attr.current_tilt_position === 100;
  }

  get isFullyClosedTilt() {
    return this._attr.current_tilt_position === 0;
  }

  get isOpening() {
    return this.stateObj.state === "opening";
  }

  get isClosing() {
    return this.stateObj.state === "closing";
  }

  /* eslint-disable no-bitwise */

  get supportsOpen() {
    return (this._feat & 1) !== 0;
  }

  get supportsClose() {
    return (this._feat & 2) !== 0;
  }

  get supportsSetPosition() {
    return (this._feat & 4) !== 0;
  }

  get supportsStop() {
    return (this._feat & 8) !== 0;
  }

  get supportsOpenTilt() {
    return (this._feat & 16) !== 0;
  }

  get supportsCloseTilt() {
    return (this._feat & 32) !== 0;
  }

  get supportsStopTilt() {
    return (this._feat & 64) !== 0;
  }

  get supportsSetTiltPosition() {
    return (this._feat & 128) !== 0;
  }

  get isTiltOnly() {
    var supportsCover =
      this.supportsOpen || this.supportsClose || this.supportsStop;
    var supportsTilt =
      this.supportsOpenTilt || this.supportsCloseTilt || this.supportsStopTilt;
    return supportsTilt && !supportsCover;
  }

  openCover() {
    this.callService("open_cover");
  }

  closeCover() {
    this.callService("close_cover");
  }

  stopCover() {
    this.callService("stop_cover");
  }

  openCoverTilt() {
    this.callService("open_cover_tilt");
  }

  closeCoverTilt() {
    this.callService("close_cover_tilt");
  }

  stopCoverTilt() {
    this.callService("stop_cover_tilt");
  }

  setCoverPosition(position) {
    this.callService("set_cover_position", { position });
  }

  setCoverTiltPosition(tiltPosition) {
    this.callService("set_cover_tilt_position", {
      tilt_position: tiltPosition,
    });
  }

  // helper method

  callService(service, data = {}) {
    data.entity_id = this.stateObj.entity_id;
    this.hass.callService("cover", service, data);
  }
}

const support = (stateObj, feature) =>
  (stateObj.attributes.supported_features & feature) !== 0;

export const supportsOpen = (stateObj) => support(stateObj, 1);

export const supportsClose = (stateObj) => support(stateObj, 2);

export const supportsSetPosition = (stateObj) => support(stateObj, 4);

export const supportsStop = (stateObj) => support(stateObj, 8);

export const supportsOpenTilt = (stateObj) => support(stateObj, 16);

export const supportsCloseTilt = (stateObj) => support(stateObj, 32);

export const supportsStopTilt = (stateObj) => support(stateObj, 64);

export const supportsSetTiltPosition = (stateObj) => support(stateObj, 128);

export function isTiltOnly(stateObj) {
  var supportsCover =
    supportsOpen(stateObj) || supportsClose(stateObj) || supportsStop(stateObj);
  var supportsTilt =
    supportsOpenTilt(stateObj) ||
    supportsCloseTilt(stateObj) ||
    supportsStopTilt(stateObj);
  return supportsTilt && !supportsCover;
}
