import { convertEntities } from "../../../../src/fake_data/entity";
import { DemoConfig } from "../types";

export const demoEntitiesArsaboo: DemoConfig["entities"] = (localize) =>
  convertEntities({
    "zone.home": {
      entity_id: "zone.home",
      state: "zoning",
      attributes: {
        hidden: true,
        latitude: 52.3631339,
        longitude: 4.8903147,
        radius: 200,
        friendly_name: "Home",
        icon: "hademo:home",
      },
    },
    "zone.uva": {
      entity_id: "zone.buckhead",
      state: "zoning",
      attributes: {
        hidden: true,
        radius: 400,
        friendly_name: "UvA",
        icon: "hademo:school",
        latitude: 52.3558182,
        longitude: 4.9535376,
      },
    },
    "person.arsaboo": {
      entity_id: "person.arsaboo",
      state: "not_home",
      attributes: {
        radius: 50,
        friendly_name: "Arsaboo",
        latitude: 52.3579946,
        longitude: 4.8664597,
        entity_picture: "/assets/arsaboo/images/arsaboo.jpg",
      },
    },
    "person.melody": {
      entity_id: "person.melody",
      state: "not_home",
      attributes: {
        radius: 50,
        friendly_name: "Melody",
        latitude: 52.3408927,
        longitude: 4.8711073,
        entity_picture: "/assets/arsaboo/images/melody.jpg",
      },
    },
    "sensor.livingroom_temp_rounded": {
      entity_id: "sensor.livingroom_temp_rounded",
      state: "21",
      attributes: {
        friendly_name: "Living room temperature",
      },
    },
    "sensor.study_temp_rounded": {
      entity_id: "sensor.study_temp_rounded",
      state: "23",
      attributes: {
        friendly_name: "Study temperature",
      },
    },
    "sensor.living_room": {
      entity_id: "sensor.living_room",
      state: "YouTube",
      attributes: {
        friendly_name: "Harmony",
        entity_picture: "/assets/arsaboo/icons/Harmony.png",
      },
    },
    "sensor.total_tv_time": {
      entity_id: "sensor.total_tv_time",
      state: "0.42",
      attributes: {
        value: "25m",
        unit_of_measurement: "h",
        friendly_name: localize(
          "ui.panel.page-demo.config.arsaboo.labels.total_tv_time"
        ),
        icon: "hademo:chart-line",
      },
    },
    "climate.upstairs": {
      entity_id: "climate.upstairs",
      state: "auto",
      attributes: {
        current_temperature: 22,
        min_temp: 15,
        max_temp: 30,
        temperature: null,
        target_temp_high: 24,
        target_temp_low: 20,
        fan_mode: "auto",
        fan_modes: ["auto", "on"],
        hvac_modes: ["auto", "cool", "heat", "off"],
        aux_heat: "off",
        actual_humidity: 30,
        fan: "on",
        operation: "fan",
        fan_min_on_time: 10,
        friendly_name: localize(
          "ui.panel.page-demo.config.arsaboo.names.upstairs"
        ),
        supported_features: 27,
        preset_mode: "away",
        preset_modes: ["home", "away", "eco", "sleep"],
      },
    },
    "input_boolean.abodeupdate": {
      entity_id: "input_boolean.abodeupdate",
      state: "on",
      attributes: {
        friendly_name: "Abode Updates",
        icon: "hademo:security",
      },
    },
    "input_boolean.tv": {
      entity_id: "input_boolean.tv",
      state: "off",
      attributes: {
        friendly_name: "TV",
        icon: "hademo:television",
      },
    },
    "input_boolean.homeautomation": {
      entity_id: "input_boolean.homeautomation",
      state: "on",
      attributes: {
        friendly_name: "Home Automation",
        icon: "hass:home-automation",
      },
    },
    "input_boolean.tvtime": {
      entity_id: "input_boolean.tvtime",
      state: "on",
      attributes: {
        friendly_name: "TV Time",
        icon: "hademo:television-guide",
      },
    },
    "input_select.livingroomharmony": {
      entity_id: "input_select.livingroomharmony",
      state: "YouTube",
      attributes: {
        options: [
          "PowerOff",
          "Watch Fire TV",
          "YouTube",
          "SATV",
          "Watch Apple TV",
        ],
        friendly_name: localize(
          "ui.panel.page-demo.config.arsaboo.labels.activity"
        ),
        icon: "hademo:remote",
      },
    },
    "input_select.hdmiswitcher": {
      entity_id: "input_select.hdmiswitcher",
      state: "Shield",
      attributes: {
        options: ["AppleTV", "FireTV", "Shield"],
        friendly_name: localize(
          "ui.panel.page-demo.config.arsaboo.labels.hdmi_switcher"
        ),
        icon: "hademo:remote",
      },
    },
    "input_select.hdmiinput": {
      entity_id: "input_select.hdmiinput",
      state: "InputHdmi4",
      attributes: {
        options: ["InputHdmi1", "InputHdmi2", "InputHDMI3", "InputHdmi4"],
        friendly_name: localize(
          "ui.panel.page-demo.config.arsaboo.labels.hdmi_input"
        ),
        icon: "hademo:remote",
      },
    },
    "input_number.harmonyvolume": {
      entity_id: "input_number.harmonyvolume",
      state: "18.0",
      attributes: {
        initial: 30,
        min: 1,
        max: 100,
        step: 1,
        mode: "slider",
        friendly_name: localize(
          "ui.panel.page-demo.config.arsaboo.labels.volume"
        ),
        icon: "hademo:volume-high",
      },
    },
    "script.tv_off": {
      entity_id: "script.tv_off",
      state: "off",
      attributes: {
        last_triggered: null,
        friendly_name: localize(
          "ui.panel.page-demo.config.arsaboo.labels.turn_tv_off"
        ),
      },
    },
    "sensor.usdinr": {
      entity_id: "sensor.usdinr",
      state: "71.25",
      attributes: {
        attribution: "Stock market information provided by Alpha Vantage",
        from: "USD",
        to: "INR",
        unit_of_measurement: "INR",
        friendly_name: "USDINR",
        icon: "hademo:currency-usd",
      },
    },
    "sensor.study_temp": {
      entity_id: "sensor.study_temp",
      state: "20.9",
      attributes: {
        unit_of_measurement: "°C",
        device_class: "temperature",
        friendly_name: localize(
          "ui.panel.page-demo.config.arsaboo.names.temperature_study"
        ),
        icon: "hademo:thermometer",
      },
    },
    "cover.garagedoor": {
      entity_id: "cover.garagedoor",
      state: "closed",
      attributes: {
        friendly_name: "Garage Door",
        icon: "hademo:garage",
        supported_features: 11,
        homebridge_cover_type: "garage_door",
      },
    },

    "light.living_room_lights": {
      entity_id: "light.living_room_lights",
      state: "off",
      attributes: {
        min_mireds: 111,
        max_mireds: 400,
        friendly_name: "Living Room Lights",
        supported_features: 55,
      },
    },
    "switch.security_armed": {
      entity_id: "switch.security_armed",
      state: "off",
      attributes: {
        friendly_name: "Home Security Arm",
      },
    },
    "light.kitchen_lights": {
      entity_id: "light.kitchen_lights",
      state: "off",
      attributes: {
        friendly_name: "Kitchen lights",
        supported_features: 1,
      },
    },

    "sensor.plexspy": {
      entity_id: "sensor.plexspy",
      state: "0",
      attributes: {
        unit_of_measurement: "Watching",
        friendly_name: "PlexSpy",
      },
    },
    "binary_sensor.ring_front_door_ding": {
      entity_id: "binary_sensor.ring_front_door_ding",
      state: "off",
      attributes: {
        attribution: "Data provided by Ring.com",
        device_id: "e04f434dca02",
        firmware: "Up to Date",
        timezone: "America/New_York",
        friendly_name: "Front Door Ding",
        device_class: "occupancy",
      },
    },
    "sensor.ring_front_door_last_motion": {
      entity_id: "sensor.ring_front_door_last_motion",
      state: "13:21",
      attributes: {
        attribution: "Data provided by Ring.com",
        answered: false,
        friendly_name: "Front Door Last Motion",
        icon: "hademo:history",
      },
    },
    "camera.patio": {
      entity_id: "camera.patio",
      state: "streaming",
      attributes: {
        access_token:
          "cbd8dfac9efb441f19168e271cb8629b0372d0c1f721353394b23ed0202013b0",
        motion_detection: true,
        friendly_name: "Patio",
        entity_picture: "/assets/arsaboo/images/camera.patio.jpg",
        supported_features: 0,
      },
    },
    "camera.porch": {
      entity_id: "camera.porch",
      state: "streaming",
      attributes: {
        access_token:
          "479b332e0a7cad4c58e0fb98a1ecb7942e3b225190adb93a1341edfa7daf45b0",
        motion_detection: true,
        friendly_name: "Porch",
        entity_picture: "/assets/arsaboo/images/camera.porch.jpg",
        supported_features: 0,
      },
    },
    "camera.backyard": {
      entity_id: "camera.backyard",
      state: "streaming",
      attributes: {
        access_token:
          "9381b2e4edd1bb21e868e2193f5d132a5fae153ce4f458451d979a02712b4642",
        motion_detection: true,
        friendly_name: "Backyard",
        entity_picture: "/assets/arsaboo/images/camera.backyard.jpg",
        supported_features: 0,
      },
    },
    "camera.driveway": {
      entity_id: "camera.driveway",
      state: "streaming",
      attributes: {
        access_token:
          "ac38bf88c2c5896eed66ae15739a3e726677f92d79e0d57f83f726ac28bda746",
        motion_detection: true,
        friendly_name: "Driveway",
        entity_picture: "/assets/arsaboo/images/camera.driveway.jpg",
        supported_features: 0,
      },
    },
    "alarm_control_panel.abode_alarm": {
      entity_id: "alarm_control_panel.abode_alarm",
      state: "disarmed",
      attributes: {
        code_format: null,
        changed_by: null,
        attribution: "Data provided by goabode.com",
        device_id: "area_1",
        battery_backup: false,
        cellular_backup: false,
        friendly_name: "Abode Alarm",
        icon: "hademo:security",
        entity_picture: "/assets/arsaboo/icons/Abode.jpg",
      },
    },
    "binary_sensor.ring_front_door_motion": {
      entity_id: "binary_sensor.ring_front_door_motion",
      state: "off",
      attributes: {
        attribution: "Data provided by Ring.com",
        device_id: "e04f434dca02",
        firmware: "Up to Date",
        timezone: "America/New_York",
        friendly_name: "Front Door Motion",
        device_class: "motion",
      },
    },
    "binary_sensor.motion_sensor_158d00016daecc": {
      entity_id: "binary_sensor.motion_sensor_158d00016daecc",
      state: "off",
      attributes: {
        "No motion since": "120",
        battery_level: 43,
        friendly_name: "Living Room Occupancy",
        device_class: "motion",
      },
    },
    "binary_sensor.door_window_sensor_158d0001bf26df": {
      entity_id: "binary_sensor.door_window_sensor_158d0001bf26df",
      state: "off",
      attributes: {
        "Open since": 0,
        battery_level: 45,
        friendly_name: "Garage Entry Door",
        device_class: "door",
      },
    },
    "binary_sensor.motion_sensor_158d0001a1f2ab": {
      entity_id: "binary_sensor.motion_sensor_158d0001a1f2ab",
      state: "off",
      attributes: {
        "No motion since": 0,
        battery_level: 49,
        friendly_name: "Guest Room Occupancy",
        device_class: "motion",
      },
    },

    "binary_sensor.front_door": {
      entity_id: "binary_sensor.front_door",
      state: "off",
      attributes: {
        attribution: "Data provided by goabode.com",
        device_id: "RF:005e8810",
        battery_low: false,
        no_response: false,
        device_type: "Door Contact",
        friendly_name: "Front Door",
        device_class: "door",
      },
    },
    "binary_sensor.back_door": {
      entity_id: "binary_sensor.back_door",
      state: "off",
      attributes: {
        attribution: "Data provided by goabode.com",
        device_id: "RF:005c7110",
        battery_low: false,
        no_response: false,
        device_type: "Door Contact",
        friendly_name: "Back Door",
        device_class: "door",
      },
    },
    "media_player.family_room_2": {
      entity_id: "media_player.family_room_2",
      state: "playing",
      attributes: {
        volume_level: 0.18,
        is_volume_muted: false,
        media_content_type: "music",
        media_duration: 300,
        media_position: 0,
        media_position_updated_at: new Date(
          // 23 seconds in
          new Date().getTime() - 23000
        ).toISOString(),
        media_title: "I Wasn't Born To Follow",
        media_artist: "The Byrds",
        media_album_name: "The Notorious Byrd Brothers",
        source_list: [
          "Bollywood Hindi Hits",
          "Bollywood Radio and Beyond",
          "Bolywood Instrumental - Hungama Radio",
          "Classic Bollywood Radio",
          "Contemporary Bollywood Radio",
          "Hindi Bollywood Hits Radio",
          "It's A Party",
          "Lata Mangeshkar",
          "NPR Program Stream",
          "Radio HSL",
          "Retro 70s and 80s",
        ],
        shuffle: false,
        sonos_group: ["media_player.family_room_2"],
        night_sound: false,
        speech_enhance: false,
        friendly_name: localize(
          "ui.panel.page-demo.config.arsaboo.names.family_room"
        ),
        entity_picture: "/assets/arsaboo/images/media_player_family_room.jpg",
        supported_features: 64063,
      },
    },
    "sensor.ring_front_door_last_ding": {
      entity_id: "sensor.ring_front_door_last_ding",
      state: "06:44",
      attributes: {
        attribution: "Data provided by Ring.com",
        answered: false,
        friendly_name: "Front Door Last Ding",
        icon: "hademo:history",
      },
    },
    "light.lifx5": {
      entity_id: "light.lifx5",
      state: "on",
      attributes: {
        min_mireds: 111,
        max_mireds: 400,
        friendly_name: "Garage lights",
        supported_features: 55,
      },
    },
    "sensor.alok_to_home": {
      entity_id: "sensor.alok_to_home",
      state: "41",
      attributes: {
        destination_addresses: ["XYZ"],
        origin_addresses: ["XYZ"],
        status: "OK",
        mode: "driving",
        units: "imperial",
        duration_in_traffic: "41 mins",
        duration: "44 mins",
        distance: "34.3 mi",
        unit_of_measurement: "min",
        friendly_name: localize(
          "ui.panel.page-demo.config.arsaboo.labels.commute_home"
        ),
        icon: "hademo:car",
      },
    },
    "sensor.morning_commute": {
      entity_id: "sensor.morning_commute",
      state: "37",
      attributes: {
        destination_addresses: ["XYZ"],
        origin_addresses: ["XYZ"],
        status: "OK",
        mode: "driving",
        units: "imperial",
        duration_in_traffic: "37 mins",
        duration: "37 mins",
        distance: "30.2 mi",
        unit_of_measurement: "min",
        friendly_name: localize(
          "ui.panel.page-demo.config.arsaboo.labels.morning_commute"
        ),
        icon: "hademo:car",
      },
    },
    "switch.driveway": {
      entity_id: "switch.driveway",
      state: "off",
      attributes: {
        friendly_name: "Driveway Light",
      },
    },
    "switch.wemoporch": {
      entity_id: "switch.wemoporch",
      state: "off",
      attributes: {
        friendly_name: "Porch Lights",
      },
    },
  });
