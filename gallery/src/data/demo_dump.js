export default {
  'sun.sun': {
    entity_id: 'sun.sun',
    state: 'below_horizon',
    attributes: {
      next_dawn: '2018-07-19T20:48:47+00:00',
      next_dusk: '2018-07-20T11:46:06+00:00',
      next_midnight: '2018-07-19T16:17:28+00:00',
      next_noon: '2018-07-20T04:17:26+00:00',
      next_rising: '2018-07-19T21:16:31+00:00',
      next_setting: '2018-07-20T11:18:22+00:00',
      elevation: 67.69,
      azimuth: 338.55,
      friendly_name: 'Sun'
    },
    last_changed: '2018-07-19T12:06:18.384550+00:00',
    last_updated: '2018-07-19T12:40:30.374858+00:00',
  },
  'zone.home': {
    entity_id: 'zone.home',
    state: 'zoning',
    attributes: {
      hidden: true,
      latitude: 0,
      longitude: 0,
      radius: 100,
      friendly_name: 'Home',
      icon: 'mdi:home'
    },
    last_changed: '2018-07-19T10:44:45.811040+00:00',
    last_updated: '2018-07-19T10:44:45.811040+00:00'
  },
  'persistent_notification.notification': {
    entity_id: 'persistent_notification.notification',
    state: 'notifying',
    attributes: {
      title: 'Welcome Home!',
      message: 'Here are some resources to get started:\n\n - [Configuring Home Assistant](https://home-assistant.io/getting-started/configuration/)\n - [Available components](https://home-assistant.io/components/)\n - [Troubleshooting your configuration](https://home-assistant.io/docs/configuration/troubleshooting/)\n - [Getting help](https://home-assistant.io/help/)\n\nTo not see this card popup in the future, edit your config in\n`configuration.yaml` and disable the `introduction` component.'
    },
    last_changed: '2018-07-19T10:44:45.922241+00:00',
    last_updated: '2018-07-19T10:44:45.922241+00:00'
  },
  'timer.laundry': {
    entity_id: 'timer.laundry',
    state: 'idle',
    attributes: {
      duration: '0:01:00',
      remaining: '0:01:00'
    },
    last_changed: '2018-07-19T10:44:45.923256+00:00',
    last_updated: '2018-07-19T10:44:45.923256+00:00',
  },
  'input_number.box1': {
    entity_id: 'input_number.box1',
    state: '30.0',
    attributes: {
      min: -20,
      max: 35,
      step: 1,
      mode: 'box',
      friendly_name: 'Numeric Input Box'
    },
    last_changed: '2018-07-19T10:44:45.923416+00:00',
    last_updated: '2018-07-19T10:44:45.923416+00:00',
  },
  'input_number.slider1': {
    entity_id: 'input_number.slider1',
    state: '30.0',
    attributes: {
      min: -20,
      max: 35,
      step: 1,
      mode: 'slider',
      unit_of_measurement: 'beers',
      friendly_name: 'Slider'
    },
    last_changed: '2018-07-19T10:44:45.923572+00:00',
    last_updated: '2018-07-19T10:44:45.923572+00:00',
  },
  'sensor.brightness': {
    entity_id: 'sensor.brightness',
    state: '12',
    attributes: {
      maximum: 20,
      minimum: 0,
      friendly_name: 'brightness',
      icon: 'mdi:hanger'
    },
    last_changed: '2018-07-19T12:40:28.378102+00:00',
    last_updated: '2018-07-19T12:40:28.378102+00:00',
  },
  'sensor.battery': {
    entity_id: 'sensor.battery',
    state: '2',
    attributes: {
      maximum: 20,
      minimum: 0,
      friendly_name: 'battery',
      icon: 'mdi:hanger'
    },
    last_changed: '2018-07-19T12:40:28.377758+00:00',
    last_updated: '2018-07-19T12:40:28.377758+00:00',
  },
  'sensor.outside_temperature': {
    entity_id: 'sensor.outside_temperature',
    state: '15.6',
    attributes: {
      battery_level: 12,
      unit_of_measurement: '°C',
      friendly_name: 'Outside Temperature',
      device_class: 'temperature'
    },
    last_changed: '2018-07-19T10:44:45.924111+00:00',
    last_updated: '2018-07-19T10:44:45.924111+00:00',
  },
  'sensor.outside_humidity': {
    entity_id: 'sensor.outside_humidity',
    state: '54',
    attributes: {
      unit_of_measurement: '%',
      friendly_name: 'Outside Humidity',
      device_class: 'humidity'
    },
    last_changed: '2018-07-19T10:44:45.924273+00:00',
    last_updated: '2018-07-19T10:44:45.924273+00:00',
  },
  'sensor.conductivity': {
    entity_id: 'sensor.conductivity',
    state: '1',
    attributes: {
      maximum: 20,
      minimum: 0,
      friendly_name: 'conductivity',
      icon: 'mdi:hanger'
    },
    last_changed: '2018-07-19T12:40:28.377305+00:00',
    last_updated: '2018-07-19T12:40:28.377305+00:00',
  },
  'weather.demo_weather_south': {
    entity_id: 'weather.demo_weather_south',
    state: 'sunny',
    attributes: {
      temperature: 21.6,
      humidity: 92,
      pressure: 1099,
      wind_speed: 0.5,
      attribution: 'Powered by Home Assistant',
      forecast: [
        {
          datetime: '2018-07-19T16:00:45.924736',
          condition: 'rainy',
          precipitation: 1,
          temperature: 22,
          templow: 15
        },
        {
          datetime: '2018-07-19T20:00:45.924736',
          condition: 'rainy',
          precipitation: 5,
          temperature: 19,
          templow: 8
        },
        {
          datetime: '2018-07-20T00:00:45.924736',
          condition: 'cloudy',
          precipitation: 0,
          temperature: 15,
          templow: 9
        },
        {
          datetime: '2018-07-20T04:00:45.924736',
          condition: 'sunny',
          precipitation: 0,
          temperature: 12,
          templow: 6
        },
        {
          datetime: '2018-07-20T08:00:45.924736',
          condition: 'partlycloudy',
          precipitation: 2,
          temperature: 14,
          templow: 7
        },
        {
          datetime: '2018-07-20T12:00:45.924736',
          condition: 'rainy',
          precipitation: 15,
          temperature: 18,
          templow: 7
        },
        {
          datetime: '2018-07-20T16:00:45.924736',
          condition: 'fog',
          precipitation: 0.2,
          temperature: 21,
          templow: 12
        }
      ],
      friendly_name: 'Demo Weather South'
    },
    last_changed: '2018-07-19T10:44:45.924818+00:00',
    last_updated: '2018-07-19T10:44:45.924818+00:00'
  },
  'weather.demo_weather_north': {
    entity_id: 'weather.demo_weather_north',
    state: 'rainy',
    attributes: {
      temperature: -24,
      humidity: 54,
      pressure: 987,
      wind_speed: 4.8,
      attribution: 'Powered by Home Assistant',
      forecast: [
        {
          datetime: '2018-07-19T16:00:45.925119',
          condition: 'snowy',
          precipitation: 2,
          temperature: -23,
          templow: -26
        },
        {
          datetime: '2018-07-19T20:00:45.925119',
          condition: 'partlycloudy',
          precipitation: 1,
          temperature: -25,
          templow: -26
        },
        {
          datetime: '2018-07-20T00:00:45.925119',
          condition: 'sunny',
          precipitation: 0,
          temperature: -28,
          templow: -30
        },
        {
          datetime: '2018-07-20T04:00:45.925119',
          condition: 'sunny',
          precipitation: 0.1,
          temperature: -31,
          templow: -31
        },
        {
          datetime: '2018-07-20T08:00:45.925119',
          condition: 'snowy',
          precipitation: 4,
          temperature: -28,
          templow: -29
        },
        {
          datetime: '2018-07-20T12:00:45.925119',
          condition: 'sunny',
          precipitation: 0.3,
          temperature: -26,
          templow: -28
        },
        {
          datetime: '2018-07-20T16:00:45.925119',
          condition: 'sunny',
          precipitation: 0,
          temperature: -23,
          templow: -24
        }
      ],
      friendly_name: 'Demo Weather North'
    },
    last_changed: '2018-07-19T10:44:45.925197+00:00',
    last_updated: '2018-07-19T10:44:45.925197+00:00'
  },
  'a.demo_mode': {
    entity_id: 'a.demo_mode',
    state: 'Enabled',
    attributes: {},
    last_changed: '2018-07-19T10:44:45.928682+00:00',
    last_updated: '2018-07-19T10:44:45.928682+00:00'
  },
  'plant.bonsai': {
    entity_id: 'plant.bonsai',
    state: 'ok',
    attributes: {
      problem: 'none',
      sensors: {
        moisture: 'sensor.outside_humidity',
        battery: 'sensor.battery',
        temperature: 'sensor.outside_temperature',
        conductivity: 'sensor.conductivity',
        brightness: 'sensor.brightness'
      },
      unit_of_measurement_dict: {
        temperature: '°C',
        moisture: '%'
      },
      moisture: 54,
      battery: 2,
      temperature: 15.6,
      conductivity: 1,
      brightness: 12,
      max_brightness: 20,
      friendly_name: 'Bonsai'
    },
    last_changed: '2018-07-19T10:44:45.939328+00:00',
    last_updated: '2018-07-19T12:40:28.379845+00:00'
  },
  'media_player.lounge_room': {
    entity_id: 'media_player.lounge_room',
    state: 'playing',
    attributes: {
      volume_level: 1,
      is_volume_muted: false,
      media_content_id: 'house-of-cards-1',
      media_content_type: 'tvshow',
      media_duration: 3600,
      media_title: 'Chapter 1',
      media_series_title: 'House of Cards',
      media_season: 1,
      media_episode: 1,
      app_name: 'Netflix',
      source: 'dvd',
      sound_mode: 'Dummy Music',
      sound_mode_list: [
        'Dummy Music',
        'Dummy Movie'
      ],
      shuffle: false,
      friendly_name: 'Lounge room',
      entity_picture: '/api/media_player_proxy/media_player.lounge_room?token=20aea624c9d6c83d44e212e60c0795633d2700cde18d60901c6d74b0d063d6bf&cache=cb9d84451faf9351',
      supported_features: 117169
    },
    last_changed: '2018-07-19T10:44:45.935593+00:00',
    last_updated: '2018-07-19T10:44:45.935593+00:00',
  },
  'media_player.bedroom': {
    entity_id: 'media_player.bedroom',
    state: 'playing',
    attributes: {
      volume_level: 1,
      is_volume_muted: false,
      media_content_id: 'kxopViU98Xo',
      media_content_type: 'movie',
      media_duration: 360000,
      media_position: 54000.016711,
      media_position_updated_at: '2018-07-19T10:44:45.919531+00:00',
      media_title: 'Epic sax guy 10 hours',
      app_name: 'YouTube',
      sound_mode: 'Dummy Music',
      sound_mode_list: [
        'Dummy Music',
        'Dummy Movie'
      ],
      shuffle: false,
      friendly_name: 'Bedroom',
      entity_picture: '/api/media_player_proxy/media_player.bedroom?token=b26ff1a75b0929f6ad578955689815af828229e6cffaf061b8b6fb69c4044976&cache=e4513ed94ec89151',
      supported_features: 115597
    },
    last_changed: '2018-07-19T10:44:45.936499+00:00',
    last_updated: '2018-07-19T10:44:45.936499+00:00',
  },
  'media_player.living_room': {
    entity_id: 'media_player.living_room',
    state: 'playing',
    attributes: {
      volume_level: 1,
      is_volume_muted: false,
      media_content_id: 'eyU3bRy2x44',
      media_content_type: 'movie',
      media_duration: 300,
      media_position: 45.017773,
      media_position_updated_at: '2018-07-19T10:44:45.919514+00:00',
      media_title: '♥♥ The Best Fireplace Video (3 hours)',
      app_name: 'YouTube',
      sound_mode: 'Dummy Music',
      sound_mode_list: [
        'Dummy Music',
        'Dummy Movie'
      ],
      shuffle: false,
      friendly_name: 'Living Room',
      entity_picture: '/api/media_player_proxy/media_player.living_room?token=e925f8db7f7bd1f317e4524dcb8333d60f6019219a3799a22604b5787f243567&cache=bc2ffb49c4f67034',
      supported_features: 115597
    },
    last_changed: '2018-07-19T10:44:45.937400+00:00',
    last_updated: '2018-07-19T10:44:45.937400+00:00',
  },
  'media_player.walkman': {
    entity_id: 'media_player.walkman',
    state: 'playing',
    attributes: {
      volume_level: 1,
      is_volume_muted: false,
      media_content_id: 'bounzz-1',
      media_content_type: 'music',
      media_duration: 213,
      media_title: 'I Wanna Be A Hippy (Flamman & Abraxas Radio Mix)',
      media_artist: 'Technohead',
      media_album_name: 'Bounzz',
      media_track: 1,
      sound_mode: 'Dummy Music',
      sound_mode_list: [
        'Dummy Music',
        'Dummy Movie'
      ],
      shuffle: false,
      friendly_name: 'Walkman',
      entity_picture: '/api/media_player_proxy/media_player.walkman?token=eda2b56fa513fa80f8d9c641941a3702b83e84e239c9ed82efc665a31e80d8fd&cache=62c0c516acbc53a9',
      supported_features: 123325
    },
    last_changed: '2018-07-19T10:44:45.938179+00:00',
    last_updated: '2018-07-19T10:44:45.938179+00:00',
  },
  'input_select.who_cooks': {
    entity_id: 'input_select.who_cooks',
    state: 'Anne Therese',
    attributes: {
      options: [
        'Paulus',
        'Anne Therese'
      ],
      friendly_name: 'Cook today',
      icon: 'mdi:panda'
    },
    last_changed: '2018-07-19T10:44:46.105361+00:00',
    last_updated: '2018-07-19T10:44:46.105361+00:00',
  },
  'input_boolean.notify': {
    entity_id: 'input_boolean.notify',
    state: 'off',
    attributes: {
      friendly_name: 'Notify Anne Therese is home',
      icon: 'mdi:car'
    },
    last_changed: '2018-07-19T10:44:46.105940+00:00',
    last_updated: '2018-07-19T10:44:46.105940+00:00',
  },
  'weblink.router': {
    entity_id: 'weblink.router',
    state: 'http://192.168.1.1',
    attributes: {
      friendly_name: 'Router'
    },
    last_changed: '2018-07-19T10:44:46.107286+00:00',
    last_updated: '2018-07-19T10:44:46.107286+00:00',
  },
  'group.all_plants': {
    entity_id: 'group.all_plants',
    state: 'ok',
    attributes: {
      entity_id: [
        'plant.bonsai'
      ],
      order: 0,
      auto: true,
      friendly_name: 'all plants',
      hidden: true
    },
    last_changed: '2018-07-19T10:44:46.193703+00:00',
    last_updated: '2018-07-19T10:44:46.193703+00:00'
  },
  'alarm_control_panel.alarm': {
    entity_id: 'alarm_control_panel.alarm',
    state: 'disarmed',
    attributes: {
      code_format: 'Number',
      changed_by: null,
      friendly_name: 'Alarm'
    },
    last_changed: '2018-07-19T10:44:46.198517+00:00',
    last_updated: '2018-07-19T10:44:46.198517+00:00',
  },
  'binary_sensor.basement_floor_wet': {
    entity_id: 'binary_sensor.basement_floor_wet',
    state: 'off',
    attributes: {
      friendly_name: 'Basement Floor Wet',
      device_class: 'moisture'
    },
    last_changed: '2018-07-19T10:44:46.198923+00:00',
    last_updated: '2018-07-19T10:44:46.198923+00:00',
  },
  'binary_sensor.movement_backyard': {
    entity_id: 'binary_sensor.movement_backyard',
    state: 'on',
    attributes: {
      friendly_name: 'Movement Backyard',
      device_class: 'motion'
    },
    last_changed: '2018-07-19T10:44:46.199163+00:00',
    last_updated: '2018-07-19T10:44:46.199163+00:00',
  },
  'climate.ecobee': {
    entity_id: 'climate.ecobee',
    state: 'auto',
    attributes: {
      current_temperature: 23,
      min_temp: 7,
      max_temp: 35,
      temperature: null,
      target_temp_high: 24,
      target_temp_low: 21,
      fan_mode: 'Auto Low',
      fan_list: [
        'On Low',
        'On High',
        'Auto Low',
        'Auto High',
        'Off'
      ],
      operation_mode: 'auto',
      operation_list: [
        'heat',
        'cool',
        'auto',
        'off'
      ],
      hold_mode: 'home',
      swing_mode: 'Auto',
      swing_list: [
        'Auto',
        '1',
        '2',
        '3',
        'Off'
      ],
      unit_of_measurement: '°C',
      friendly_name: 'Ecobee',
      supported_features: 1014
    },
    last_changed: '2018-07-19T10:44:46.200333+00:00',
    last_updated: '2018-07-19T10:44:46.200333+00:00',
  },
  'climate.hvac': {
    entity_id: 'climate.hvac',
    state: 'cool',
    attributes: {
      current_temperature: 22,
      min_temp: 7,
      max_temp: 35,
      temperature: 21,
      humidity: 67,
      current_humidity: 54,
      min_humidity: 30,
      max_humidity: 99,
      fan_mode: 'On High',
      fan_list: [
        'On Low',
        'On High',
        'Auto Low',
        'Auto High',
        'Off'
      ],
      operation_mode: 'cool',
      operation_list: [
        'heat',
        'cool',
        'auto',
        'off'
      ],
      swing_mode: 'Off',
      swing_list: [
        'Auto',
        '1',
        '2',
        '3',
        'Off'
      ],
      away_mode: 'on',
      aux_heat: 'off',
      unit_of_measurement: '°C',
      friendly_name: 'Hvac',
      supported_features: 3833
    },
    last_changed: '2018-07-19T10:44:46.200650+00:00',
    last_updated: '2018-07-19T10:44:46.200650+00:00',
  },
  'climate.heatpump': {
    entity_id: 'climate.heatpump',
    state: 'heat',
    attributes: {
      current_temperature: 25,
      min_temp: 7,
      max_temp: 35,
      temperature: 20,
      operation_mode: 'heat',
      operation_list: [
        'heat',
        'cool',
        'auto',
        'off'
      ],
      unit_of_measurement: '°C',
      friendly_name: 'HeatPump',
      supported_features: 4273
    },
    last_changed: '2018-07-19T10:44:46.200946+00:00',
    last_updated: '2018-07-19T10:44:46.200946+00:00',
  },
  'mailbox.demomailbox': {
    entity_id: 'mailbox.demomailbox',
    state: '10',
    attributes: {
      friendly_name: 'DemoMailbox'
    },
    last_changed: '2018-07-19T10:45:16.555210+00:00',
    last_updated: '2018-07-19T10:45:16.555210+00:00',
  },
  'input_select.living_room_preset': {
    entity_id: 'input_select.living_room_preset',
    state: 'Visitors',
    attributes: {
      options: [
        'Visitors',
        'Visitors with kids',
        'Home Alone'
      ]
    },
    last_changed: '2018-07-19T10:44:46.211150+00:00',
    last_updated: '2018-07-19T10:44:46.211150+00:00',
  },
  'camera.demo_camera': {
    entity_id: 'camera.demo_camera',
    state: 'idle',
    attributes: {
      access_token: '2f5bb163fb91cd8770a9494fa5e7eab172d8d34f4aba806eb6b59411b8c720b8',
      friendly_name: 'Demo camera',
      entity_picture: '/api/camera_proxy/camera.demo_camera?token=2f5bb163fb91cd8770a9494fa5e7eab172d8d34f4aba806eb6b59411b8c720b8'
    },
    last_changed: '2018-07-19T10:44:46.217296+00:00',
    last_updated: '2018-07-19T12:37:34.378986+00:00'
  },
  'cover.garage_door': {
    entity_id: 'cover.garage_door',
    state: 'closed',
    attributes: {
      friendly_name: 'Garage Door',
      supported_features: 3,
      device_class: 'garage'
    },
    last_changed: '2018-07-19T10:44:46.218790+00:00',
    last_updated: '2018-07-19T10:44:46.218790+00:00',
  },
  'cover.living_room_window': {
    entity_id: 'cover.living_room_window',
    state: 'open',
    attributes: {
      current_position: 70,
      current_tilt_position: 50,
      friendly_name: 'Living Room Window',
      supported_features: 255
    },
    last_changed: '2018-07-19T10:44:46.220347+00:00',
    last_updated: '2018-07-19T10:44:46.220347+00:00',
  },
  'cover.hall_window': {
    entity_id: 'cover.hall_window',
    state: 'open',
    attributes: {
      current_position: 10,
      friendly_name: 'Hall Window',
      supported_features: 15
    },
    last_changed: '2018-07-19T10:44:46.281104+00:00',
    last_updated: '2018-07-19T10:44:46.281104+00:00',
  },
  'cover.kitchen_window': {
    entity_id: 'cover.kitchen_window',
    state: 'closed',
    attributes: {
      friendly_name: 'Kitchen Window',
      supported_features: 11
    },
    last_changed: '2018-07-19T10:44:46.281449+00:00',
    last_updated: '2018-07-19T10:44:46.281449+00:00',
  },
  'fan.living_room_fan': {
    entity_id: 'fan.living_room_fan',
    state: 'off',
    attributes: {
      speed: 'off',
      speed_list: [
        'off',
        'low',
        'medium',
        'high'
      ],
      oscillating: false,
      direction: 'forward',
      friendly_name: 'Living Room Fan',
      supported_features: 7
    },
    last_changed: '2018-07-19T10:44:46.281761+00:00',
    last_updated: '2018-07-19T10:44:46.281761+00:00',
  },
  'fan.ceiling_fan': {
    entity_id: 'fan.ceiling_fan',
    state: 'off',
    attributes: {
      speed: 'off',
      speed_list: [
        'off',
        'low',
        'medium',
        'high'
      ],
      friendly_name: 'Ceiling Fan',
      supported_features: 1
    },
    last_changed: '2018-07-19T10:44:46.282008+00:00',
    last_updated: '2018-07-19T10:44:46.282008+00:00',
  },
  'light.kitchen_lights': {
    entity_id: 'light.kitchen_lights',
    state: 'on',
    attributes: {
      min_mireds: 153,
      max_mireds: 500,
      brightness: 180,
      color_temp: 240,
      hs_color: [
        345,
        75
      ],
      rgb_color: [
        255,
        63,
        111
      ],
      xy_color: [
        0.59,
        0.274
      ],
      white_value: 200,
      friendly_name: 'Kitchen Lights',
      supported_features: 151
    },
    last_changed: '2018-07-19T10:44:46.282257+00:00',
    last_updated: '2018-07-19T10:44:46.282257+00:00',
  },
  'light.bed_light': {
    entity_id: 'light.bed_light',
    state: 'off',
    attributes: {
      min_mireds: 153,
      max_mireds: 500,
      friendly_name: 'Bed Light',
      supported_features: 151
    },
    last_changed: '2018-07-19T10:44:46.282478+00:00',
    last_updated: '2018-07-19T10:44:46.282478+00:00',
  },
  'light.ceiling_lights': {
    entity_id: 'light.ceiling_lights',
    state: 'on',
    attributes: {
      min_mireds: 153,
      max_mireds: 500,
      brightness: 180,
      color_temp: 380,
      hs_color: [
        56,
        86
      ],
      rgb_color: [
        255,
        240,
        35
      ],
      xy_color: [
        0.459,
        0.496
      ],
      white_value: 200,
      friendly_name: 'Ceiling Lights',
      supported_features: 151
    },
    last_changed: '2018-07-19T10:44:46.282696+00:00',
    last_updated: '2018-07-19T10:44:46.282696+00:00',
  },
  'lock.openable_lock': {
    entity_id: 'lock.openable_lock',
    state: 'locked',
    attributes: {
      friendly_name: 'Openable Lock',
      supported_features: 1
    },
    last_changed: '2018-07-19T10:44:46.282949+00:00',
    last_updated: '2018-07-19T10:44:46.282949+00:00',
  },
  'lock.kitchen_door': {
    entity_id: 'lock.kitchen_door',
    state: 'unlocked',
    attributes: {
      friendly_name: 'Kitchen Door'
    },
    last_changed: '2018-07-19T10:44:46.283175+00:00',
    last_updated: '2018-07-19T10:44:46.283175+00:00',
  },
  'lock.front_door': {
    entity_id: 'lock.front_door',
    state: 'locked',
    attributes: {
      friendly_name: 'Front Door'
    },
    last_changed: '2018-07-19T10:44:46.283396+00:00',
    last_updated: '2018-07-19T10:44:46.283396+00:00',
  },
  'switch.decorative_lights': {
    entity_id: 'switch.decorative_lights',
    state: 'on',
    attributes: {
      current_power_w: 100,
      today_energy_kwh: 15,
      friendly_name: 'Decorative Lights',
      assumed_state: true
    },
    last_changed: '2018-07-19T11:33:15.735386+00:00',
    last_updated: '2018-07-19T11:33:15.735386+00:00',
  },
  'switch.ac': {
    entity_id: 'switch.ac',
    state: 'off',
    attributes: {
      today_energy_kwh: 15,
      friendly_name: 'AC',
      icon: 'mdi:air-conditioner'
    },
    last_changed: '2018-07-19T10:44:46.283901+00:00',
    last_updated: '2018-07-19T10:44:46.283901+00:00',
  },
  'device_tracker.demo_paulus': {
    entity_id: 'device_tracker.demo_paulus',
    state: 'not_home',
    attributes: {
      source_type: 'gps',
      latitude: 32.877105,
      longitude: 117.232185,
      gps_accuracy: 91,
      battery: 71,
      friendly_name: 'Paulus'
    },
    last_changed: '2018-07-19T10:44:46.287874+00:00',
    last_updated: '2018-07-19T10:44:46.287874+00:00',
  },
  'device_tracker.demo_anne_therese': {
    entity_id: 'device_tracker.demo_anne_therese',
    state: 'not_home',
    attributes: {
      source_type: 'gps',
      latitude: 32.876194999999996,
      longitude: 117.236015,
      gps_accuracy: 63,
      battery: 33,
      friendly_name: 'Anne Therese'
    },
    last_changed: '2018-07-19T10:44:46.288213+00:00',
    last_updated: '2018-07-19T10:44:46.288213+00:00',
  },
  'device_tracker.demo_home_boy': {
    entity_id: 'device_tracker.demo_home_boy',
    state: 'not_home',
    attributes: {
      source_type: 'gps',
      latitude: 32.87334,
      longitude: 117.22745,
      gps_accuracy: 20,
      battery: 53,
      friendly_name: 'Home Boy'
    },
    last_changed: '2018-07-19T10:44:46.288533+00:00',
    last_updated: '2018-07-19T10:44:46.288533+00:00',
  },
  'calendar.calendar_2': {
    entity_id: 'calendar.calendar_2',
    state: 'off',
    attributes: {
      message: '',
      all_day: false,
      offset_reached: false,
      start_time: null,
      end_time: null,
      location: null,
      description: null,
      friendly_name: 'Calendar 2'
    },
    last_changed: '2018-07-19T11:27:25.017141+00:00',
    last_updated: '2018-07-19T11:27:25.017141+00:00',
  },
  'calendar.calendar_1': {
    entity_id: 'calendar.calendar_1',
    state: 'off',
    attributes: {
      message: '',
      all_day: false,
      offset_reached: false,
      start_time: null,
      end_time: null,
      location: null,
      description: null,
      friendly_name: 'Calendar 1'
    },
    last_changed: '2018-07-19T12:15:21.378222+00:00',
    last_updated: '2018-07-19T12:15:21.378222+00:00',
  },
  'group.all_covers': {
    entity_id: 'group.all_covers',
    state: 'open',
    attributes: {
      entity_id: [
        'cover.garage_door',
        'cover.hall_window',
        'cover.kitchen_window',
        'cover.living_room_window'
      ],
      order: 1,
      auto: true,
      friendly_name: 'all covers',
      hidden: true
    },
    last_changed: '2018-07-19T10:44:46.430361+00:00',
    last_updated: '2018-07-19T10:44:46.430361+00:00'
  },
  'group.all_fans': {
    entity_id: 'group.all_fans',
    state: 'off',
    attributes: {
      entity_id: [
        'fan.ceiling_fan',
        'fan.living_room_fan'
      ],
      order: 1,
      auto: true,
      friendly_name: 'all fans',
      hidden: true
    },
    last_changed: '2018-07-19T10:44:46.430643+00:00',
    last_updated: '2018-07-19T10:44:46.430643+00:00'
  },
  'group.all_lights': {
    entity_id: 'group.all_lights',
    state: 'on',
    attributes: {
      entity_id: [
        'light.bed_light',
        'light.ceiling_lights',
        'light.kitchen_lights'
      ],
      order: 1,
      auto: true,
      friendly_name: 'all lights',
      hidden: true
    },
    last_changed: '2018-07-19T10:44:46.430879+00:00',
    last_updated: '2018-07-19T10:44:46.430879+00:00'
  },
  'group.all_locks': {
    entity_id: 'group.all_locks',
    state: 'locked',
    attributes: {
      entity_id: [
        'lock.front_door',
        'lock.kitchen_door',
        'lock.openable_lock'
      ],
      order: 1,
      auto: true,
      friendly_name: 'all locks',
      hidden: true
    },
    last_changed: '2018-07-19T10:44:46.431112+00:00',
    last_updated: '2018-07-19T10:44:46.431112+00:00'
  },
  'group.all_switches': {
    entity_id: 'group.all_switches',
    state: 'on',
    attributes: {
      entity_id: [
        'switch.ac',
        'switch.decorative_lights'
      ],
      order: 1,
      auto: true,
      friendly_name: 'all switches',
      hidden: true,
      assumed_state: true
    },
    last_changed: '2018-07-19T11:33:15.736167+00:00',
    last_updated: '2018-07-19T11:33:15.736167+00:00'
  },
  'group.calendar': {
    entity_id: 'group.calendar',
    state: 'off',
    attributes: {
      entity_id: [
        'calendar.calendar_1',
        'calendar.calendar_2'
      ],
      order: 6,
      auto: true,
      friendly_name: 'calendar',
      hidden: true
    },
    last_changed: '2018-07-19T12:15:21.378971+00:00',
    last_updated: '2018-07-19T12:15:21.378971+00:00'
  },
  'group.all_devices': {
    entity_id: 'group.all_devices',
    state: 'not_home',
    attributes: {
      entity_id: [
        'device_tracker.demo_paulus',
        'device_tracker.demo_anne_therese',
        'device_tracker.demo_home_boy'
      ],
      order: 6,
      auto: true,
      friendly_name: 'all devices',
      hidden: true
    },
    last_changed: '2018-07-19T10:44:46.435615+00:00',
    last_updated: '2018-07-19T10:44:46.435615+00:00'
  },
  'image_processing.demo_alpr': {
    entity_id: 'image_processing.demo_alpr',
    state: 'AC3829',
    attributes: {
      plates: {
        AC3829: 98.3,
        BE392034: 95.5,
        CD02394: 93.4,
        DF923043: 90.8
      },
      vehicles: 1,
      friendly_name: 'Demo Alpr',
      device_class: 'alpr'
    },
    last_changed: '2018-07-19T10:44:56.654838+00:00',
    last_updated: '2018-07-19T10:44:56.654838+00:00',
  },
  'image_processing.demo_face': {
    entity_id: 'image_processing.demo_face',
    state: 'Hans',
    attributes: {
      faces: [
        {
          confidence: 98.34,
          name: 'Hans',
          age: 16,
          gender: 'male',
          entity_id: 'image_processing.demo_face'
        },
        {
          name: 'Helena',
          age: 28,
          gender: 'female',
          entity_id: 'image_processing.demo_face'
        },
        {
          confidence: 62.53,
          name: 'Luna'
        }
      ],
      total_faces: 4,
      friendly_name: 'Demo Face',
      device_class: 'face'
    },
    last_changed: '2018-07-19T10:44:56.641372+00:00',
    last_updated: '2018-07-19T10:44:56.641372+00:00',
  },
  'persistent_notification.notification_2': {
    entity_id: 'persistent_notification.notification_2',
    state: 'notifying',
    attributes: {
      title: 'Example Notification',
      message: 'This is an example of a persistent notification.'
    },
    last_changed: '2018-07-19T10:44:46.442972+00:00',
    last_updated: '2018-07-19T10:44:46.442972+00:00'
  },
  'group.living_room': {
    entity_id: 'group.living_room',
    state: 'on',
    attributes: {
      entity_id: [
        'light.ceiling_lights',
        'switch.ac',
        'input_select.living_room_preset',
        'cover.living_room_window',
        'media_player.living_room',
        'scene.romantic_lights'
      ],
      order: 8,
      friendly_name: 'Living Room'
    },
    last_changed: '2018-07-19T10:44:46.453731+00:00',
    last_updated: '2018-07-19T10:44:46.453731+00:00',
  },
  'group.bedroom': {
    entity_id: 'group.bedroom',
    state: 'on',
    attributes: {
      entity_id: [
        'light.bed_light',
        'switch.decorative_lights',
        'media_player.bedroom',
        'input_number.noise_allowance'
      ],
      order: 8,
      friendly_name: 'Bedroom',
      assumed_state: true
    },
    last_changed: '2018-07-19T11:33:15.736625+00:00',
    last_updated: '2018-07-19T11:33:15.736625+00:00',
  },
  'group.kitchen': {
    entity_id: 'group.kitchen',
    state: 'on',
    attributes: {
      entity_id: [
        'light.kitchen_lights',
        'cover.kitchen_window',
        'lock.kitchen_door'
      ],
      order: 8,
      friendly_name: 'Kitchen'
    },
    last_changed: '2018-07-19T10:44:46.455730+00:00',
    last_updated: '2018-07-19T10:44:46.455730+00:00',
  },
  'group.doors': {
    entity_id: 'group.doors',
    state: 'locked',
    attributes: {
      entity_id: [
        'lock.front_door',
        'lock.kitchen_door',
        'garage_door.right_garage_door',
        'garage_door.left_garage_door'
      ],
      order: 8,
      friendly_name: 'Doors'
    },
    last_changed: '2018-07-19T10:44:46.509528+00:00',
    last_updated: '2018-07-19T10:44:46.509528+00:00',
  },
  'group.automations': {
    entity_id: 'group.automations',
    state: 'off',
    attributes: {
      entity_id: [
        'input_select.who_cooks',
        'input_boolean.notify'
      ],
      order: 8,
      friendly_name: 'Automations'
    },
    last_changed: '2018-07-19T10:44:46.509900+00:00',
    last_updated: '2018-07-19T10:44:46.509900+00:00',
  },
  'group.people': {
    entity_id: 'group.people',
    state: 'not_home',
    attributes: {
      entity_id: [
        'device_tracker.demo_anne_therese',
        'device_tracker.demo_home_boy',
        'device_tracker.demo_paulus'
      ],
      order: 8,
      friendly_name: 'People'
    },
    last_changed: '2018-07-19T10:44:46.510172+00:00',
    last_updated: '2018-07-19T10:44:46.510172+00:00',
  },
  'group.downstairs': {
    entity_id: 'group.downstairs',
    state: 'on',
    attributes: {
      entity_id: [
        'group.living_room',
        'group.kitchen',
        'scene.romantic_lights',
        'cover.kitchen_window',
        'cover.living_room_window',
        'group.doors',
        'climate.ecobee'
      ],
      order: 8,
      view: true,
      friendly_name: 'Downstairs',
      hidden: true
    },
    last_changed: '2018-07-19T10:44:46.510448+00:00',
    last_updated: '2018-07-19T10:44:46.510448+00:00',
  },
  'history_graph.recent_switches': {
    entity_id: 'history_graph.recent_switches',
    state: 'unknown',
    attributes: {
      hours_to_show: 1,
      refresh: 60,
      entity_id: [
        'switch.ac',
        'switch.decorative_lights'
      ],
      friendly_name: 'Recent Switches'
    },
    last_changed: '2018-07-19T10:44:46.512351+00:00',
    last_updated: '2018-07-19T10:44:46.512351+00:00'
  },
  'scene.switch_on_and_off': {
    entity_id: 'scene.switch_on_and_off',
    state: 'scening',
    attributes: {
      entity_id: [
        'switch.ac',
        'switch.decorative_lights'
      ],
      friendly_name: 'Switch on and off'
    },
    last_changed: '2018-07-19T10:44:46.512674+00:00',
    last_updated: '2018-07-19T10:44:46.512674+00:00',
  },
  'scene.romantic_lights': {
    entity_id: 'scene.romantic_lights',
    state: 'scening',
    attributes: {
      entity_id: [
        'light.bed_light',
        'light.ceiling_lights'
      ],
      friendly_name: 'Romantic lights'
    },
    last_changed: '2018-07-19T10:44:46.512985+00:00',
    last_updated: '2018-07-19T10:44:46.512985+00:00',
  },
  'configurator.philips_hue': {
    entity_id: 'configurator.philips_hue',
    state: 'configure',
    attributes: {
      configure_id: '4596919600-1',
      fields: [
        {
          id: 'username',
          name: 'Username'
        }
      ],
      friendly_name: 'Philips Hue',
      entity_picture: null,
      description: 'Press the button on the bridge to register Philips Hue with Home Assistant.\n\n![Description image](/static/images/config_philips_hue.jpg)',
      submit_caption: 'I have pressed the button'
    },
    last_changed: '2018-07-19T10:44:46.515160+00:00',
    last_updated: '2018-07-19T10:44:46.515160+00:00',
  }
};
