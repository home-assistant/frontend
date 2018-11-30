import { supportsFeature } from "../common/entity/supports-feature";

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

  get supportsOpen() {
    return supportsFeature(this.stateObj, 1);
  }

  get supportsClose() {
    return supportsFeature(this.stateObj, 2);
  }

  get supportsSetPosition() {
    return supportsFeature(this.stateObj, 4);
  }

  get supportsStop() {
    return supportsFeature(this.stateObj, 8);
  }

  get supportsOpenTilt() {
    return supportsFeature(this.stateObj, 16);
  }

  get supportsCloseTilt() {
    return supportsFeature(this.stateObj, 32);
  }

  get supportsStopTilt() {
    return supportsFeature(this.stateObj, 64);
  }

  get supportsSetTiltPosition() {
    return supportsFeature(this.stateObj, 128);
  }

  get isTiltOnly() {
    const supportsCover =
      this.supportsOpen || this.supportsClose || this.supportsStop;
    const supportsTilt =
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

export const supportsOpen = (stateObj) => supportsFeature(stateObj, 1);

export const supportsClose = (stateObj) => supportsFeature(stateObj, 2);

export const supportsSetPosition = (stateObj) => supportsFeature(stateObj, 4);

export const supportsStop = (stateObj) => supportsFeature(stateObj, 8);

export const supportsOpenTilt = (stateObj) => supportsFeature(stateObj, 16);

export const supportsCloseTilt = (stateObj) => supportsFeature(stateObj, 32);

export const supportsStopTilt = (stateObj) => supportsFeature(stateObj, 64);

export const supportsSetTiltPosition = (stateObj) =>
  supportsFeature(stateObj, 128);

export function isTiltOnly(stateObj) {
  const supportsCover =
    supportsOpen(stateObj) || supportsClose(stateObj) || supportsStop(stateObj);
  const supportsTilt =
    supportsOpenTilt(stateObj) ||
    supportsCloseTilt(stateObj) ||
    supportsStopTilt(stateObj);
  return supportsTilt && !supportsCover;
}
