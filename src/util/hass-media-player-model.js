export default function HassMediaPlayerEntity(hass, stateObj) {
  this.hass = hass;
  this.stateObj = stateObj;
}

function addGetter(name, getter) {
  Object.defineProperty(
    HassMediaPlayerEntity.prototype, name,
    { get: getter }
  );
}

addGetter('isOff', function () {
  return this.stateObj.state === 'off';
});

addGetter('isIdle', function () {
  return this.stateObj.state === 'idle';
});

addGetter('isMuted', function () {
  return this.stateObj.attributes.is_volume_muted;
});

addGetter('isPaused', function () {
  return this.stateObj.state === 'paused';
});

addGetter('isPlaying', function () {
  return this.stateObj.state === 'playing';
});

addGetter('isMusic', function () {
  return this.stateObj.attributes.media_content_type === 'music';
});

addGetter('isTVShow', function () {
  return this.stateObj.attributes.media_content_type === 'tvshow';
});

addGetter('hasMediaControl', function () {
  return ['playing', 'paused', 'unknown'].indexOf(this.stateObj.state) !== -1;
});

addGetter('volumeSliderValue', function () {
  return this.stateObj.attributes.volume_level * 100;
});

addGetter('showProgress', function () {
  return (
    (this.isPlaying || this.isPaused) &&
    'media_duration' in this.stateObj.attributes &&
    'media_position' in this.stateObj.attributes &&
    'media_position_updated_at' in this.stateObj.attributes);
});

addGetter('currentProgress', function () {
  var progress = this.stateObj.attributes.media_position;
  if (this.isPlaying) {
    progress += (Date.now() -
                 new Date(this.stateObj.attributes.media_position_updated_at).getTime()) / 1000.0;
  }
  return progress;
});

/* eslint-disable no-bitwise */

addGetter('supportsPause', function () {
  return (this.stateObj.attributes.supported_features & 1) !== 0;
});

addGetter('supportsVolumeSet', function () {
  return (this.stateObj.attributes.supported_features & 4) !== 0;
});

addGetter('supportsVolumeMute', function () {
  return (this.stateObj.attributes.supported_features & 8) !== 0;
});

addGetter('supportsPreviousTrack', function () {
  return (this.stateObj.attributes.supported_features & 16) !== 0;
});

addGetter('supportsNextTrack', function () {
  return (this.stateObj.attributes.supported_features & 32) !== 0;
});

addGetter('supportsTurnOn', function () {
  return (this.stateObj.attributes.supported_features & 128) !== 0;
});

addGetter('supportsTurnOff', function () {
  return (this.stateObj.attributes.supported_features & 256) !== 0;
});

addGetter('supportsPlayMedia', function () {
  return (this.stateObj.attributes.supported_features & 512) !== 0;
});

addGetter('supportsVolumeButtons', function () {
  return (this.stateObj.attributes.supported_features & 1024) !== 0;
});

addGetter('supportsSelectSource', function () {
  return (this.stateObj.attributes.supported_features & 2048) !== 0;
});

addGetter('supportsPlay', function () {
  return (this.stateObj.attributes.supported_features & 16384) !== 0;
});

/* eslint-enable no-bitwise */

addGetter('primaryTitle', function () {
  return this.stateObj.attributes.media_title;
});

addGetter('secondaryTitle', function () {
  if (this.isMusic) {
    return this.stateObj.attributes.media_artist;
  } else if (this.isTVShow) {
    var text = this.stateObj.attributes.media_series_title;

    if (this.stateObj.attributes.media_season) {
      text += ' S' + this.stateObj.attributes.media_season;

      if (this.stateObj.attributes.media_episode) {
        text += 'E' + this.stateObj.attributes.media_episode;
      }
    }

    return text;
  } else if (this.stateObj.attributes.app_name) {
    return this.stateObj.attributes.app_name;
  }
  return '';
});

addGetter('source', function () {
  return this.stateObj.attributes.source;
});

addGetter('sourceList', function () {
  return this.stateObj.attributes.source_list;
});

Object.assign(HassMediaPlayerEntity.prototype, {
  mediaPlayPause: function () {
    this.callService('media_play_pause');
  },

  nextTrack: function () {
    this.callService('media_next_track');
  },

  playbackControl: function () {
    this.callService('media_play_pause');
  },

  previousTrack: function () {
    this.callService('media_previous_track');
  },

  setVolume: function (volume) {
    this.callService('volume_set', { volume_level: volume });
  },

  togglePower: function () {
    if (this.isOff) {
      this.turnOn();
    } else {
      this.turnOff();
    }
  },

  turnOff: function () {
    this.callService('turn_off');
  },

  turnOn: function () {
    this.callService('turn_on');
  },

  volumeDown: function () {
    this.callService('volume_down');
  },

  volumeMute: function (mute) {
    if (!this.supportsVolumeMute) {
      throw new Error('Muting volume not supported');
    }
    this.callService('volume_mute', { is_volume_muted: mute });
  },

  volumeUp: function () {
    this.callService('volume_up');
  },

  selectSource: function (sourceInput) {
    this.callService('select_source', { source: sourceInput });
  },

  // helper method

  callService: function (service, data) {
    var serviceData = data || {};
    serviceData.entity_id = this.stateObj.entity_id;
    this.hass.callService('media_player', service, serviceData);
  },
});
