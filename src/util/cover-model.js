export default function CoverEntity (hass, stateObj) {
  this.hass = hass;
  this.stateObj = stateObj;
};

function addGetter(name, getter) {
  Object.defineProperty(
    CoverEntity.prototype, name,
    { get: getter }
  );
}

addGetter('isFullyOpen', function () {
  if (this.stateObj.attributes.current_position !== undefined) {
    return this.stateObj.attributes.current_position === 100;
  }
  return this.stateObj.state === 'open';
});

addGetter('isFullyClosed', function () {
  if (this.stateObj.attributes.current_position !== undefined) {
    return this.stateObj.attributes.current_position === 0;
  }
  return this.stateObj.state === 'closed';
});

addGetter('isFullyOpenTilt', function () {
  return this.stateObj.attributes.current_tilt_position === 100;
});

addGetter('isFullyClosedTilt', function () {
  return this.stateObj.attributes.current_tilt_position === 0;
});

/* eslint-disable no-bitwise */

addGetter('supportsOpen', function () {
  return (this.stateObj.attributes.supported_features & 1) !== 0;
});

addGetter('supportsClose', function () {
  return (this.stateObj.attributes.supported_features & 2) !== 0;
});

addGetter('supportsSetPosition', function () {
  return (this.stateObj.attributes.supported_features & 4) !== 0;
});

addGetter('supportsStop', function () {
  return (this.stateObj.attributes.supported_features & 8) !== 0;
});

addGetter('supportsOpenTilt', function () {
  return (this.stateObj.attributes.supported_features & 16) !== 0;
});

addGetter('supportsCloseTilt', function () {
  return (this.stateObj.attributes.supported_features & 32) !== 0;
});

addGetter('supportsStopTilt', function () {
  return (this.stateObj.attributes.supported_features & 64) !== 0;
});

addGetter('supportsSetTiltPosition', function () {
  return (this.stateObj.attributes.supported_features & 128) !== 0;
});

addGetter('isTiltOnly', function () {
  var supportsCover = this.supportsOpen || this.supportsClose || this.supportsStop;
  var supportsTilt = this.supportsOpenTilt || this.supportsCloseTilt || this.supportsStopTilt;
  return supportsTilt && !supportsCover;
});

/* eslint-enable no-bitwise */

Object.assign(CoverEntity.prototype, {
  openCover: function () {
    this.callService('open_cover');
  },

  closeCover: function () {
    this.callService('close_cover');
  },

  stopCover: function () {
    this.callService('stop_cover');
  },

  openCoverTilt: function () {
    this.callService('open_cover_tilt');
  },

  closeCoverTilt: function () {
    this.callService('close_cover_tilt');
  },

  stopCoverTilt: function () {
    this.callService('stop_cover_tilt');
  },

  setCoverPosition: function (position) {
    this.callService('set_cover_position', { position: position });
  },

  setCoverTiltPosition: function (tiltPosition) {
    this.callService('set_cover_tilt_position', { tilt_position: tiltPosition });
  },

  // helper method

  callService: function (service, data) {
    var serviceData = data || {};
    serviceData.entity_id = this.stateObj.entity_id;
    this.hass.callService('cover', service, serviceData);
  },
});
