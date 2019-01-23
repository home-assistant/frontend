import { LovelaceConfig } from "../../../../src/data/lovelace";

export const demoLovelaceArsaboo: () => LovelaceConfig = () => ({
  resources: [
    // {
    //   url: "/local/custom_ui/weather-card.js?v=0.23",
    //   type: "module",
    // },
    // {
    //   url: "/local/custom_ui/pc-card.js?v=0.2",
    //   type: "module",
    // },
    // {
    //   url: "/local/custom_ui/circle-sensor-card.js",
    //   type: "module",
    // },
    // {
    //   url: "/local/custom_ui/monster-card.js?v=1",
    //   type: "js",
    // },
    // {
    //   url: "/local/custom_ui/thermostat-card.js?v=1.3",
    //   type: "module",
    // },
    // {
    //   url: "/local/custom_ui/calendar-card.js",
    //   type: "module",
    // },
    // {
    //   url: "https://unpkg.com/moment@2.22.2/moment.js",
    //   type: "js",
    // },
    // {
    //   url: "/local/custom_ui/slider-entity-row.js?v=0.3",
    //   type: "js",
    // },
    // {
    //   url: "/local/custom_ui/button-card.js?v=0.11",
    //   type: "module",
    // },
    // {
    //   url: "/local/mini-media-player-bundle.js?v=0.0.1",
    //   type: "module",
    // },
  ],
  title: "ARS Home",
  views: [
    {
      icon: "mdi:home-assistant",
      id: "home",
      title: "Home",
      cards: [
        { type: "custom:ha-demo-card" },
        {
          type: "picture-elements",
          image: "/assets/arsaboo/floorplans/main.png",
          elements: [
            {
              type: "image",
              entity: "input_boolean.abodeupdate",
              tap_action: {
                action: "toggle",
              },
              state_image: {
                on: "/assets/arsaboo/icons/abode_enabled.png",
                off: "/assets/arsaboo/icons/abode_disabled.png",
              },
              style: {
                top: "4%",
                left: "30%",
                width: "7%",
              },
            },
            {
              type: "image",
              entity: "input_boolean.tvtime",
              tap_action: {
                action: "toggle",
              },
              state_image: {
                on: "/assets/arsaboo/icons/tv_enabled.png",
                off: "/assets/arsaboo/icons/tv_disabled.png",
              },
              style: {
                top: "4%",
                left: "40%",
                width: "7%",
              },
            },
            {
              type: "image",
              entity: "switch.security_armed",
              tap_action: {
                action: "toggle",
              },
              state_image: {
                on: "/assets/arsaboo/icons/security_armed_red.png",
                off: "/assets/arsaboo/icons/security_disarmed.png",
              },
              style: {
                top: "4%",
                left: "50%",
                width: "7%",
              },
            },
            {
              type: "image",
              entity: "input_boolean.homeautomation",
              tap_action: {
                action: "toggle",
              },
              state_image: {
                on: "/assets/arsaboo/icons/automation_enabled.png",
                off: "/assets/arsaboo/icons/automation_disabled.png",
              },
              style: {
                top: "4%",
                left: "60%",
                width: "7%",
              },
            },
            {
              type: "image",
              entity: "light.kitchen_lights",
              tap_action: {
                action: "toggle",
              },
              image: "/assets/arsaboo/icons/light_bulb_off.png",
              state_image: {
                on: "/assets/arsaboo/icons/light_bulb_on.png",
              },
              state_filter: {
                on:
                  "brightness(130%) saturate(1.5) drop-shadow(0px 0px 10px gold)",
                off: "brightness(80%) saturate(0.8)",
              },
              style: {
                top: "40%",
                left: "11%",
                width: "7%",
                padding: "10px",
              },
            },
            {
              type: "image",
              entity: "camera.porch",
              image: "/assets/arsaboo/icons/camera_porch_streaming.png",
              state_image: {
                recording: "/assets/arsaboo/icons/camera_porch_recording.png",
              },
              style: {
                top: "90%",
                left: "3%",
                width: "7%",
                transform: "none",
              },
            },
            {
              type: "image",
              entity: "camera.patio",
              image: "/assets/arsaboo/icons/camera_patio_streaming.png",
              state_image: {
                recording: "/assets/arsaboo/icons/camera_patio_recording.png",
              },
              style: {
                top: "12%",
                left: "3%",
                width: "7%",
                transform: "none",
              },
            },
            {
              type: "image",
              entity: "camera.backyard",
              image: "/assets/arsaboo/icons/camera_backyard_streaming.png",
              state_image: {
                recording:
                  "/assets/arsaboo/icons/camera_backyard_recording.png",
              },
              style: {
                top: "12%",
                left: "90%",
                width: "7%",
                transform: "none",
              },
            },
            {
              type: "image",
              entity: "camera.driveway",
              image: "/assets/arsaboo/icons/camera_driveway_streaming.png",
              state_image: {
                recording:
                  "/assets/arsaboo/icons/camera_driveway_recording.png",
              },
              style: {
                top: "81.5%",
                left: "90%",
                width: "7%",
                transform: "none",
              },
            },
            {
              type: "image",
              entity: "light.living_room_lights",
              tap_action: {
                action: "toggle",
              },
              hold_action: {
                action: "more-info",
              },
              image: "/assets/arsaboo/icons/light_bulb_off.png",
              state_image: {
                on: "/assets/arsaboo/icons/light_bulb_on.png",
              },
              state_filter: {
                on:
                  "brightness(130%) saturate(1.5) drop-shadow(0px 0px 10px gold)",
                off: "brightness(80%) saturate(0.8)",
              },
              style: {
                top: "34%",
                left: "50%",
                width: "7%",
                padding: "10px",
              },
            },
            {
              type: "state-label",
              entity: "sensor.livingroom_temp_rounded",
              style: {
                top: "43%",
                left: "50%",
                background:
                  'center / contain no-repeat url("/assets/arsaboo/icons/ecobee_blank.png")',
                "text-align": "center",
                "font-size": "12px",
                color: "white",
                "font-family": "Helvetica",
              },
            },
            {
              type: "state-icon",
              entity: "binary_sensor.motion_sensor_158d00016daecc",
              style: {
                top: "27%",
                left: "50%",
              },
            },
            {
              type: "state-icon",
              entity: "binary_sensor.back_door",
              style: {
                top: "17%",
                left: "15%",
              },
            },
            {
              type: "image",
              entity: "input_boolean.tv",
              tap_action: {
                action: "toggle",
              },
              image: "/assets/arsaboo/icons/tv_off2.png",
              state_image: {
                on: "/assets/arsaboo/icons/tv_on2.png",
              },
              state_filter: {
                on: "drop-shadow(-5px 0 10px gold)",
                off: "brightness(80%) saturate(0.8)",
              },
              style: {
                top: "29%",
                left: "68.3%",
                width: "2.5%",
                padding: "10px 0 10px 30px",
              },
            },
            {
              type: "state-icon",
              entity: "binary_sensor.motion_sensor_158d0001a1f2ab",
              style: {
                top: "27%",
                left: "85%",
              },
            },
            {
              type: "image",
              entity: "switch.wemoporch",
              tap_action: {
                action: "toggle",
              },
              image: "/assets/arsaboo/icons/light_bulb_off.png",
              state_image: {
                on: "/assets/arsaboo/icons/light_bulb_on.png",
              },
              state_filter: {
                on:
                  "brightness(130%) saturate(1.5) drop-shadow(0px 0px 10px gold)",
                off: "brightness(80%) saturate(0.8)",
              },
              style: {
                top: "92%",
                left: "20%",
                width: "7%",
                padding: "10px",
              },
            },
            {
              type: "state-icon",
              entity: "binary_sensor.ring_front_door_motion",
              style: {
                top: "95%",
                left: "32%",
              },
            },
            {
              type: "state-icon",
              entity: "binary_sensor.door_window_sensor_158d0001bf26df",
              style: {
                top: "64%",
                left: "56%",
              },
            },
            {
              type: "image",
              entity: "light.lifx5",
              tap_action: {
                action: "toggle",
              },
              image: "/assets/arsaboo/icons/light_bulb_off.png",
              state_image: {
                on: "/assets/arsaboo/icons/light_bulb_on.png",
              },
              state_filter: {
                on:
                  "brightness(130%) saturate(1.5) drop-shadow(0px 0px 10px gold)",
                off: "brightness(80%) saturate(0.8)",
              },
              style: {
                top: "60%",
                left: "78%",
                width: "7%",
                padding: "10px",
              },
            },
            {
              type: "image",
              entity: "switch.driveway",
              tap_action: {
                action: "toggle",
              },
              image: "/assets/arsaboo/icons/light_off.png",
              state_image: {
                on: "/assets/arsaboo/icons/light_on.png",
              },
              state_filter: {
                on: "drop-shadow(-5px -5px 10px gold)",
                off: "brightness(80%) saturate(0.8)",
              },
              style: {
                top: "84%",
                left: "82%",
                width: "7%",
                padding: "10px",
              },
            },
            {
              type: "image",
              entity: "cover.garagedoor",
              tap_action: {
                action: "toggle",
              },
              image: "/assets/arsaboo/icons/garage_door_closed.png",
              state_image: {
                open: "/assets/arsaboo/icons/garage_door_open.png",
                closed: "/assets/arsaboo/icons/garage_door_closed.png",
              },
              style: {
                top: "71%",
                left: "74%",
                width: "7%",
                transform: "none",
              },
            },
            {
              type: "state-label",
              entity: "sensor.study_temp_rounded",
              style: {
                top: "80%",
                left: "49%",
                "background-color": "gray",
                background:
                  'center / contain no-repeat url("/assets/arsaboo/icons/ecobee_blank.png")',
                "text-align": "center",
                "font-size": "12px",
                color: "white",
                "font-family": "Helvetica",
                display: "block",
                overflow: "hidden",
              },
            },
            // {
            //   type: "custom:thermostat-card",
            //   entity: "climate.downstairs",
            //   no_card: true,
            //   hvac: {
            //     attribute: "operation",
            //   },
            //   style: {
            //     top: "78%",
            //     left: "15%",
            //     width: "50px",
            //     height: "50px",
            //   },
            // },
            {
              type: "state-icon",
              entity: "binary_sensor.front_door",
              style: {
                top: "89%",
                left: "32%",
              },
            },
          ],
        },
        {
          type: "picture-elements",
          image: "/assets/arsaboo/floorplans/second.png",
          elements: [
            {
              type: "state-icon",
              entity: "binary_sensor.motion_sensor_158d00016612af",
              style: {
                top: "40%",
                left: "35%",
              },
            },
            // {
            //   type: "custom:thermostat-card",
            //   entity: "climate.bedroom",
            //   no_card: true,
            //   hvac: {
            //     attribute: "operation",
            //   },
            //   style: {
            //     top: "79%",
            //     left: "92%",
            //     width: "50px",
            //     height: "50px",
            //   },
            // },
            {
              type: "state-icon",
              entity: "binary_sensor.motion_sensor_158d00016c53bf",
              style: {
                top: "55%",
                left: "80%",
              },
            },
            {
              type: "state-label",
              entity: "sensor.illumination_158d00016c53bf",
              style: {
                top: "78%",
                left: "80%",
                "text-align": "center",
                "font-size": "12px",
                color: "black",
              },
            },
            {
              type: "image",
              entity: "light.master_lights",
              tap_action: {
                action: "toggle",
              },
              hold_action: {
                action: "more-info",
              },
              image: "/assets/arsaboo/icons/light_bulb_off.png",
              state_image: {
                on: "/assets/arsaboo/icons/light_bulb_on.png",
              },
              state_filter: {
                on:
                  "brightness(130%) saturate(1.5) drop-shadow(0px 0px 10px gold)",
                off: "brightness(80%) saturate(0.8)",
              },
              style: {
                top: "70%",
                left: "80%",
                width: "7%",
                padding: "10px",
              },
            },
            {
              type: "state-icon",
              entity: "binary_sensor.water_leak_sensor_158d0001d77800",
              style: {
                top: "25%",
                left: "66%",
              },
            },
            // {
            //   type: "custom:thermostat-card",
            //   entity: "climate.upstairs",
            //   no_card: true,
            //   hvac: {
            //     attribute: "operation",
            //   },
            //   style: {
            //     top: "18%",
            //     left: "15%",
            //     width: "50px",
            //     height: "50px",
            //   },
            // },
          ],
        },
        {
          type: "thermostat",
          entity: "climate.upstairs",
        },
        {
          type: "media-control",
          entity: "media_player.family_room_2",
        },
        {
          type: "iframe",
          aspect_ratio: "90%",
          url: "https://embed.windy.com/embed2.html?rain,32.487,-84.023,5",
        },
        {
          type: "entities",
          title: "Information",
          show_header_toggle: false,
          entities: [
            "sensor.morning_commute",
            "sensor.alok_to_home",
            "sensor.plexspy",
            "sensor.usdinr",
          ],
        },
        {
          type: "entities",
          title: "Lights",
          entities: [
            {
              entity: "light.gateway_light_34ce00813670",
              // type: "custom:slider-entity-row",
            },
            {
              entity: "light.lifx3",
              // type: "custom:slider-entity-row",
            },
            {
              entity: "light.lifxnrguest",
              // type: "custom:slider-entity-row",
            },
            {
              entity: "light.lifxnrkitchen",
              // type: "custom:slider-entity-row",
            },
            {
              type: "divider",
            },
            {
              entity: "light.hue_color_lamp_1",
              // type: "custom:slider-entity-row",
            },
            {
              entity: "light.hue_color_lamp_2",
              // type: "custom:slider-entity-row",
            },
            {
              entity: "light.hue_color_lamp_3",
              // type: "custom:slider-entity-row",
            },
          ],
        },
        {
          type: "entities",
          title: "Switches",
          entities: [
            {
              entity: "switch.wemoswitch",
              secondary_info: "last-changed",
            },
            {
              entity: "switch.wemoinsight",
              secondary_info: "last-changed",
            },
          ],
        },

        {
          type: "alarm-panel",
          entity: "alarm_control_panel.abode_alarm",
          title: "Abode",
          states: ["arm_home", "arm_away"],
        },
        {
          type: "entities",
          title: "Entertainment",
          show_header_toggle: false,
          entities: [
            "sensor.living_room",
            "input_select.livingroomharmony",
            "input_select.hdmiswitcher",
            "input_select.hdmiinput",
            "input_number.harmonyvolume",
            "sensor.total_tv_time",
            "sensor.sonos_audio_in",
            "script.tv_off",
          ],
        },
        {
          type: "entities",
          title: "Ring Doorbell",
          show_header_toggle: false,
          entities: [
            "binary_sensor.ring_front_door_ding",
            "binary_sensor.ring_front_door_motion",
            "sensor.ring_front_door_last_ding",
            "sensor.ring_front_door_last_motion",
          ],
        },
      ],
    },
    {
      icon: "mdi:information-outline",
      id: "home-assistant",
      title: "Home Assistant",
      cards: [
        {
          type: "markdown",
          content:
            "## What is Home Assistant?\nHome Assistant is open source home automation software, that puts local control and privacy first. Powered by a worldwide community of tinkerers and DIY enthusiasts. Perfect to run on a Raspberry Pi or a local server.",
        },
        {
          entities: [
            {
              url: "https://www.home-assistant.io/",
              type: "weblink",
              name: "Home Assistant",
              icon: "mdi:home-assistant",
            },
            {
              url: "https://www.home-assistant.io/getting-started/",
              type: "weblink",
              name: "Getting Started",
              icon: "mdi:download",
            },
            {
              url: "https://www.home-assistant.io/cookbook/",
              type: "weblink",
              name: "Configuration Examples",
              icon: "mdi:home-heart",
            },
            {
              url: "https://community.home-assistant.io/",
              type: "weblink",
              name: "Forum",
              icon: "mdi:forum",
            },
            {
              url: "https://discord.gg/c5DvZ4e",
              type: "weblink",
              name: "Chat",
              icon: "mdi:chat",
            },
          ],
          show_header_toggle: false,
          type: "entities",
          title: "Useful Links",
        },
      ],
    },
    // {
    //   icon: "mdi:weather-cloudy",
    //   id: "weather",
    //   title: "Weather",
    //   cards: [
    //     {
    //       type: "custom:weather-card",
    //       entity: "weather.dark_sky",
    //       icons: "/assets/arsaboo/icons/weather_icons/animated/",
    //     },
    //     {
    //       type: "entities",
    //       title: "Weather",
    //       show_header_toggle: false,
    //       entities: [
    //         "sensor.dark_sky_summary",
    //         "sensor.pollen_level",
    //         "sensor.cold_flu_risk",
    //         "sensor.dark_sky_hourly_summary",
    //         "sensor.dark_sky_daily_summary",
    //       ],
    //     },
    //     {
    //       type: "entities",
    //       title: "Room Sensors",
    //       show_header_toggle: false,
    //       entities: [
    //         "sensor.illumination_158d00016612af",
    //         "sensor.humidity_158d0001ab7d20",
    //         "sensor.pressure_158d0001ab7d20",
    //         "sensor.temperature_158d0001ab7d20",
    //         {
    //           type: "divider",
    //         },
    //         "sensor.humidity_158d0001ab3c88",
    //         "sensor.pressure_158d0001ab3c88",
    //         "sensor.temperature_158d0001ab3c88",
    //         {
    //           type: "divider",
    //         },
    //         "sensor.humidity_158d0001ab3b2b",
    //         "sensor.pressure_158d0001ab3b2b",
    //         "sensor.temperature_158d0001ab3b2b",
    //         {
    //           type: "divider",
    //         },
    //         "sensor.illumination_34ce00813670",
    //         "sensor.illumination_158d0001a1f2ab",
    //         "binary_sensor.water_leak_sensor_158d0001d77800",
    //         "sensor.leeoalarmstatus",
    //       ],
    //     },
    //     {
    //       type: "picture-entity",
    //       entity: "camera.meteogram",
    //     },
    //     {
    //       type: "iframe",
    //       aspect_ratio: "90%",
    //       url: "https://embed.windy.com/embed2.html?rain,32.487,-84.023,5",
    //     },
    //   ],
    // },
    // {
    //   icon: "mdi:chart-line",
    //   id: "grafana",
    //   title: "Grafana",
    //   cards: [
    //     {
    //       type: "vertical-stack",
    //       cards: [
    //         {
    //           type: "thermostat",
    //           entity: "climate.downstairs",
    //         },
    //         {
    //           type: "glance",
    //           entities: [
    //             {
    //               entity: "sensor.downstairsthermoper",
    //               name: "Operation",
    //             },
    //             {
    //               entity: "sensor.downstairs_humidity",
    //               name: "Humidity",
    //             },
    //             {
    //               entity: "sensor.living_room_temperature",
    //               name: "Temperature",
    //             },
    //             {
    //               entity: "sensor.downstairs_hvac_runtime",
    //               name: "Runtime",
    //             },
    //             {
    //               entity: "switch.downstairs_away",
    //               tap_action: {
    //                 action: "toggle",
    //               },
    //               name: "Away",
    //             },
    //           ],
    //         },
    //         {
    //           type: "picture-entity",
    //           entity: "camera.grafana_temp_down",
    //           show_name: false,
    //           show_state: false,
    //         },
    //         {
    //           type: "picture-entity",
    //           entity: "camera.grafana_mode_down",
    //           show_name: false,
    //           show_state: false,
    //         },
    //       ],
    //     },
    //     {
    //       type: "vertical-stack",
    //       cards: [
    //         {
    //           type: "thermostat",
    //           entity: "climate.upstairs",
    //         },
    //         {
    //           type: "glance",
    //           entities: [
    //             {
    //               entity: "sensor.upstairsthermoper",
    //               name: "Operation",
    //             },
    //             {
    //               entity: "sensor.upstairs_humidity",
    //               name: "Humidity",
    //             },
    //             {
    //               entity: "sensor.upstairs_temperature",
    //               name: "Temperature",
    //             },
    //             {
    //               entity: "sensor.upstairs_hvac_runtime",
    //               name: "Runtime",
    //             },
    //             {
    //               entity: "switch.upstairs_away",
    //               tap_action: {
    //                 action: "toggle",
    //               },
    //               name: "Away",
    //             },
    //           ],
    //         },
    //         {
    //           type: "picture-entity",
    //           entity: "camera.grafana_temp_up",
    //           show_name: false,
    //           show_state: false,
    //         },
    //         {
    //           type: "picture-entity",
    //           entity: "camera.grafana_mode_up",
    //           show_name: false,
    //           show_state: false,
    //         },
    //       ],
    //     },
    //     {
    //       type: "vertical-stack",
    //       cards: [
    //         {
    //           type: "thermostat",
    //           entity: "climate.bedroom",
    //         },
    //         {
    //           type: "glance",
    //           entities: [
    //             {
    //               entity: "sensor.masterthermoper",
    //               name: "Operation",
    //             },
    //             {
    //               entity: "sensor.bedroom_humidity",
    //               name: "Humidity",
    //             },
    //             {
    //               entity: "sensor.master_temperature",
    //               name: "Temperature",
    //             },
    //             {
    //               entity: "sensor.master_hvac_runtime",
    //               name: "Runtime",
    //             },
    //             {
    //               entity: "switch.bedroom_away",
    //               tap_action: {
    //                 action: "toggle",
    //               },
    //               name: "Away",
    //             },
    //           ],
    //         },
    //         {
    //           type: "picture-entity",
    //           entity: "camera.grafana_temp_master",
    //           show_name: false,
    //           show_state: false,
    //         },
    //         {
    //           type: "picture-entity",
    //           entity: "camera.grafana_mode_master",
    //           show_name: false,
    //           show_state: false,
    //         },
    //       ],
    //     },
    //     {
    //       type: "picture-entity",
    //       entity: "camera.grafana_portfolio",
    //       show_name: false,
    //       show_state: false,
    //     },
    //     {
    //       type: "picture-entity",
    //       entity: "camera.grafana_networth",
    //       show_name: false,
    //       show_state: false,
    //     },
    //   ],
    // },
    // // {
    // //   icon: "mdi:cctv",
    // //   id: "cameras",
    // //   title: "Cameras",
    // //   cards: [
    // //     {
    // //       type: "picture-entity",
    // //       entity: "camera.driveway",
    // //       show_name: false,
    // //       show_state: false,
    // //     },
    // //     {
    // //       type: "picture-entity",
    // //       entity: "camera.patio",
    // //       show_name: false,
    // //       show_state: false,
    // //     },
    // //     {
    // //       type: "picture-entity",
    // //       entity: "camera.porch",
    // //       show_name: false,
    // //       show_state: false,
    // //     },
    // //     {
    // //       type: "picture-entity",
    // //       entity: "camera.backyard",
    // //       show_name: false,
    // //       show_state: false,
    // //     },
    // //     {
    // //       type: "picture-entity",
    // //       entity: "camera.arlo3",
    // //     },
    // //     {
    // //       type: "picture-entity",
    // //       entity: "camera.arlolivingroom",
    // //     },
    // //     {
    // //       type: "picture-entity",
    // //       entity: "camera.livingroom2",
    // //     },
    // //     {
    // //       type: "picture-entity",
    // //       entity: "camera.front_door",
    // //     },
    // //     {
    // //       type: "picture-entity",
    // //       entity: "camera.worldtime",
    // //       show_name: false,
    // //       show_state: false,
    // //     },
    // //     {
    // //       type: "picture-entity",
    // //       entity: "camera.ars_bloom",
    // //       show_name: false,
    // //       show_state: false,
    // //     },
    // //     {
    // //       type: "picture-entity",
    // //       entity: "camera.driveway_tf",
    // //       show_name: false,
    // //       show_state: false,
    // //     },
    // //     {
    // //       type: "picture-entity",
    // //       entity: "camera.porch_tf",
    // //       show_name: false,
    // //       show_state: false,
    // //     },
    // //     {
    // //       type: "picture-entity",
    // //       entity: "camera.patio_tf",
    // //       show_name: false,
    // //       show_state: false,
    // //     },
    // //     {
    // //       type: "picture-entity",
    // //       entity: "camera.backyard_tf",
    // //       show_name: false,
    // //       show_state: false,
    // //     },
    // //   ],
    // // },
    // {
    //   icon: "mdi:play-circle-outline",
    //   id: "media",
    //   title: "Media",
    //   cards: [
    //     {
    //       type: "entities",
    //       title: "Entertainment",
    //       show_header_toggle: false,
    //       entities: [
    //         "sensor.living_room",
    //         "input_select.livingroomharmony",
    //         "input_select.hdmiswitcher",
    //         "input_select.hdmiinput",
    //         "input_number.harmonyvolume",
    //         "sensor.total_tv_time",
    //         "sensor.sonos_audio_in",
    //         "script.tv_off",
    //       ],
    //     },
    //     {
    //       type: "entities",
    //       title: "Players",
    //       show_header_toggle: false,
    //       entities: [
    //         "media_player.livingroomsonos",
    //         "media_player.family_room_2",
    //         "media_player.kodi_nstv",
    //         "media_player.echo_dot_gen2",
    //         "media_player.living_room_home",
    //         "media_player.living_room_speaker",
    //         "media_player.living_room_tv",
    //         "media_player.shield",
    //       ],
    //     },
    //     {
    //       type: "vertical-stack",
    //       cards: [
    //         {
    //           type: "horizontal-stack",
    //           cards: [
    //             {
    //               type: "custom:button-card",
    //               color_type: "blank-card",
    //             },
    //             {
    //               type: "custom:button-card",
    //               entity: "switch.sonos_speech_enhance",
    //               name: "Speech",
    //               icon: "mdi:comment-check-outline",
    //               default_color: "rgb(255, 255, 255)",
    //               color: "rgb(28, 128, 199)",
    //               action: "toggle",
    //               color_type: "icon",
    //               style: [
    //                 {
    //                   "font-size": "12px",
    //                 },
    //                 {
    //                   "font-weight": "bold",
    //                 },
    //               ],
    //             },
    //             {
    //               type: "custom:button-card",
    //               entity: "switch.sonos_night_sound",
    //               name: "Night",
    //               icon: "mdi:weather-night",
    //               color: "rgb(28, 128, 199)",
    //               action: "toggle",
    //               default_color: "rgb(255, 255, 255)",
    //               color_type: "icon",
    //               style: [
    //                 {
    //                   "font-size": "12px",
    //                 },
    //                 {
    //                   "font-weight": "bold",
    //                 },
    //               ],
    //             },
    //             {
    //               type: "custom:button-card",
    //               color_type: "blank-card",
    //             },
    //           ],
    //         },
    //         {
    //           type: "horizontal-stack",
    //           cards: [
    //             {
    //               type: "custom:button-card",
    //               color_type: "blank-card",
    //             },
    //             {
    //               type: "custom:button-card",
    //               color_type: "card",
    //               color: "rgb(223, 255, 97)",
    //               icon: "mdi:volume-minus",
    //               style: [
    //                 {
    //                   height: "50px",
    //                 },
    //               ],
    //               action: "service",
    //               service: {
    //                 domain: "media_player",
    //                 action: "volume_down",
    //                 data: {
    //                   entity_id: "media_player.family_room_2",
    //                 },
    //               },
    //             },
    //             {
    //               type: "custom:button-card",
    //               entity: "sensor.sonos_volume",
    //               color_type: "icon",
    //               show_state: true,
    //               color: "rgb(223, 255, 97)",
    //               style: [
    //                 {
    //                   height: "50px",
    //                 },
    //               ],
    //               action: "more_info",
    //             },
    //             {
    //               type: "custom:button-card",
    //               color_type: "card",
    //               color: "rgb(223, 255, 97)",
    //               icon: "mdi:volume-plus",
    //               style: [
    //                 {
    //                   height: "50px",
    //                 },
    //               ],
    //               action: "service",
    //               service: {
    //                 domain: "media_player",
    //                 action: "volume_up",
    //                 data: {
    //                   entity_id: "media_player.family_room_2",
    //                 },
    //               },
    //             },
    //             {
    //               type: "custom:button-card",
    //               color_type: "blank-card",
    //             },
    //           ],
    //         },
    //         {
    //           type: "horizontal-stack",
    //           cards: [
    //             {
    //               type: "custom:button-card",
    //               color_type: "blank-card",
    //             },
    //             {
    //               type: "custom:button-card",
    //               color_type: "card",
    //               color: "rgb(223, 255, 97)",
    //               icon: "mdi:plex",
    //               action: "service",
    //               service: {
    //                 domain: "rest_command",
    //                 action: "plex",
    //               },
    //             },
    //             {
    //               type: "custom:button-card",
    //               color_type: "card",
    //               color: "rgb(223, 255, 97)",
    //               icon: "mdi:youtube",
    //               action: "service",
    //               service: {
    //                 domain: "rest_command",
    //                 action: "youtube",
    //               },
    //             },
    //             {
    //               type: "custom:button-card",
    //               color_type: "card",
    //               color: "rgb(223, 255, 97)",
    //               icon: "mdi:netflix",
    //               action: "service",
    //               service: {
    //                 domain: "rest_command",
    //                 action: "netflix",
    //               },
    //             },
    //             {
    //               type: "custom:button-card",
    //               color_type: "blank-card",
    //             },
    //           ],
    //         },
    //       ],
    //     },
    //     {
    //       type: "entities",
    //       title: "Light Operations",
    //       show_header_toggle: false,
    //       entities: [
    //         "input_boolean.partymode",
    //         "script.sonoslinein",
    //         "script.colorloop_start",
    //         "script.disco_party",
    //         "script.lifx_stop_effects",
    //         "script.master_colorloop",
    //         "script.master_random",
    //       ],
    //     },
    //     {
    //       type: "media-control",
    //       entity: "media_player.livingroomsonos",
    //     },
    //     {
    //       type: "media-control",
    //       entity: "media_player.family_room_2",
    //     },
    //     {
    //       type: "media-control",
    //       entity: "media_player.kodi_nstv",
    //     },
    //     {
    //       type: "media-control",
    //       entity: "media_player.echo_dot_gen2",
    //     },
    //     {
    //       type: "media-control",
    //       entity: "media_player.living_room_home",
    //     },
    //     {
    //       type: "media-control",
    //       entity: "media_player.living_room_tv",
    //     },
    //     {
    //       type: "media-control",
    //       entity: "media_player.shield",
    //     },
    //   ],
    // },
    // {
    //   icon: "mdi:settings",
    //   id: "settings",
    //   title: "Settings",
    //   cards: [
    //     {
    //       type: "horizontal-stack",
    //       cards: [
    //         {
    //           type: "picture-entity",
    //           entity: "device_tracker.rashmiphone_rashmiphone",
    //           show_name: false,
    //           show_state: false,
    //           state_image: {
    //             home: "/assets/arsaboo/icons/rashmi_owntracks_home.png",
    //             not_home: "/assets/arsaboo/icons/rashmi_owntracks_not_home.png",
    //           },
    //         },
    //         {
    //           type: "picture-entity",
    //           entity: "device_tracker.rashmiappiphone",
    //           show_name: false,
    //           show_state: false,
    //           state_image: {
    //             home: "/assets/arsaboo/icons/rashmi_ios_home.png",
    //             not_home: "/assets/arsaboo/icons/rashmi_ios_not_home.png",
    //           },
    //         },
    //         {
    //           type: "picture-entity",
    //           entity: "device_tracker.rashmisiphone",
    //           show_name: false,
    //           show_state: false,
    //           state_image: {
    //             home: "/assets/arsaboo/icons/rashmi_wifi_home.png",
    //             not_home: "/assets/arsaboo/icons/rashmi_wifi_not_home.png",
    //           },
    //         },
    //         {
    //           type: "picture-entity",
    //           entity: "device_tracker.sonu_sonu",
    //           show_name: false,
    //           show_state: false,
    //           state_image: {
    //             home: "/assets/arsaboo/icons/rashmi_life360_home.png",
    //             not_home: "/assets/arsaboo/icons/rashmi_life360_not_home.png",
    //           },
    //         },
    //         {
    //           type: "picture-entity",
    //           entity: "device_tracker.e1594e53_21df_414c_82da_f655d5282fca",
    //           show_name: false,
    //           show_state: false,
    //           state_image: {
    //             home: "/assets/arsaboo/icons/rashmi_geofency_home.png",
    //             not_home: "/assets/arsaboo/icons/rashmi_geofency_not_home.png",
    //           },
    //         },
    //       ],
    //     },
    //     {
    //       type: "horizontal-stack",
    //       cards: [
    //         {
    //           type: "picture-entity",
    //           entity: "device_tracker.alokphone_alokphone",
    //           show_name: false,
    //           show_state: false,
    //           state_image: {
    //             home: "/assets/arsaboo/icons/alok_owntracks_home.png",
    //             not_home: "/assets/arsaboo/icons/alok_owntracks_not_home.png",
    //             Buckhead: "/assets/arsaboo/icons/alok_owntracks_not_home.png",
    //             Downtown: "/assets/arsaboo/icons/alok_owntracks_not_home.png",
    //           },
    //         },
    //         {
    //           type: "picture-entity",
    //           entity: "device_tracker.alokiosiphone",
    //           show_name: false,
    //           show_state: false,
    //           state_image: {
    //             home: "/assets/arsaboo/icons/alok_ios_home.png",
    //             not_home: "/assets/arsaboo/icons/alok_ios_not_home.png",
    //             Buckhead: "/assets/arsaboo/icons/alok_ios_not_home.png",
    //             Downtown: "/assets/arsaboo/icons/alok_ios_not_home.png",
    //           },
    //         },
    //         {
    //           type: "picture-entity",
    //           entity: "device_tracker.myiphone",
    //           show_name: false,
    //           show_state: false,
    //           state_image: {
    //             home: "/assets/arsaboo/icons/alok_wifi_home.png",
    //             not_home: "/assets/arsaboo/icons/alok_wifi_not_home.png",
    //           },
    //         },
    //         {
    //           type: "picture-entity",
    //           entity: "device_tracker.alok_alok",
    //           show_name: false,
    //           show_state: false,
    //           state_image: {
    //             home: "/assets/arsaboo/icons/alok_life360_home.png",
    //             not_home: "/assets/arsaboo/icons/alok_life360_not_home.png",
    //             Buckhead: "/assets/arsaboo/icons/alok_life360_not_home.png",
    //             Downtown: "/assets/arsaboo/icons/alok_life360_not_home.png",
    //           },
    //         },
    //         {
    //           type: "picture-entity",
    //           entity: "device_tracker.b4445761_f6c0_4b7f_835f_cfdc03b47111",
    //           show_name: false,
    //           show_state: false,
    //           state_image: {
    //             home: "/assets/arsaboo/icons/alok_geofency_home.png",
    //             not_home: "/assets/arsaboo/icons/alok_geofency_not_home.png",
    //             buckhead: "/assets/arsaboo/icons/alok_geofency_not_home.png",
    //             downtown: "/assets/arsaboo/icons/alok_geofency_not_home.png",
    //           },
    //         },
    //       ],
    //     },
    //     {
    //       type: "horizontal-stack",
    //       cards: [
    //         {
    //           type: "picture-entity",
    //           entity: "device_tracker.meta_alok",
    //           state_image: {
    //             home: "/assets/arsaboo/icons/alok_home.png",
    //             not_home: "/assets/arsaboo/icons/alok_not_home.png",
    //             buckhead: "/assets/arsaboo/icons/alok_not_home.png",
    //             Buckhead: "/assets/arsaboo/icons/alok_not_home.png",
    //             downtown: "/assets/arsaboo/icons/alok_not_home.png",
    //             Downtown: "/assets/arsaboo/icons/alok_not_home.png",
    //           },
    //           show_name: false,
    //           show_state: false,
    //           hold_action: {
    //             action: "toggle",
    //           },
    //         },
    //         {
    //           type: "picture-entity",
    //           entity: "device_tracker.meta_rashmi",
    //           state_image: {
    //             home: "/assets/arsaboo/icons/rashmi_home.png",
    //             not_home: "/assets/arsaboo/icons/rashmi_not_home.png",
    //           },
    //           show_name: false,
    //           show_state: false,
    //           hold_action: {
    //             action: "toggle",
    //           },
    //         },
    //       ],
    //     },
    //     {
    //       type: "entities",
    //       title: "HASS Details",
    //       show_header_toggle: false,
    //       entities: [
    //         "sensor.ssl_certificate_expiry",
    //         "input_select.current_theme",
    //         "input_boolean.devmode",
    //       ],
    //     },
    //     {
    //       type: "entities",
    //       title: "Camera Processing",
    //       show_header_toggle: false,
    //       entities: [
    //         "script.classify_images",
    //         "image_processing.opencv_porch",
    //         "image_processing.opencv_patio",
    //         "image_processing.opencv_driveway",
    //         "image_processing.opencv_backyard",
    //         "image_processing.tensorflow_porch",
    //         "image_processing.tensorflow_patio",
    //         "image_processing.tensorflow_driveway",
    //         "image_processing.tensorflow_backyard",
    //         "image_processing.deepstack_porch",
    //         "image_processing.deepstack_patio",
    //         "image_processing.deepstack_driveway",
    //         "image_processing.deepstack_backyard",
    //         "image_processing.facebox_backyard",
    //         "image_processing.facebox_patio",
    //         "image_processing.facebox_driveway",
    //         "image_processing.facebox_porch",
    //         "image_processing.tagbox_backyard",
    //         "image_processing.tagbox_patio",
    //         "image_processing.tagbox_driveway",
    //         "image_processing.tagbox_porch",
    //         "image_processing.rekognition_driveway",
    //       ],
    //     },
    //     {
    //       type: "entities",
    //       title: "Network Details",
    //       show_header_toggle: false,
    //       entities: [
    //         "sensor.speedtest_download",
    //         "switch.pihole",
    //         {
    //           type: "divider",
    //         },
    //         "sensor.glances_cpu_load",
    //         "sensor.glances_disk_used",
    //         "sensor.glances_ram_used",
    //       ],
    //     },
    //     {
    //       type: "horizontal-stack",
    //       cards: [
    //         {
    //           type: "custom:button-card",
    //           entity: "switch.arnav_s_ipad",
    //           name: "iPad",
    //           icon: "mdi:tablet-ipad",
    //           color: "rgb(250, 218, 79)",
    //           color_type: "icon",
    //           style: [
    //             {
    //               "font-size": "12px",
    //             },
    //             {
    //               "text-transform": "capitalize",
    //             },
    //           ],
    //         },
    //         {
    //           type: "custom:button-card",
    //           entity: "switch.lenovo_home",
    //           name: "Lenovo",
    //           icon: "mdi:laptop-windows",
    //           color: "rgb(250, 218, 79)",
    //           color_type: "icon",
    //           style: [
    //             {
    //               "font-size": "12px",
    //             },
    //             {
    //               "text-transform": "capitalize",
    //             },
    //           ],
    //         },
    //         {
    //           type: "custom:button-card",
    //           entity: "switch.rpi_aiy",
    //           name: "RPi AIY",
    //           icon: "mdi:raspberrypi",
    //           color: "rgb(250, 218, 79)",
    //           color_type: "icon",
    //           style: [
    //             {
    //               "font-size": "12px",
    //             },
    //             {
    //               "text-transform": "capitalize",
    //             },
    //           ],
    //         },
    //         {
    //           type: "custom:button-card",
    //           entity: "switch.toshibaaio",
    //           name: "Toshiba",
    //           icon: "mdi:desktop-mac-dashboard",
    //           color: "rgb(250, 218, 79)",
    //           color_type: "icon",
    //           style: [
    //             {
    //               "font-size": "12px",
    //             },
    //             {
    //               "text-transform": "capitalize",
    //             },
    //           ],
    //         },
    //         {
    //           type: "custom:button-card",
    //           entity: "switch.samsung_tv",
    //           name: "Samsung TV",
    //           icon: "mdi:television-classic",
    //           color: "rgb(250, 218, 79)",
    //           color_type: "icon",
    //           style: [
    //             {
    //               "font-size": "12px",
    //             },
    //             {
    //               "text-transform": "capitalize",
    //             },
    //           ],
    //         },
    //       ],
    //     },
    //     {
    //       type: "entities",
    //       title: "Arlo",
    //       show_header_toggle: false,
    //       entities: [
    //         "sensor.battery_level_arlolivingroom",
    //         "sensor.captured_today_arlolivingroom",
    //         "sensor.signal_strength_arlolivingroom",
    //         "sensor.battery_level_livingroom2",
    //         "sensor.captured_today_livingroom2",
    //         "sensor.signal_strength_livingroom2",
    //         "sensor.battery_level_arlo3",
    //         "sensor.captured_today_arlo3",
    //         "sensor.signal_strength_arlo3",
    //       ],
    //     },
    //     {
    //       type: "entities",
    //       title: "USCIS",
    //       show_header_toggle: false,
    //       entities: [
    //         "sensor.alok_485",
    //         "sensor.rashmi_485",
    //         "sensor.arnav_485",
    //       ],
    //     },
    //   ],
    // },
    // {
    //   icon: "mdi:test-tube",
    //   id: "test",
    //   title: "Testing",
    //   cards: [
    //     {
    //       type: "custom:pc-card",
    //     },
    //     {
    //       type: "vertical-stack",
    //       cards: [
    //         {
    //           type: "horizontal-stack",
    //           cards: [
    //             {
    //               type: "gauge",
    //               name: "Dow Futures",
    //               unit: "%",
    //               entity: "sensor.dow_futures_change_pct",
    //               min: -8,
    //               max: 8,
    //               severity: {
    //                 red: -8,
    //                 yellow: -2,
    //                 green: 0,
    //               },
    //             },
    //             {
    //               type: "gauge",
    //               name: "Technology",
    //               unit: "%",
    //               entity: "sensor.information_technology",
    //               min: -6,
    //               max: 6,
    //               severity: {
    //                 red: -6,
    //                 yellow: -2,
    //                 green: 0,
    //               },
    //             },
    //             {
    //               type: "gauge",
    //               name: "Real Estate",
    //               unit: "%",
    //               entity: "sensor.real_estate",
    //               min: -6,
    //               max: 6,
    //               severity: {
    //                 red: -6,
    //                 yellow: -2,
    //                 green: 0,
    //               },
    //             },
    //           ],
    //         },
    //         {
    //           type: "horizontal-stack",
    //           cards: [
    //             {
    //               type: "gauge",
    //               name: "Finance",
    //               unit: "%",
    //               entity: "sensor.financials",
    //               min: -6,
    //               max: 6,
    //               severity: {
    //                 red: -6,
    //                 yellow: -2,
    //                 green: 0,
    //               },
    //             },
    //             {
    //               type: "gauge",
    //               name: "Industrial",
    //               unit: "%",
    //               entity: "sensor.industrials",
    //               min: -6,
    //               max: 6,
    //               severity: {
    //                 red: -6,
    //                 yellow: -2,
    //                 green: 0,
    //               },
    //             },
    //             {
    //               type: "gauge",
    //               name: "Utilities",
    //               unit: "%",
    //               entity: "sensor.utilities",
    //               min: -6,
    //               max: 6,
    //               severity: {
    //                 red: -6,
    //                 yellow: -2,
    //                 green: 0,
    //               },
    //             },
    //           ],
    //         },
    //         {
    //           type: "horizontal-stack",
    //           cards: [
    //             {
    //               type: "gauge",
    //               name: "Materials",
    //               unit: "%",
    //               entity: "sensor.materials",
    //               min: -6,
    //               max: 6,
    //               severity: {
    //                 red: -6,
    //                 yellow: -2,
    //                 green: 0,
    //               },
    //             },
    //             {
    //               type: "gauge",
    //               name: "Telecom",
    //               unit: "%",
    //               entity: "sensor.communication_services",
    //               min: -6,
    //               max: 6,
    //               severity: {
    //                 red: -6,
    //                 yellow: -2,
    //                 green: 0,
    //               },
    //             },
    //             {
    //               type: "gauge",
    //               name: "Energy",
    //               unit: "%",
    //               entity: "sensor.energy",
    //               min: -6,
    //               max: 6,
    //               severity: {
    //                 red: -6,
    //                 yellow: -2,
    //                 green: 0,
    //               },
    //             },
    //           ],
    //         },
    //         {
    //           type: "horizontal-stack",
    //           cards: [
    //             {
    //               type: "gauge",
    //               name: "Staples",
    //               unit: "%",
    //               entity: "sensor.consumer_staples",
    //               min: -6,
    //               max: 6,
    //               severity: {
    //                 red: -6,
    //                 yellow: -2,
    //                 green: 0,
    //               },
    //             },
    //             {
    //               type: "gauge",
    //               name: "Discretionary",
    //               unit: "%",
    //               entity: "sensor.consumer_discretionary",
    //               min: -6,
    //               max: 6,
    //               severity: {
    //                 red: -6,
    //                 yellow: -2,
    //                 green: 0,
    //               },
    //             },
    //             {
    //               type: "gauge",
    //               name: "Health",
    //               unit: "%",
    //               entity: "sensor.health_care",
    //               min: -6,
    //               max: 6,
    //               severity: {
    //                 red: -6,
    //                 yellow: -2,
    //                 green: 0,
    //               },
    //             },
    //           ],
    //         },
    //       ],
    //     },
    //     {
    //       type: "vertical-stack",
    //       cards: [
    //         {
    //           type: "horizontal-stack",
    //           cards: [
    //             {
    //               type: "custom:button-card",
    //               entity: "switch.backyardmotion",
    //               name: "Backyard",
    //               icon: "mdi:camera",
    //               color: "rgb(250, 218, 79)",
    //               color_type: "icon",
    //               style: [
    //                 {
    //                   "font-size": "12px",
    //                 },
    //                 {
    //                   "text-transform": "capitalize",
    //                 },
    //               ],
    //             },
    //             {
    //               type: "custom:button-card",
    //               entity: "binary_sensor.backyard_motion",
    //               name: "Motion",
    //               icon: "mdi:run",
    //               action: "more_info",
    //               default_color: "rgb(255, 255, 255)",
    //               color: "rgb(250, 218, 79)",
    //               color_type: "icon",
    //               style: [
    //                 {
    //                   "font-size": "12px",
    //                 },
    //                 {
    //                   "text-transform": "capitalize",
    //                 },
    //               ],
    //             },
    //             {
    //               type: "custom:button-card",
    //               entity: "binary_sensor.backyard_line_crossing",
    //               name: "Crossing",
    //               icon: "mdi:format-vertical-align-center",
    //               action: "more_info",
    //               color: "rgb(250, 218, 79)",
    //               default_color: "rgb(255, 255, 255)",
    //               color_type: "icon",
    //               style: [
    //                 {
    //                   "font-size": "12px",
    //                 },
    //                 {
    //                   "text-transform": "capitalize",
    //                 },
    //               ],
    //             },
    //             {
    //               type: "custom:button-card",
    //               entity: "binary_sensor.backyard_field_detection",
    //               name: "Intrusion",
    //               icon: "mdi:aspect-ratio",
    //               action: "more_info",
    //               color: "rgb(250, 218, 79)",
    //               default_color: "rgb(255, 255, 255)",
    //               color_type: "icon",
    //               style: [
    //                 {
    //                   "font-size": "12px",
    //                 },
    //                 {
    //                   "text-transform": "capitalize",
    //                 },
    //               ],
    //             },
    //             {
    //               type: "custom:button-card",
    //               entity: "binary_sensor.backyard_face_detection",
    //               name: "Face",
    //               icon: "mdi:face-outline",
    //               action: "more_info",
    //               color: "rgb(250, 218, 79)",
    //               default_color: "rgb(255, 255, 255)",
    //               color_type: "icon",
    //               style: [
    //                 {
    //                   "font-size": "12px",
    //                 },
    //                 {
    //                   "text-transform": "capitalize",
    //                 },
    //               ],
    //             },
    //           ],
    //         },
    //         {
    //           type: "horizontal-stack",
    //           cards: [
    //             {
    //               type: "custom:button-card",
    //               entity: "switch.patiomotion",
    //               name: "Patio",
    //               icon: "mdi:camera",
    //               color: "rgb(250, 218, 79)",
    //               color_type: "icon",
    //               style: [
    //                 {
    //                   "font-size": "12px",
    //                 },
    //                 {
    //                   "text-transform": "capitalize",
    //                 },
    //               ],
    //             },
    //             {
    //               type: "custom:button-card",
    //               entity: "binary_sensor.patio_motion",
    //               name: "Motion",
    //               icon: "mdi:run",
    //               action: "more_info",
    //               default_color: "rgb(255, 255, 255)",
    //               color: "rgb(250, 218, 79)",
    //               color_type: "icon",
    //               style: [
    //                 {
    //                   "font-size": "12px",
    //                 },
    //                 {
    //                   "text-transform": "capitalize",
    //                 },
    //               ],
    //             },
    //             {
    //               type: "custom:button-card",
    //               entity: "binary_sensor.patio_line_crossing",
    //               name: "Crossing",
    //               icon: "mdi:format-vertical-align-center",
    //               action: "more_info",
    //               color: "rgb(250, 218, 79)",
    //               default_color: "rgb(255, 255, 255)",
    //               color_type: "icon",
    //               style: [
    //                 {
    //                   "font-size": "12px",
    //                 },
    //                 {
    //                   "text-transform": "capitalize",
    //                 },
    //               ],
    //             },
    //             {
    //               type: "custom:button-card",
    //               entity: "binary_sensor.patio_field_detection",
    //               name: "Intrusion",
    //               icon: "mdi:aspect-ratio",
    //               action: "more_info",
    //               color: "rgb(250, 218, 79)",
    //               default_color: "rgb(255, 255, 255)",
    //               color_type: "icon",
    //               style: [
    //                 {
    //                   "font-size": "12px",
    //                 },
    //                 {
    //                   "text-transform": "capitalize",
    //                 },
    //               ],
    //             },
    //             {
    //               type: "custom:button-card",
    //               entity: "binary_sensor.patio_face_detection",
    //               name: "Patio Face",
    //               icon: "mdi:face-outline",
    //               action: "more_info",
    //               color: "rgb(250, 218, 79)",
    //               default_color: "rgb(255, 255, 255)",
    //               color_type: "icon",
    //               style: [
    //                 {
    //                   "font-size": "12px",
    //                 },
    //                 {
    //                   "text-transform": "capitalize",
    //                 },
    //               ],
    //             },
    //           ],
    //         },
    //         {
    //           type: "horizontal-stack",
    //           cards: [
    //             {
    //               type: "custom:button-card",
    //               entity: "switch.drivewaymotion",
    //               name: "Driveway",
    //               icon: "mdi:camera",
    //               color: "rgb(250, 218, 79)",
    //               color_type: "icon",
    //               style: [
    //                 {
    //                   "font-size": "12px",
    //                 },
    //                 {
    //                   "text-transform": "capitalize",
    //                 },
    //               ],
    //             },
    //             {
    //               type: "custom:button-card",
    //               entity: "binary_sensor.driveway_motion",
    //               name: "Motion",
    //               icon: "mdi:run",
    //               action: "more_info",
    //               default_color: "rgb(255, 255, 255)",
    //               color: "rgb(250, 218, 79)",
    //               color_type: "icon",
    //               style: [
    //                 {
    //                   "font-size": "12px",
    //                 },
    //                 {
    //                   "text-transform": "capitalize",
    //                 },
    //               ],
    //             },
    //             {
    //               type: "custom:button-card",
    //               entity: "binary_sensor.driveway_line_crossing",
    //               name: "Crossing",
    //               icon: "mdi:format-vertical-align-center",
    //               action: "more_info",
    //               color: "rgb(250, 218, 79)",
    //               default_color: "rgb(255, 255, 255)",
    //               color_type: "icon",
    //               style: [
    //                 {
    //                   "font-size": "12px",
    //                 },
    //                 {
    //                   "text-transform": "capitalize",
    //                 },
    //               ],
    //             },
    //             {
    //               type: "custom:button-card",
    //               entity: "binary_sensor.driveway_field_detection",
    //               name: "Intrusion",
    //               icon: "mdi:aspect-ratio",
    //               action: "more_info",
    //               color: "rgb(250, 218, 79)",
    //               default_color: "rgb(255, 255, 255)",
    //               color_type: "icon",
    //               style: [
    //                 {
    //                   "font-size": "12px",
    //                 },
    //                 {
    //                   "text-transform": "capitalize",
    //                 },
    //               ],
    //             },
    //             {
    //               type: "custom:button-card",
    //               entity: "binary_sensor.driveway_face_detection",
    //               name: "Face",
    //               icon: "mdi:face-outline",
    //               action: "more_info",
    //               color: "rgb(250, 218, 79)",
    //               default_color: "rgb(255, 255, 255)",
    //               color_type: "icon",
    //               style: [
    //                 {
    //                   "font-size": "12px",
    //                 },
    //                 {
    //                   "text-transform": "capitalize",
    //                 },
    //               ],
    //             },
    //           ],
    //         },
    //         {
    //           type: "horizontal-stack",
    //           cards: [
    //             {
    //               type: "custom:button-card",
    //               entity: "switch.porchmotion",
    //               name: "Porch",
    //               icon: "mdi:camera",
    //               color: "rgb(250, 218, 79)",
    //               color_type: "icon",
    //               style: [
    //                 {
    //                   "font-size": "12px",
    //                 },
    //                 {
    //                   "text-transform": "capitalize",
    //                 },
    //               ],
    //             },
    //             {
    //               type: "custom:button-card",
    //               entity: "binary_sensor.porch_motion",
    //               name: "Motion",
    //               icon: "mdi:run",
    //               action: "more_info",
    //               default_color: "rgb(255, 255, 255)",
    //               color: "rgb(250, 218, 79)",
    //               color_type: "icon",
    //               style: [
    //                 {
    //                   "font-size": "12px",
    //                 },
    //                 {
    //                   "text-transform": "capitalize",
    //                 },
    //               ],
    //             },
    //             {
    //               type: "custom:button-card",
    //               entity: "binary_sensor.porch_line_crossing",
    //               name: "Crossing",
    //               icon: "mdi:format-vertical-align-center",
    //               action: "more_info",
    //               color: "rgb(250, 218, 79)",
    //               default_color: "rgb(255, 255, 255)",
    //               color_type: "icon",
    //               style: [
    //                 {
    //                   "font-size": "12px",
    //                 },
    //                 {
    //                   "text-transform": "capitalize",
    //                 },
    //               ],
    //             },
    //             {
    //               type: "custom:button-card",
    //               entity: "binary_sensor.porch_field_detection",
    //               name: "Intrusion",
    //               icon: "mdi:aspect-ratio",
    //               action: "more_info",
    //               color: "rgb(250, 218, 79)",
    //               default_color: "rgb(255, 255, 255)",
    //               color_type: "icon",
    //               style: [
    //                 {
    //                   "font-size": "12px",
    //                 },
    //                 {
    //                   "text-transform": "capitalize",
    //                 },
    //               ],
    //             },
    //             {
    //               type: "custom:button-card",
    //               entity: "binary_sensor.porch_face_detection",
    //               name: "Face",
    //               icon: "mdi:face-outline",
    //               action: "more_info",
    //               color: "rgb(250, 218, 79)",
    //               default_color: "rgb(255, 255, 255)",
    //               color_type: "icon",
    //               style: [
    //                 {
    //                   "font-size": "12px",
    //                 },
    //                 {
    //                   "text-transform": "capitalize",
    //                 },
    //               ],
    //             },
    //           ],
    //         },
    //       ],
    //     },
    //     {
    //       type: "custom:calendar-card",
    //       entities: [
    //         "calendar.personal",
    //         "calendar.work",
    //         "calendar.us_holidays",
    //       ],
    //     },
    //     {
    //       type: "sensor",
    //       entity: "sensor.illumination_158d00016c53bf",
    //       graph: "line",
    //     },
    //     {
    //       type: "picture-elements",
    //       image: "/assets/arsaboo/icons/remote2.png",
    //       elements: [
    //         {
    //           type: "image",
    //           image: "/assets/arsaboo/icons/music_right.png",
    //           title: "Right",
    //           style: {
    //             top: "79.5%",
    //             left: "57%",
    //             width: "8%",
    //             padding: "0px",
    //             opacity: 0,
    //           },
    //           tap_action: {
    //             action: "call-service",
    //           },
    //           service: "remote.send_command",
    //           service_data: {
    //             entity_id: "remote.livingroom",
    //             command: "DirectionRight",
    //             device: 31747959,
    //           },
    //         },
    //         {
    //           type: "image",
    //           image: "/assets/arsaboo/icons/music_left.png",
    //           title: "Left",
    //           tap_action: {
    //             action: "call-service",
    //           },
    //           style: {
    //             top: "79.5%",
    //             left: "43%",
    //             width: "8%",
    //             padding: "0px",
    //             opacity: 0,
    //           },
    //           service: "remote.send_command",
    //           service_data: {
    //             entity_id: "remote.livingroom",
    //             command: "DirectionLeft",
    //             device: 31747959,
    //           },
    //         },
    //         {
    //           type: "image",
    //           image: "/assets/arsaboo/icons/music_up.png",
    //           title: "Up",
    //           tap_action: {
    //             action: "call-service",
    //           },
    //           style: {
    //             top: "72%",
    //             left: "50%",
    //             width: "8%",
    //             padding: "0px",
    //             opacity: 0,
    //           },
    //           service: "remote.send_command",
    //           service_data: {
    //             entity_id: "remote.livingroom",
    //             command: "DirectionUp",
    //             device: 31747959,
    //           },
    //         },
    //         {
    //           type: "image",
    //           image: "/assets/arsaboo/icons/music_down.png",
    //           title: "Down",
    //           tap_action: {
    //             action: "call-service",
    //           },
    //           style: {
    //             top: "87%",
    //             left: "50%",
    //             width: "8%",
    //             padding: "0px",
    //             opacity: 0,
    //           },
    //           service: "remote.send_command",
    //           service_data: {
    //             entity_id: "remote.livingroom",
    //             command: "DirectionDown",
    //             device: 31747959,
    //           },
    //         },
    //         {
    //           type: "icon",
    //           icon: "mdi:minus",
    //           title: "Channel Down",
    //           tap_action: {
    //             action: "call-service",
    //           },
    //           style: {
    //             top: "89%",
    //             left: "36.5%",
    //             width: "8%",
    //             padding: "0px",
    //             color: "rgb(54,64,74)",
    //           },
    //           service: "remote.send_command",
    //           service_data: {
    //             entity_id: "remote.livingroom",
    //             command: "ChannelDown",
    //             device: 56988979,
    //           },
    //         },
    //         {
    //           type: "icon",
    //           icon: "mdi:plus",
    //           title: "Channel Up",
    //           tap_action: {
    //             action: "call-service",
    //           },
    //           style: {
    //             top: "70.5%",
    //             left: "36.5%",
    //             width: "8%",
    //             padding: "0px",
    //             color: "rgb(54,64,74)",
    //           },
    //           service: "remote.send_command",
    //           service_data: {
    //             entity_id: "remote.livingroom",
    //             command: "ChannelUp",
    //             device: 56988979,
    //           },
    //         },
    //         {
    //           type: "icon",
    //           icon: "mdi:volume-plus",
    //           title: "Volume Up",
    //           tap_action: {
    //             action: "call-service",
    //           },
    //           style: {
    //             top: "70.6%",
    //             left: "67%",
    //             width: "7.5%",
    //             padding: "0px",
    //             color: "rgb(54,64,74)",
    //           },
    //           service: "remote.send_command",
    //           service_data: {
    //             entity_id: "remote.livingroom",
    //             command: "VolumeUp",
    //             device: 31747960,
    //           },
    //         },
    //         {
    //           type: "icon",
    //           icon: "mdi:volume-minus",
    //           title: "Volume Down",
    //           tap_action: {
    //             action: "call-service",
    //           },
    //           style: {
    //             top: "88.8%",
    //             left: "67%",
    //             width: "7.5%",
    //             padding: "0px",
    //             color: "rgb(54,64,74)",
    //           },
    //           service: "remote.send_command",
    //           service_data: {
    //             entity_id: "remote.livingroom",
    //             command: "VolumeDown",
    //             device: 31747960,
    //           },
    //         },
    //         {
    //           type: "icon",
    //           icon: "mdi:circle",
    //           title: "Select",
    //           tap_action: {
    //             action: "call-service",
    //           },
    //           style: {
    //             top: "79.6%",
    //             left: "49.6%",
    //             width: "7.5%",
    //             padding: "0px",
    //             opacity: 0,
    //             color: "rgb(54,64,74)",
    //             "--iron-icon-height": "40px",
    //             "--iron-icon-width": "40px",
    //           },
    //           service: "remote.send_command",
    //           service_data: {
    //             entity_id: "remote.livingroom",
    //             command: "Select",
    //             device: 31747959,
    //           },
    //         },
    //         {
    //           type: "icon",
    //           icon: "mdi:numeric-1-box-outline",
    //           title: "Number 1",
    //           tap_action: {
    //             action: "call-service",
    //           },
    //           style: {
    //             top: "27%",
    //             left: "36.5%",
    //             width: "7.5%",
    //             padding: "0px",
    //             color: "rgb(54,64,74)",
    //           },
    //           service: "remote.send_command",
    //           service_data: {
    //             entity_id: "remote.livingroom",
    //             command: "Number1",
    //             device: 31747959,
    //           },
    //         },
    //         {
    //           type: "icon",
    //           icon: "mdi:numeric-2-box-outline",
    //           title: "Number 2",
    //           tap_action: {
    //             action: "call-service",
    //           },
    //           style: {
    //             top: "27%",
    //             left: "51.5%",
    //             width: "7.5%",
    //             padding: "0px",
    //             color: "rgb(54,64,74)",
    //           },
    //           service: "remote.send_command",
    //           service_data: {
    //             entity_id: "remote.livingroom",
    //             command: "Number2",
    //             device: 31747959,
    //           },
    //         },
    //         {
    //           type: "icon",
    //           icon: "mdi:numeric-3-box-outline",
    //           title: "Number 3",
    //           tap_action: {
    //             action: "call-service",
    //           },
    //           style: {
    //             top: "27%",
    //             left: "66%",
    //             width: "7.5%",
    //             padding: "0px",
    //             color: "rgb(54,64,74)",
    //           },
    //           service: "remote.send_command",
    //           service_data: {
    //             entity_id: "remote.livingroom",
    //             command: "Number3",
    //             device: 31747959,
    //           },
    //         },
    //         {
    //           type: "icon",
    //           icon: "mdi:numeric-4-box-outline",
    //           title: "Number 4",
    //           tap_action: {
    //             action: "call-service",
    //           },
    //           style: {
    //             top: "37%",
    //             left: "36.5%",
    //             width: "7.5%",
    //             padding: "0px",
    //             color: "rgb(54,64,74)",
    //           },
    //           service: "remote.send_command",
    //           service_data: {
    //             entity_id: "remote.livingroom",
    //             command: "Number4",
    //             device: 31747959,
    //           },
    //         },
    //         {
    //           type: "icon",
    //           icon: "mdi:numeric-5-box-outline",
    //           title: "Number 5",
    //           tap_action: {
    //             action: "call-service",
    //           },
    //           style: {
    //             top: "37%",
    //             left: "51.5%",
    //             width: "7.5%",
    //             padding: "0px",
    //             color: "rgb(54,64,74)",
    //           },
    //           service: "remote.send_command",
    //           service_data: {
    //             entity_id: "remote.livingroom",
    //             command: "Number5",
    //             device: 31747959,
    //           },
    //         },
    //         {
    //           type: "icon",
    //           icon: "mdi:numeric-6-box-outline",
    //           title: "Number 6",
    //           tap_action: {
    //             action: "call-service",
    //           },
    //           style: {
    //             top: "37%",
    //             left: "66%",
    //             width: "7.5%",
    //             padding: "0px",
    //             color: "rgb(54,64,74)",
    //           },
    //           service: "remote.send_command",
    //           service_data: {
    //             entity_id: "remote.livingroom",
    //             command: "Number6",
    //             device: 31747959,
    //           },
    //         },
    //         {
    //           type: "icon",
    //           icon: "mdi:numeric-7-box-outline",
    //           title: "Number 7",
    //           tap_action: {
    //             action: "call-service",
    //           },
    //           style: {
    //             top: "47%",
    //             left: "36.5%",
    //             width: "7.5%",
    //             padding: "0px",
    //             color: "rgb(54,64,74)",
    //           },
    //           service: "remote.send_command",
    //           service_data: {
    //             entity_id: "remote.livingroom",
    //             command: "Number7",
    //             device: 31747959,
    //           },
    //         },
    //         {
    //           type: "icon",
    //           icon: "mdi:numeric-8-box-outline",
    //           title: "Number 8",
    //           tap_action: {
    //             action: "call-service",
    //           },
    //           style: {
    //             top: "47%",
    //             left: "51.5%",
    //             width: "7.5%",
    //             padding: "0px",
    //             color: "rgb(54,64,74)",
    //           },
    //           service: "remote.send_command",
    //           service_data: {
    //             entity_id: "remote.livingroom",
    //             command: "Number8",
    //             device: 31747959,
    //           },
    //         },
    //         {
    //           type: "icon",
    //           icon: "mdi:numeric-9-box-outline",
    //           title: "Number 9",
    //           tap_action: {
    //             action: "call-service",
    //           },
    //           style: {
    //             top: "47%",
    //             left: "66%",
    //             width: "7.5%",
    //             padding: "0px",
    //             color: "rgb(54,64,74)",
    //           },
    //           service: "remote.send_command",
    //           service_data: {
    //             entity_id: "remote.livingroom",
    //             command: "Number9",
    //             device: 31747959,
    //           },
    //         },
    //         {
    //           type: "icon",
    //           icon: "mdi:numeric-0-box-outline",
    //           title: "Number 0",
    //           tap_action: {
    //             action: "call-service",
    //           },
    //           style: {
    //             top: "57%",
    //             left: "51.5%",
    //             width: "7.5%",
    //             padding: "0px",
    //             color: "rgb(54,64,74)",
    //           },
    //           service: "remote.send_command",
    //           service_data: {
    //             entity_id: "remote.livingroom",
    //             command: "Number0",
    //             device: 31747959,
    //           },
    //         },
    //         {
    //           type: "icon",
    //           icon: "mdi:kodi",
    //           title: "Kodi",
    //           tap_action: {
    //             action: "call-service",
    //           },
    //           style: {
    //             top: "12%",
    //             left: "36.7%",
    //             width: "7.5%",
    //             padding: "0px",
    //             color: "rgb(54,64,74)",
    //           },
    //           service: "remote.send_command",
    //           service_data: {
    //             entity_id: "remote.livingroom",
    //             activity: 18032761,
    //           },
    //         },
    //         {
    //           type: "icon",
    //           icon: "mdi:power",
    //           title: "Kodi",
    //           tap_action: {
    //             action: "call-service",
    //           },
    //           style: {
    //             top: "12%",
    //             left: "66%",
    //             width: "7.5%",
    //             padding: "0px",
    //             color: "rgb(54,64,74)",
    //           },
    //           service: "remote.send_command",
    //           service_data: {
    //             entity_id: "remote.livingroom",
    //             activity: "PowerOff",
    //           },
    //         },
    //       ],
    //     },
    //     {
    //       type: "map",
    //       entities: [
    //         {
    //           entity: "device_tracker.meta_alok",
    //         },
    //         {
    //           entity: "device_tracker.meta_rashmi",
    //         },
    //         "zone.home",
    //       ],
    //     },
    //     {
    //       type: "conditional",
    //       conditions: [
    //         {
    //           entity: "input_boolean.devmode",
    //           state: "on",
    //         },
    //       ],
    //       card: {
    //         type: "custom:monster-card",
    //         card: {
    //           type: "entities",
    //           title: "All Automations",
    //         },
    //         filter: {
    //           include: [
    //             {
    //               domain: "automation",
    //             },
    //           ],
    //         },
    //       },
    //     },
    //   ],
    // },
  ],
});
