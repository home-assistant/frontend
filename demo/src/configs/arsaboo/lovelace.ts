import { DemoConfig } from "../types";

export const demoLovelaceArsaboo: DemoConfig["lovelace"] = (localize) => ({
  title: "Home Assistant",
  views: [
    {
      icon: "hass:home-assistant",
      id: "home",
      title: "Home",
      cards: [
        { type: "custom:ha-demo-card" },
        {
          type: "entities",
          title: localize("ui.panel.page-demo.config.arsaboo.labels.lights"),
          entities: [
            {
              entity: "light.kitchen_lights",
            },
            {
              entity: "light.living_room_lights",
            },
            {
              entity: "switch.wemoporch",
            },
            "light.lifx5",
            {
              type: "custom:cast-demo-row",
            },
          ],
        },
        {
          type: "thermostat",
          entity: "climate.upstairs",
        },

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
          type: "media-control",
          entity: "media_player.family_room_2",
        },
        {
          type: "entities",
          title: localize(
            "ui.panel.page-demo.config.arsaboo.labels.information"
          ),
          show_header_toggle: false,
          entities: [
            "sensor.morning_commute",
            "sensor.alok_to_home",
            "sensor.plexspy",
            "sensor.usdinr",
          ],
        },

        {
          type: "alarm-panel",
          entity: "alarm_control_panel.abode_alarm",
          name: "Security",
          states: ["arm_home", "arm_away"],
        },
        {
          type: "entities",
          title: localize(
            "ui.panel.page-demo.config.arsaboo.labels.entertainment"
          ),
          show_header_toggle: false,
          entities: [
            "sensor.living_room",
            "input_select.livingroomharmony",
            "input_select.hdmiswitcher",
            "input_select.hdmiinput",
            "input_number.harmonyvolume",
            "sensor.total_tv_time",
            "script.tv_off",
          ],
        },
        {
          type: "sensor",
          entity: "sensor.study_temp",
          graph: "line",
        },
        {
          type: "entities",
          title: "Doorbell",
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
  ],
});
