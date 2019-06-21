import { convertEntities } from "../../../../src/fake_data/entity";
import { DemoConfig } from "../types";

export const demoEntitiesArsaboo: DemoConfig["entities"] = (localize) =>
  convertEntities({
    "zone.home": {
      entity_id: "zone.home",
      state: "zoning",
      attributes: {
        hidden: true,
        radius: 200,
        friendly_name: "Home",
        icon: "hademo:home",
      },
      last_changed: "2019-01-22T16:59:56.243651+00:00",
      last_updated: "2019-01-22T16:59:56.243651+00:00",
      context: { id: "a1b962da6bc54aad9d8e921e47c7ba87", user_id: null },
    },
    "zone.buckhead": {
      entity_id: "zone.buckhead",
      state: "zoning",
      attributes: {
        hidden: true,
        radius: 200,
        friendly_name: "Buckhead",
        icon: "hademo:school",
      },
      last_changed: "2019-01-22T16:59:56.243765+00:00",
      last_updated: "2019-01-22T16:59:56.243765+00:00",
      context: { id: "ed52190b694c458e8dc5bb733fc553ee", user_id: null },
    },
    "zone.downtown": {
      entity_id: "zone.downtown",
      state: "zoning",
      attributes: {
        hidden: true,
        radius: 200,
        friendly_name: "Downtown",
        icon: "hademo:school",
      },
      last_changed: "2019-01-22T16:59:56.243873+00:00",
      last_updated: "2019-01-22T16:59:56.243873+00:00",
      context: { id: "9114964fdecd424ca96f60cfa8864422", user_id: null },
    },
    "sensor.livingroom_temp_rounded": {
      entity_id: "sensor.livingroom_temp_rounded",
      state: "21",
      attributes: {
        friendly_name: "Living room temperature",
      },
      last_changed: "2019-01-22T18:23:58.615703+00:00",
      last_updated: "2019-01-22T18:23:58.615703+00:00",
      context: { id: "d8720a928ed645838679c2b5edc5e2fd", user_id: null },
    },
    "sensor.study_temp_rounded": {
      entity_id: "sensor.study_temp_rounded",
      state: "23",
      attributes: {
        friendly_name: "Study temperature",
      },
      last_changed: "2019-01-22T19:17:17.881894+00:00",
      last_updated: "2019-01-22T19:17:17.881894+00:00",
      context: { id: "9e25fd2c4032461f83df3ed778fc031e", user_id: null },
    },
    "sensor.living_room": {
      entity_id: "sensor.living_room",
      state: "YouTube",
      attributes: {
        friendly_name: "Harmony",
        entity_picture: "/assets/arsaboo/icons/Harmony.png",
      },
      last_changed: "2019-01-22T17:00:14.722625+00:00",
      last_updated: "2019-01-22T17:00:14.722625+00:00",
      context: { id: "8a3e097e681740cca0f82905dd9f84b6", user_id: null },
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
      last_changed: "2019-01-22T17:00:14.938049+00:00",
      last_updated: "2019-01-22T17:00:14.938049+00:00",
      context: { id: "22b23e84bd7d4acfb97653fbb68ad6ef", user_id: null },
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
        fan_list: ["auto", "on"],
        operation_mode: "auto",
        operation_list: ["auto", "auxHeatOnly", "cool", "heat", "off"],
        hold_mode: null,
        away_mode: "off",
        aux_heat: "off",
        actual_humidity: 30,
        fan: "on",
        climate_mode: "Day",
        operation: "fan",
        climate_list: ["Away", "Sleep", "Day", "Home"],
        fan_min_on_time: 10,
        friendly_name: localize(
          "ui.panel.page-demo.config.arsaboo.names.upstairs"
        ),
        supported_features: 3575,
      },
      last_changed: "2019-01-22T16:59:56.810867+00:00",
      last_updated: "2019-01-22T19:33:14.146114+00:00",
      context: { id: "211635d7bddb468d927d18cee9f795cf", user_id: null },
    },
    "input_boolean.abodeupdate": {
      entity_id: "input_boolean.abodeupdate",
      state: "on",
      attributes: {
        friendly_name: "Abode Updates",
        icon: "hademo:security",
        templates: {
          icon_color:
            "if (state === 'on') return 'rgb(251, 210, 41)'; return 'rgb(54, 95, 140)';\n",
        },
        emulated_hue_hidden: false,
      },
      last_changed: "2019-01-22T16:59:56.881638+00:00",
      last_updated: "2019-01-22T16:59:56.881638+00:00",
      context: { id: "7565c5becbca495c91550822d3284249", user_id: null },
    },
    "input_boolean.tv": {
      entity_id: "input_boolean.tv",
      state: "off",
      attributes: {
        friendly_name: "TV",
        icon: "hademo:television",
        templates: {
          icon_color:
            "if (state === 'on') return 'rgb(251, 210, 41)'; return 'rgb(54, 95, 140)';\n",
        },
      },
      last_changed: "2019-01-22T16:59:56.882562+00:00",
      last_updated: "2019-01-22T16:59:56.882562+00:00",
      context: { id: "0ac79c8674b242be968d08791e6b5932", user_id: null },
    },
    "input_boolean.homeautomation": {
      entity_id: "input_boolean.homeautomation",
      state: "on",
      attributes: {
        friendly_name: "Home Automation",
        icon: "hass:home-automation",
        templates: {
          icon_color:
            "if (state === 'on') return 'rgb(251, 210, 41)'; return 'rgb(54, 95, 140)';\n",
        },
      },
      last_changed: "2019-01-22T16:59:56.883106+00:00",
      last_updated: "2019-01-22T16:59:56.883106+00:00",
      context: { id: "c6eb55b9528c49f181f624b38c9e2744", user_id: null },
    },
    "input_boolean.tvtime": {
      entity_id: "input_boolean.tvtime",
      state: "on",
      attributes: {
        friendly_name: "TV Time",
        icon: "hademo:television-guide",
        templates: {
          icon:
            "if (state === 'on') return 'hademo:television-classic'; return 'hademo:television-classic-off';\n",
          icon_color:
            "if (state === 'on') return 'rgb(251, 210, 41)'; return 'rgb(54, 95, 140)';\n",
        },
      },
      last_changed: "2019-01-22T16:59:56.883309+00:00",
      last_updated: "2019-01-22T16:59:56.883309+00:00",
      context: { id: "5fdf8af8eb214e65ade4e3aeff3dd34b", user_id: null },
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
      last_changed: "2019-01-22T16:59:56.884366+00:00",
      last_updated: "2019-01-22T16:59:56.884366+00:00",
      context: { id: "0f58b582c976468da868054edf770f92", user_id: null },
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
      last_changed: "2019-01-22T16:59:56.884597+00:00",
      last_updated: "2019-01-22T16:59:56.884597+00:00",
      context: { id: "20071b60a5a84a10b48a218f1cad67e7", user_id: null },
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
      last_changed: "2019-01-22T16:59:56.884850+00:00",
      last_updated: "2019-01-22T16:59:56.884850+00:00",
      context: { id: "d807dee60854436f81ef374ab8267bd1", user_id: null },
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
      last_changed: "2019-01-22T17:00:16.104666+00:00",
      last_updated: "2019-01-22T17:00:16.104666+00:00",
      context: { id: "46df627202ed4c3981ad140e06bcc578", user_id: null },
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
      last_changed: "2019-01-22T16:59:57.074073+00:00",
      last_updated: "2019-01-22T16:59:57.074073+00:00",
      context: { id: "618e16fb9dba4dde9c40feda1f10bcc9", user_id: null },
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
      last_changed: "2019-01-22T18:25:11.582558+00:00",
      last_updated: "2019-01-22T18:25:11.582558+00:00",
      context: { id: "7737cf1420d241d8afb3f016179c133c", user_id: null },
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
      last_changed: "2019-01-22T19:31:05.399638+00:00",
      last_updated: "2019-01-22T19:31:05.399638+00:00",
      context: { id: "6ce1bded3a1c4601a4bc8e8c3823cc9f", user_id: null },
    },
    "light.master_lights": {
      entity_id: "light.master_lights",
      state: "off",
      attributes: {
        min_mireds: 153,
        max_mireds: 500,
        friendly_name: "Master Lights",
        supported_features: 63,
      },
      last_changed: "2019-01-22T16:59:57.423884+00:00",
      last_updated: "2019-01-22T16:59:57.423884+00:00",
      context: { id: "b2f91c5772a346b7a24cb28386276cca", user_id: null },
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
      last_changed: "2019-01-22T17:00:05.573457+00:00",
      last_updated: "2019-01-22T17:00:05.573457+00:00",
      context: { id: "bbcc2a67b73a42a280f905c5de1d120d", user_id: null },
    },
    "switch.security_armed": {
      entity_id: "switch.security_armed",
      state: "off",
      attributes: {
        friendly_name: "Home Security Arm",
      },
      last_changed: "2019-01-22T19:29:19.871240+00:00",
      last_updated: "2019-01-22T19:29:19.871240+00:00",
      context: { id: "2d370c236dc84c6ba4510fa9b537d926", user_id: null },
    },
    "light.kitchen_lights": {
      entity_id: "light.kitchen_lights",
      state: "off",
      attributes: {
        friendly_name: "Kitchen lights",
        supported_features: 1,
        emulated_hue_hidden: false,
        emulated_hue_name: "Kitchen lights",
      },
      last_changed: "2019-01-22T16:59:57.294651+00:00",
      last_updated: "2019-01-22T16:59:57.294651+00:00",
      context: { id: "84a69e03a3b14de29e6753fb10889da7", user_id: null },
    },
    "light.hue_color_lamp_1": {
      entity_id: "light.hue_color_lamp_1",
      state: "on",
      attributes: {
        min_mireds: 153,
        max_mireds: 500,
        friendly_name: localize("ui.panel.page-demo.config.arsaboo.names.left"),
        supported_features: 63,
      },
      last_changed: "2019-01-22T16:59:57.421788+00:00",
      last_updated: "2019-01-22T16:59:57.421788+00:00",
      context: { id: "573a69eccae942d5a4b9870c3585429f", user_id: null },
    },
    "light.hue_color_lamp_2": {
      entity_id: "light.hue_color_lamp_2",
      state: "off",
      attributes: {
        min_mireds: 153,
        max_mireds: 500,
        friendly_name: localize(
          "ui.panel.page-demo.config.arsaboo.names.right"
        ),
        supported_features: 63,
      },
      last_changed: "2019-01-22T16:59:57.422442+00:00",
      last_updated: "2019-01-22T16:59:57.422442+00:00",
      context: { id: "19ae7cae5143419991ae92a7a3bda423", user_id: null },
    },
    "light.hue_color_lamp_3": {
      entity_id: "light.hue_color_lamp_3",
      state: "on",
      attributes: {
        min_mireds: 153,
        max_mireds: 500,
        friendly_name: localize(
          "ui.panel.page-demo.config.arsaboo.names.mirror"
        ),
        supported_features: 63,
      },
      last_changed: "2019-01-22T16:59:57.423068+00:00",
      last_updated: "2019-01-22T16:59:57.423068+00:00",
      context: { id: "75d3c44287804191bdd86b967125d7a9", user_id: null },
    },
    "sensor.plexspy": {
      entity_id: "sensor.plexspy",
      state: "0",
      attributes: {
        unit_of_measurement: "Watching",
        friendly_name: "PlexSpy",
      },
      last_changed: "2019-01-22T17:00:00.185247+00:00",
      last_updated: "2019-01-22T17:00:00.185247+00:00",
      context: { id: "07a3c87af6c54b35914c529acf4e60bb", user_id: null },
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
      last_changed: "2019-01-22T17:00:03.255653+00:00",
      last_updated: "2019-01-22T18:24:03.677589+00:00",
      context: { id: "d7508c32f2c346d5950e725b422d6695", user_id: null },
    },
    "sensor.ring_front_door_last_motion": {
      entity_id: "sensor.ring_front_door_last_motion",
      state: "13:21",
      attributes: {
        attribution: "Data provided by Ring.com",
        device_id: "e04f434dca02",
        firmware: "Up to Date",
        kind: "lpd_v2",
        timezone: "America/New_York",
        type: "doorbots",
        wifi_name: "RingOfSecurity-hUrGKNlhR",
        created_at: "2019-01-22T13:21:03-05:00",
        answered: false,
        recording_status: "ready",
        category: "motion",
        friendly_name: "Front Door Last Motion",
        icon: "hademo:history",
      },
      last_changed: "2019-01-22T18:22:33.829681+00:00",
      last_updated: "2019-01-22T18:23:04.162733+00:00",
      context: { id: "2ca6046f7da2486988032576da8dc475", user_id: null },
    },
    "camera.patio": {
      entity_id: "camera.patio",
      state: "streaming",
      attributes: {
        access_token:
          "cbd8dfac9efb441f19168e271cb8629b0372d0c1f721353394b23ed0202013b0",
        motion_detection: true,
        friendly_name: "Patio",
        entity_picture:
          "/api/camera_proxy/camera.patio?token=cbd8dfac9efb441f19168e271cb8629b0372d0c1f721353394b23ed0202013b0",
        supported_features: 0,
      },
      last_changed: "2019-01-22T17:00:03.259908+00:00",
      last_updated: "2019-01-22T19:35:30.063163+00:00",
      context: { id: "dc4051275fa84f9ba9a6db3190d07992", user_id: null },
    },
    "camera.porch": {
      entity_id: "camera.porch",
      state: "streaming",
      attributes: {
        access_token:
          "479b332e0a7cad4c58e0fb98a1ecb7942e3b225190adb93a1341edfa7daf45b0",
        motion_detection: true,
        friendly_name: "Porch",
        entity_picture:
          "/api/camera_proxy/camera.porch?token=479b332e0a7cad4c58e0fb98a1ecb7942e3b225190adb93a1341edfa7daf45b0",
        supported_features: 0,
      },
      last_changed: "2019-01-22T19:32:38.491230+00:00",
      last_updated: "2019-01-22T19:35:30.064062+00:00",
      context: { id: "4f09dc684f6d4a87990c8b821cf0f49a", user_id: null },
    },
    "camera.backyard": {
      entity_id: "camera.backyard",
      state: "streaming",
      attributes: {
        access_token:
          "9381b2e4edd1bb21e868e2193f5d132a5fae153ce4f458451d979a02712b4642",
        motion_detection: true,
        friendly_name: "Backyard",
        entity_picture:
          "/api/camera_proxy/camera.backyard?token=9381b2e4edd1bb21e868e2193f5d132a5fae153ce4f458451d979a02712b4642",
        supported_features: 0,
      },
      last_changed: "2019-01-22T17:00:03.261698+00:00",
      last_updated: "2019-01-22T19:35:30.064857+00:00",
      context: { id: "010e1d23a42b4218a90c43c20cffa71f", user_id: null },
    },
    "camera.driveway": {
      entity_id: "camera.driveway",
      state: "streaming",
      attributes: {
        access_token:
          "ac38bf88c2c5896eed66ae15739a3e726677f92d79e0d57f83f726ac28bda746",
        motion_detection: true,
        friendly_name: "Driveway",
        entity_picture:
          "/api/camera_proxy/camera.driveway?token=ac38bf88c2c5896eed66ae15739a3e726677f92d79e0d57f83f726ac28bda746",
        supported_features: 0,
      },
      last_changed: "2019-01-22T19:32:38.618521+00:00",
      last_updated: "2019-01-22T19:35:30.065677+00:00",
      context: { id: "ed8e123e97994bf1b3798bb7c8d7bb85", user_id: null },
    },
    "light.gateway_light_34ce00813670": {
      entity_id: "light.gateway_light_34ce00813670",
      state: "off",
      attributes: {
        friendly_name: localize(
          "ui.panel.page-demo.config.arsaboo.names.hallway"
        ),
        supported_features: 17,
        emulated_hue_hidden: false,
      },
      last_changed: "2019-01-22T17:00:03.343398+00:00",
      last_updated: "2019-01-22T17:00:03.343398+00:00",
      context: { id: "395a958263074e9eaebb582be34e46db", user_id: null },
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
      last_changed: "2019-01-22T19:29:19.864324+00:00",
      last_updated: "2019-01-22T19:29:19.864324+00:00",
      context: { id: "562080ae942046f0a9f0a9959bd493e8", user_id: null },
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
      last_changed: "2019-01-22T18:24:14.683620+00:00",
      last_updated: "2019-01-22T18:24:14.683620+00:00",
      context: { id: "99bd1f8a0ef848b39293c846d3cf9ff4", user_id: null },
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
      last_changed: "2019-01-22T19:36:42.441431+00:00",
      last_updated: "2019-01-22T19:36:42.441431+00:00",
      context: { id: "95e6019573da458dac144f521517ce9f", user_id: null },
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
      last_changed: "2019-01-22T19:31:03.412180+00:00",
      last_updated: "2019-01-22T19:31:03.412180+00:00",
      context: { id: "9cc9a481b6be439c93856b347402e4ac", user_id: null },
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
      last_changed: "2019-01-22T17:00:03.630369+00:00",
      last_updated: "2019-01-22T17:00:03.630369+00:00",
      context: { id: "2acd91071ed2421a81cdb862af6b03db", user_id: null },
    },
    "binary_sensor.water_leak_sensor_158d0001d77800": {
      entity_id: "binary_sensor.water_leak_sensor_158d0001d77800",
      state: "off",
      attributes: {
        battery_level: 41,
        friendly_name: "Laundry Water Leak",
        device_class: "moisture",
      },
      last_changed: "2019-01-22T17:00:03.632708+00:00",
      last_updated: "2019-01-22T17:00:03.632708+00:00",
      context: { id: "252f80524c284844a9e47013c0f94ada", user_id: null },
    },
    "binary_sensor.motion_sensor_158d00016c53bf": {
      entity_id: "binary_sensor.motion_sensor_158d00016c53bf",
      state: "off",
      attributes: {
        "No motion since": 0,
        battery_level: 43,
        friendly_name: "Master Occupancy",
        device_class: "motion",
      },
      last_changed: "2019-01-22T17:00:03.635223+00:00",
      last_updated: "2019-01-22T17:00:03.635223+00:00",
      context: { id: "5c112c0a7a91492ba1d7eac30ed4ecf5", user_id: null },
    },
    "binary_sensor.motion_sensor_158d00016612af": {
      entity_id: "binary_sensor.motion_sensor_158d00016612af",
      state: "off",
      attributes: {
        "No motion since": 0,
        battery_level: 41,
        friendly_name: "Upstairs Occupancy",
        device_class: "motion",
      },
      last_changed: "2019-01-22T17:00:03.636514+00:00",
      last_updated: "2019-01-22T17:00:03.636514+00:00",
      context: { id: "fe418536af56428e9e8ab3724580e631", user_id: null },
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
      last_changed: "2019-01-22T19:31:27.023892+00:00",
      last_updated: "2019-01-22T19:31:27.023892+00:00",
      context: { id: "6e10573f7d7b470ea0a74f2d00475800", user_id: null },
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
      last_changed: "2019-01-22T17:00:03.642051+00:00",
      last_updated: "2019-01-22T17:00:03.642051+00:00",
      context: { id: "a2e7acd74b8646d2b32e40d7a1db4cf1", user_id: null },
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
        entity_picture:
          "/api/media_player_proxy/media_player.family_room_2?token=be41a86e2a360761d67c36a010b09654b730deec092016ee92aafef79b1978ff&cache=e03d22fb103202e7",
        supported_features: 64063,
      },
      last_changed: "2019-01-22T17:00:04.802095+00:00",
      last_updated: "2019-01-22T17:00:04.802095+00:00",
      context: { id: "a4dfb3301f2149758368952e080d3247", user_id: null },
    },
    "sensor.ring_front_door_last_ding": {
      entity_id: "sensor.ring_front_door_last_ding",
      state: "06:44",
      attributes: {
        attribution: "Data provided by Ring.com",
        device_id: "e04f434dca02",
        firmware: "Up to Date",
        kind: "lpd_v2",
        timezone: "America/New_York",
        type: "doorbots",
        wifi_name: "RingOfSecurity-hUrGKNlhR",
        created_at: "2019-01-22T06:44:31-05:00",
        answered: false,
        recording_status: "ready",
        category: "ding",
        friendly_name: "Front Door Last Ding",
        icon: "hademo:history",
      },
      last_changed: "2019-01-22T17:00:04.444969+00:00",
      last_updated: "2019-01-22T17:00:04.444969+00:00",
      context: { id: "8ae2198d1fd446f48ebdbcbb10c9bcde", user_id: null },
    },
    "light.lifxnrkitchen": {
      entity_id: "light.lifxnrkitchen",
      state: "off",
      attributes: {
        min_mireds: 111,
        max_mireds: 400,
        friendly_name: "LifxnrKitchen",
        supported_features: 55,
      },
      last_changed: "2019-01-22T17:00:05.570989+00:00",
      last_updated: "2019-01-22T17:00:05.570989+00:00",
      context: { id: "67f4c61e3a354ea99097bd5f43a88490", user_id: null },
    },
    "light.lifx5": {
      entity_id: "light.lifx5",
      state: "on",
      attributes: {
        min_mireds: 111,
        max_mireds: 400,
        friendly_name: "Garage lights",
        supported_features: 55,
        emulated_hue_hidden: false,
        emulated_hue_name: "Garage Lights",
      },
      last_changed: "2019-01-22T17:00:05.580826+00:00",
      last_updated: "2019-01-22T17:00:05.580826+00:00",
      context: { id: "86f413dff85b44a491305279fa7f8939", user_id: null },
    },
    "light.lifxnrguest": {
      entity_id: "light.lifxnrguest",
      state: "off",
      attributes: {
        min_mireds: 111,
        max_mireds: 400,
        friendly_name: localize(
          "ui.panel.page-demo.config.arsaboo.names.patio"
        ),
        supported_features: 55,
      },
      last_changed: "2019-01-22T17:00:05.587119+00:00",
      last_updated: "2019-01-22T17:00:05.587119+00:00",
      context: { id: "8ee6c032fd784171a509a93c7a33197e", user_id: null },
    },
    "light.lifx3": {
      entity_id: "light.lifx3",
      state: "off",
      attributes: {
        min_mireds: 111,
        max_mireds: 400,
        friendly_name: localize(
          "ui.panel.page-demo.config.arsaboo.names.kitchen"
        ),
        supported_features: 55,
      },
      last_changed: "2019-01-22T17:00:05.587973+00:00",
      last_updated: "2019-01-22T17:00:05.587973+00:00",
      context: { id: "8ad5cc04e437477fa495ecf7de36a7b8", user_id: null },
    },
    "sensor.illumination_158d00016c53bf": {
      entity_id: "sensor.illumination_158d00016c53bf",
      state: "10",
      attributes: {
        battery_level: 43,
        unit_of_measurement: "lx",
        friendly_name: "Master Brightness",
        device_class: "illuminance",
        icon: "hademo:brightness-7",
      },
      last_changed: "2019-01-22T19:34:01.373772+00:00",
      last_updated: "2019-01-22T19:34:01.373772+00:00",
      context: { id: "2582b7ad576746b1b3ade68adb64c878", user_id: null },
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
      last_changed: "2019-01-22T17:00:15.963892+00:00",
      last_updated: "2019-01-22T17:00:15.963892+00:00",
      context: { id: "16e423e342274086b26b15de787cea3c", user_id: null },
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
      last_changed: "2019-01-22T17:00:16.142799+00:00",
      last_updated: "2019-01-22T17:00:16.142799+00:00",
      context: { id: "fc0ee1d25cc941ce9ead8a8cefdf3df9", user_id: null },
    },
    "switch.wemoswitch": {
      entity_id: "switch.wemoswitch",
      state: "on",
      attributes: {
        friendly_name: localize("ui.panel.page-demo.config.arsaboo.labels.air"),
      },
      last_changed: "2019-01-22T17:00:22.455617+00:00",
      last_updated: "2019-01-22T17:00:22.455617+00:00",
      context: { id: "d5ddc6e4c88f436ab372934934c8675e", user_id: null },
    },
    "switch.driveway": {
      entity_id: "switch.driveway",
      state: "off",
      attributes: {
        friendly_name: "Driveway Light",
        templates: {
          icon_color:
            "if (state === 'on') return 'rgb(251, 210, 41)'; return 'rgb(54, 95, 140)';\n",
          icon:
            "if (state === 'on') return 'hademo:lightbulb-on'; return 'hademo:lightbulb';\n",
        },
        emulated_hue_hidden: false,
        emulated_hue_name: "Driveway Light",
      },
      last_changed: "2019-01-22T17:00:22.398939+00:00",
      last_updated: "2019-01-22T17:00:22.398939+00:00",
      context: { id: "422aaa88552048fba49ad02c698d878e", user_id: null },
    },
    "switch.wemoporch": {
      entity_id: "switch.wemoporch",
      state: "off",
      attributes: {
        friendly_name: "Porch Lights",
        templates: {
          icon_color:
            "if (state === 'on') return 'rgb(251, 210, 41)'; return 'rgb(54, 95, 140)';\n",
          icon:
            "if (state === 'on') return 'hademo:lightbulb-on'; return 'hademo:lightbulb';\n",
        },
        emulated_hue_hidden: false,
        emulated_hue_name: "Porch Lights",
      },
      last_changed: "2019-01-22T17:00:22.435345+00:00",
      last_updated: "2019-01-22T17:00:22.435345+00:00",
      context: { id: "fdbe1a67cfc64adc8bfafeb84bcd12ad", user_id: null },
    },
  });
