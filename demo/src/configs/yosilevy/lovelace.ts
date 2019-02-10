import { LovelaceConfig } from "../../../../src/data/lovelace";

export const demoLovelaceYosilevy: () => LovelaceConfig = () => ({
  resources: [
    // {
    //   type: "js",
    //   url: "/assets/yosilevy/custom-lovelace/time-input-row.js",
    // },
    // {
    //   type: "js",
    //   url: "/assets/yosilevy/custom-lovelace/fold-entity-row.js",
    // },
    // {
    //   type: "js",
    //   url: "/assets/yosilevy/custom-lovelace/moment.js?v=999",
    // },
    // {
    //   type: "js",
    //   url: "/assets/yosilevy/custom-lovelace/calendar-card.js?v=1.1.4",
    // },
    // {
    //   type: "module",
    //   url: "/assets/yosilevy/custom-lovelace/swipe-card/swipe-card.js?v=0.0.3",
    // },
    // {
    //   type: "module",
    //   url: "/assets/yosilevy/custom-lovelace/card-tools.js?0.0.1",
    // },
    // {
    //   type: "module",
    //   url: "/assets/yosilevy/custom-lovelace/card-modder.js?0.0.1",
    // },
  ],
  title: "בית",
  views: [
    {
      title: "בית",
      cards: [
        { type: "custom:ha-demo-card" },
        {
          elements: [
            {
              tap_action: {
                action: "toggle",
              },
              style: {
                top: "21%",
                width: "15%",
                left: "48.4%",
                height: "10%",
              },
              type: "image",
              state_image: {
                on: "/assets/yosilevy/LivingRoomMainLightSliceOn.png",
              },
              entity: "light.livingroom_light",
              image: "/assets/yosilevy/t.gif",
            },
            {
              tap_action: {
                action: "toggle",
              },
              style: {
                top: "20.5%",
                width: "10%",
                left: "6.8%",
                height: "23%",
              },
              type: "image",
              state_image: {
                on: "/assets/yosilevy/LivingRoomDimmerSliceOn.png",
              },
              entity: "light.livingroom_dimmer_light",
              image: "/assets/yosilevy/t.gif",
            },
            {
              tap_action: {
                action: "none",
              },
              style: {
                top: "43%",
                width: "25%",
                left: "53%",
                height: "13%",
              },
              image: "/assets/yosilevy/rect-402X152.png",
              type: "image",
            },
            {
              tap_action: {
                service_data: {
                  entity_id: "cover.livingroom_exterior_shutter",
                },
                service: "cover.open_cover",
                action: "call-service",
              },
              entity: "cover.livingroom_exterior_shutter",
              style: {
                color: "black",
                left: "44%",
                top: "40%",
              },
              type: "icon",
              icon: "hass:arrow-up",
            },
            {
              tap_action: {
                service_data: {
                  entity_id: "cover.livingroom_exterior_shutter",
                },
                service: "cover.stop_cover",
                action: "call-service",
              },
              entity: "cover.livingroom_exterior_shutter",
              style: {
                color: "black",
                left: "53%",
                top: "40%",
              },
              type: "icon",
              icon: "hass:stop",
            },
            {
              tap_action: {
                service_data: {
                  entity_id: "cover.livingroom_exterior_shutter",
                },
                service: "cover.close_cover",
                action: "call-service",
              },
              entity: "cover.livingroom_exterior_shutter",
              style: {
                color: "black",
                left: "62%",
                top: "40%",
              },
              type: "icon",
              icon: "hass:arrow-down",
            },
            {
              tap_action: {
                service_data: {
                  entity_id: "cover.livingroom_exterior_shutter",
                },
                service: "cover.stop_cover",
                action: "call-service",
              },
              entity: "sensor.livingroom_exterior_shutter_position",
              style: {
                color: "black",
                left: "53.1%",
                top: "45.5%",
              },
              type: "state-label",
            },
            {
              tap_action: {
                action: "none",
              },
              style: {
                top: "43%",
                width: "25%",
                left: "80.5%",
                height: "13%",
              },
              image: "/assets/yosilevy/rect-402X152.png",
              type: "image",
            },
            {
              tap_action: {
                service_data: {
                  entity_id: "cover.livingroom_front_left_shutter",
                },
                service: "cover.open_cover",
                action: "call-service",
              },
              entity: "cover.livingroom_front_left_shutter",
              style: {
                color: "black",
                left: "71.5%",
                top: "40%",
              },
              type: "icon",
              icon: "hass:arrow-up",
            },
            {
              tap_action: {
                service_data: {
                  entity_id: "cover.livingroom_front_left_shutter",
                },
                service: "cover.stop_cover",
                action: "call-service",
              },
              entity: "cover.livingroom_front_left_shutter",
              style: {
                color: "black",
                left: "80.5%",
                top: "40%",
              },
              type: "icon",
              icon: "hass:stop",
            },
            {
              tap_action: {
                service_data: {
                  entity_id: "cover.livingroom_front_left_shutter",
                },
                service: "cover.close_cover",
                action: "call-service",
              },
              entity: "cover.livingroom_front_left_shutter",
              style: {
                color: "black",
                left: "89.5%",
                top: "40%",
              },
              type: "icon",
              icon: "hass:arrow-down",
            },
            {
              tap_action: {
                service_data: {
                  entity_id: "cover.livingroom_front_left_shutter",
                },
                service: "cover.stop_cover",
                action: "call-service",
              },
              entity: "sensor.livingroom_front_left_shutter_position",
              style: {
                color: "black",
                left: "80.5%",
                top: "45.5%",
              },
              type: "state-label",
            },
            {
              tap_action: {
                action: "navigate",
              },
              style: {
                top: "65%",
                width: "23%",
                left: "80%",
                height: "30%",
              },
              type: "image",
              entity: "media_player.living_room_samsung",
              image: "/assets/yosilevy/t.gif",
              navigation_path: "/lovelace/1",
            },
          ],
          image: "/assets/yosilevy/LivingRoom.jpg",
          type: "picture-elements",
        },
        {
          elements: [
            {
              tap_action: {
                action: "toggle",
              },
              style: {
                top: "22.5%",
                width: "15.2%",
                left: "62.3%",
                height: "31%",
              },
              type: "image",
              state_image: {
                on: "/assets/yosilevy/KitchenDualLightNewOn.png",
              },
              entity: "light.kitchen_dual_light",
              image: "/assets/yosilevy/t.gif",
            },
            {
              tap_action: {
                action: "toggle",
              },
              style: {
                top: "16.9%",
                width: "8.9%",
                left: "61.2%",
                height: "5%",
              },
              type: "image",
              state_image: {
                on: "/assets/yosilevy/KitchenCenterLightNewOn.png",
              },
              entity: "light.kitchen_middle_light",
              image: "/assets/yosilevy/t.gif",
            },
            {
              tap_action: {
                action: "none",
              },
              style: {
                top: "46%",
                width: "25%",
                left: "15.5%",
                height: "13%",
              },
              image: "/assets/yosilevy/rect-402X152.png",
              type: "image",
            },
            {
              tap_action: {
                service_data: {
                  entity_id: "cover.livingroom_front_right_shutter",
                },
                service: "cover.open_cover",
                action: "call-service",
              },
              entity: "cover.livingroom_front_right_shutter",
              style: {
                color: "black",
                left: "6.5%",
                top: "43%",
              },
              type: "icon",
              icon: "hass:arrow-up",
            },
            {
              tap_action: {
                service_data: {
                  entity_id: "cover.livingroom_front_right_shutter",
                },
                service: "cover.stop_cover",
                action: "call-service",
              },
              entity: "cover.livingroom_front_right_shutter",
              style: {
                color: "black",
                left: "15.5%",
                top: "43%",
              },
              type: "icon",
              icon: "hass:stop",
            },
            {
              tap_action: {
                service_data: {
                  entity_id: "cover.livingroom_front_right_shutter",
                },
                service: "cover.close_cover",
                action: "call-service",
              },
              entity: "cover.livingroom_front_right_shutter",
              style: {
                color: "black",
                left: "24.5%",
                top: "43%",
              },
              type: "icon",
              icon: "hass:arrow-down",
            },
            {
              tap_action: {
                service_data: {
                  entity_id: "cover.livingroom_front_right_shutter",
                },
                service: "cover.stop_cover",
                action: "call-service",
              },
              entity: "sensor.livingroom_front_right_shutter_position",
              style: {
                color: "black",
                left: "15.5%",
                top: "48.5%",
              },
              type: "state-label",
            },
            {
              tap_action: {
                action: "none",
              },
              style: {
                top: "76%",
                width: "25%",
                left: "83.5%",
                height: "13%",
              },
              image: "/assets/yosilevy/rect-402X152.png",
              type: "image",
            },
            {
              tap_action: {
                service_data: {
                  entity_id: "cover.kitchen_shutter",
                },
                service: "cover.open_cover",
                action: "call-service",
              },
              entity: "cover.kitchen_shutter",
              style: {
                color: "black",
                left: "74.5%",
                top: "73%",
              },
              type: "icon",
              icon: "hass:arrow-up",
            },
            {
              tap_action: {
                service_data: {
                  entity_id: "cover.kitchen_shutter",
                },
                service: "cover.stop_cover",
                action: "call-service",
              },
              entity: "cover.kitchen_shutter",
              style: {
                color: "black",
                left: "83.5%",
                top: "73%",
              },
              type: "icon",
              icon: "hass:stop",
            },
            {
              tap_action: {
                service_data: {
                  entity_id: "cover.kitchen_shutter",
                },
                service: "cover.close_cover",
                action: "call-service",
              },
              entity: "cover.kitchen_shutter",
              style: {
                color: "black",
                left: "92.5%",
                top: "73%",
              },
              type: "icon",
              icon: "hass:arrow-down",
            },
            {
              tap_action: {
                service_data: {
                  entity_id: "cover.kitchen_shutter",
                },
                service: "cover.stop_cover",
                action: "call-service",
              },
              entity: "sensor.kitchen_shutter_position",
              style: {
                color: "black",
                left: "83.5%",
                top: "78.5%",
              },
              type: "state-label",
            },
          ],
          image: "/assets/yosilevy/Kitchen.jpg",
          type: "picture-elements",
        },
        {
          elements: [
            {
              tap_action: {
                action: "toggle",
              },
              style: {
                top: "7.9%",
                width: "9%",
                left: "72.8%",
                height: "12%",
              },
              type: "image",
              state_image: {
                on: "/assets/yosilevy/DinningSpotLightOn.png",
              },
              entity: "light.dinning_spot_light",
              image: "/assets/yosilevy/t.gif",
            },
            {
              tap_action: {
                action: "toggle",
              },
              style: {
                top: "33.7%",
                width: "7.2%",
                left: "31.4%",
                height: "10%",
              },
              type: "image",
              state_image: {
                on: "/assets/yosilevy/DinningDimmerLightOn.png",
              },
              entity: "light.dinning_dimmer_light",
              image: "/assets/yosilevy/t.gif",
            },
            {
              tap_action: {
                action: "none",
              },
              style: {
                top: "53%",
                width: "25%",
                left: "16%",
                height: "13%",
              },
              image: "/assets/yosilevy/rect-402X152.png",
              type: "image",
            },
            {
              tap_action: {
                service_data: {
                  entity_id: "cover.dinning_shutter",
                },
                service: "cover.open_cover",
                action: "call-service",
              },
              entity: "cover.dinning_shutter",
              style: {
                color: "black",
                left: "7%",
                top: "50%",
              },
              type: "icon",
              icon: "hass:arrow-up",
            },
            {
              tap_action: {
                service_data: {
                  entity_id: "cover.dinning_shutter",
                },
                service: "cover.stop_cover",
                action: "call-service",
              },
              entity: "cover.dinning_shutter",
              style: {
                color: "black",
                left: "16%",
                top: "50%",
              },
              type: "icon",
              icon: "hass:stop",
            },
            {
              tap_action: {
                service_data: {
                  entity_id: "cover.dinning_shutter",
                },
                service: "cover.close_cover",
                action: "call-service",
              },
              entity: "cover.dinning_shutter",
              style: {
                color: "black",
                left: "25%",
                top: "50%",
              },
              type: "icon",
              icon: "hass:arrow-down",
            },
            {
              tap_action: {
                service_data: {
                  entity_id: "cover.dinning_shutter",
                },
                service: "cover.stop_cover",
                action: "call-service",
              },
              entity: "sensor.dinning_shutter_position",
              style: {
                color: "black",
                left: "16.1%",
                top: "55.5%",
              },
              type: "state-label",
            },
          ],
          image: "/assets/yosilevy/DinningHall.jpg",
          type: "picture-elements",
        },
        {
          elements: [
            {
              tap_action: {
                action: "toggle",
              },
              style: {
                top: "62%",
                width: "23.5%",
                left: "22%",
                height: "47%",
              },
              type: "image",
              state_image: {
                on: "/assets/yosilevy/EntranceLightsOn.png",
              },
              entity: "light.entrance_light",
              image: "/assets/yosilevy/t.gif",
            },
            {
              tap_action: {
                action: "toggle",
              },
              style: {
                top: "30%",
                width: "6%",
                left: "57.5%",
                height: "11%",
              },
              type: "image",
              state_image: {
                on: "/assets/yosilevy/SpotLargeOn.png",
              },
              entity: "light.toilet_hall_light",
              image: "/assets/yosilevy/t.gif",
            },
            {
              tap_action: {
                action: "toggle",
              },
              style: {
                top: "86.5%",
                width: "23.5%",
                left: "56.5%",
                height: "28%",
              },
              type: "image",
              state_image: {
                on: "/assets/yosilevy/ToiletLightOn.jpg",
              },
              entity: "light.toilet_light",
              image: "/assets/yosilevy/t.gif",
            },
          ],
          image: "/assets/yosilevy/EntranceLandscape.jpg",
          type: "picture-elements",
        },
        {
          cards: [
            // {
            //   show_state: false,
            //   entities: [
            //     {
            //       hold_action: {
            //         action: "more-info",
            //       },
            //       tap_action: {
            //         action: "toggle",
            //       },
            //       entity: "light.corridor_all_light",
            //       name: "מסדרונות",
            //     },
            //     {
            //       hold_action: {
            //         action: "more-info",
            //       },
            //       tap_action: {
            //         action: "toggle",
            //       },
            //       entity: "light.corridor_entrance_light",
            //       name: "מעבר",
            //     },
            //     {
            //       hold_action: {
            //         action: "more-info",
            //       },
            //       tap_action: {
            //         action: "toggle",
            //       },
            //       entity: "light.corridor_one_light",
            //     },
            //     {
            //       hold_action: {
            //         action: "more-info",
            //       },
            //       tap_action: {
            //         action: "toggle",
            //       },
            //       entity: "light.corridor_two_light",
            //     },
            //     {
            //       hold_action: {
            //         action: "more-info",
            //       },
            //       tap_action: {
            //         action: "toggle",
            //       },
            //       entity: "light.corridor_dimmer_light",
            //     },
            //   ],
            //   type: "glance",
            // },
            {
              show_state: false,
              columns: 4,
              entities: [
                {
                  tap_action: {
                    action: "more-info",
                  },
                  entity:
                    "scene.livingroom_kitchen_all_shutters_light_position",
                  name: "תריסים אור",
                },
                {
                  tap_action: {
                    action: "more-info",
                  },
                  entity: "cover.shutters_three",
                  name: "3 תריסים",
                },
                {
                  tap_action: {
                    action: "more-info",
                  },
                  entity: "cover.shutters_four",
                  name: "4 תריסים",
                },
                {
                  hold_action: {
                    action: "more-info",
                  },
                  tap_action: {
                    action: "toggle",
                  },
                  entity: "light.telephone",
                  name: "טלפון",
                },
                {
                  hold_action: {
                    action: "more-info",
                  },
                  tap_action: {
                    action: "toggle",
                  },
                  entity: "light.exterior_all_light",
                  name: "חוץ כללי",
                },
                {
                  hold_action: {
                    action: "more-info",
                  },
                  tap_action: {
                    action: "toggle",
                  },
                  entity: "light.kitchen_exterior_light",
                  name: "חוץ מטבח",
                },
                {
                  hold_action: {
                    action: "more-info",
                  },
                  tap_action: {
                    action: "toggle",
                  },
                  entity: "light.front_exterior_light",
                  name: "חוץ חזית",
                },
                {
                  hold_action: {
                    action: "more-info",
                  },
                  tap_action: {
                    action: "toggle",
                  },
                  entity: "light.livingroom_exterior_light",
                  name: "חוץ סלון",
                },
                {
                  hold_action: {
                    action: "more-info",
                  },
                  tap_action: {
                    action: "toggle",
                  },
                  entity: "script.turn_off_all_lights",
                  name: "כיבוי אורות",
                },
                {
                  tap_action: {
                    action: "more-info",
                  },
                  entity: "scene.shutdown_shutters_and_heaters",
                  name: "כיבוי כללי",
                },
                {
                  tap_action: {
                    action: "more-info",
                  },
                  entity: "scene.shutdown_night",
                  name: "כיבוי לילה",
                },
                {
                  tap_action: {
                    action: "more-info",
                  },
                  entity: "scene.parents_full_shutdown",
                  name: "כיבוי הורים",
                },
              ],
              type: "glance",
            },
            {
              entities: ["sensor.on_light_list"],
              show_header_toggle: false,
              type: "entities",
            },
            {
              image: "/assets/yosilevy/garden.jpg",
              type: "picture-elements",
              elements: [
                {
                  entity: "sensor.front_garden_moisture",
                  style: {
                    color: "white",
                    left: "10%",
                    "--ha-label-badge-font-size": "1em",
                    top: "27%",
                  },
                  type: "state-badge",
                },
                {
                  entity: "sensor.front_garden_conductivity",
                  style: {
                    color: "white",
                    left: "25%",
                    "--ha-label-badge-font-size": "1em",
                    top: "27%",
                  },
                  type: "state-badge",
                },
                {
                  entity: "sensor.front_garden_battery",
                  style: {
                    color: "white",
                    left: "40%",
                    "--ha-label-badge-font-size": "1em",
                    top: "27%",
                  },
                  type: "state-badge",
                },
                {
                  entity: "sensor.front_garden_temperature",
                  style: {
                    direction: "ltr",
                    color: "white",
                    left: "92%",
                    "--ha-label-badge-font-size": "1em",
                    top: "15%",
                  },
                  type: "state-label",
                },
                {
                  entity: "sensor.garden_problem",
                  style: {
                    direction: "ltr",
                    color: "white",
                    left: "50%",
                    "--ha-label-badge-font-size": "1em",
                    top: "85%",
                  },
                  type: "state-label",
                },
              ],
            },
          ],
          type: "vertical-stack",
        },
      ],
      icon: "mdi:home",
    },
    {
      title: "מדיה",
      cards: [
        {
          elements: [
            {
              tap_action: {
                action: "toggle",
              },
              style: {
                "z-index": 2,
                width: "13.5%",
                filter: "invert(0.20)",
                height: "13.5%",
                "box-sizing": "border-box",
                top: "8%",
                "border-radius": "4px",
                "background-color": "rgba(255, 255, 255, 0.8)",
                left: "8%",
                padding: "10px",
              },
              type: "image",
              state_image: {
                on:
                  "/assets/yosilevy/MediaRemoteIcons/screen-with-rounded-corners-blue.png",
              },
              entity: "switch.living_room_tv_power",
              image:
                "/assets/yosilevy/MediaRemoteIcons/screen-with-rounded-corners.png",
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "script.ir_yes_on_off",
              style: {
                "z-index": 2,
                width: "13.5%",
                filter: "invert(0.20)",
                height: "13.5%",
                "box-sizing": "border-box",
                top: "8%",
                "border-radius": "4px",
                "background-color": "rgba(255, 255, 255, 0.8)",
                left: "22%",
                padding: "20px 5px",
              },
              image: "/assets/yosilevy/MediaRemoteIcons/yes.png",
              type: "image",
            },
            {
              tap_action: {
                action: "toggle",
              },
              style: {
                "z-index": 2,
                width: "13.5%",
                filter: "invert(0.20)",
                height: "13.5%",
                "box-sizing": "border-box",
                top: "8%",
                "border-radius": "4px",
                "background-color": "rgba(255, 255, 255, 0.8)",
                left: "36%",
                padding: "10px",
              },
              type: "image",
              state_image: {
                idle: "/assets/yosilevy/MediaRemoteIcons/music-note-blue.svg",
              },
              entity: "media_player.living_room_yamaha",
              image: "/assets/yosilevy/MediaRemoteIcons/music-note.svg",
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "script.tv_and_rec_volume_up",
              style: {
                "z-index": 2,
                width: "13.5%",
                filter: "invert(0.20)",
                height: "13.5%",
                "box-sizing": "border-box",
                top: "22%",
                "border-radius": "4px",
                "background-color": "rgba(255, 255, 255, 0.8)",
                left: "8%",
                padding: "10px",
              },
              image:
                "/assets/yosilevy/MediaRemoteIcons/volume-up-indicator.png",
              type: "image",
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "script.tv_and_rec_volume_down",
              style: {
                "z-index": 2,
                width: "13.5%",
                filter: "invert(0.20)",
                height: "13.5%",
                "box-sizing": "border-box",
                top: "36%",
                "border-radius": "4px",
                "background-color": "rgba(255, 255, 255, 0.8)",
                left: "8%",
                padding: "10px",
              },
              image:
                "/assets/yosilevy/MediaRemoteIcons/volume-down-indicator.png",
              type: "image",
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "script.ir_yes_channel_up",
              style: {
                "z-index": 2,
                width: "13.5%",
                filter: "invert(0.20)",
                height: "13.5%",
                "box-sizing": "border-box",
                top: "22%",
                "border-radius": "4px",
                "background-color": "rgba(255, 255, 255, 0.8)",
                left: "36%",
                padding: "10px",
              },
              image: "/assets/yosilevy/MediaRemoteIcons/plus.png",
              type: "image",
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "script.ir_yes_channel_down",
              style: {
                "z-index": 2,
                width: "13.5%",
                filter: "invert(0.20)",
                height: "13.5%",
                "box-sizing": "border-box",
                top: "36%",
                "border-radius": "4px",
                "background-color": "rgba(255, 255, 255, 0.8)",
                left: "36%",
                padding: "10px",
              },
              image: "/assets/yosilevy/MediaRemoteIcons/minus.png",
              type: "image",
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "script.ir_yes_button_1",
              style: {
                "z-index": 2,
                width: "13.5%",
                filter: "invert(0.20)",
                height: "13.5%",
                "box-sizing": "border-box",
                top: "50%",
                "border-radius": "4px",
                "background-color": "rgba(255, 255, 255, 0.8)",
                left: "8%",
                padding: "10px",
              },
              image: "/assets/yosilevy/MediaRemoteIcons/numeric-1.svg",
              type: "image",
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "script.ir_yes_button_2",
              style: {
                "z-index": 2,
                width: "13.5%",
                filter: "invert(0.20)",
                height: "13.5%",
                "box-sizing": "border-box",
                top: "50%",
                "border-radius": "4px",
                "background-color": "rgba(255, 255, 255, 0.8)",
                left: "22%",
                padding: "10px",
              },
              image: "/assets/yosilevy/MediaRemoteIcons/numeric-2.svg",
              type: "image",
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "script.ir_yes_button_3",
              style: {
                "z-index": 2,
                width: "13.5%",
                filter: "invert(0.20)",
                height: "13.5%",
                "box-sizing": "border-box",
                top: "50%",
                "border-radius": "4px",
                "background-color": "rgba(255, 255, 255, 0.8)",
                left: "36%",
                padding: "10px",
              },
              image: "/assets/yosilevy/MediaRemoteIcons/numeric-3.svg",
              type: "image",
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "script.ir_yes_button_4",
              style: {
                "z-index": 2,
                width: "13.5%",
                filter: "invert(0.20)",
                height: "13.5%",
                "box-sizing": "border-box",
                top: "64%",
                "border-radius": "4px",
                "background-color": "rgba(255, 255, 255, 0.8)",
                left: "8%",
                padding: "10px",
              },
              image: "/assets/yosilevy/MediaRemoteIcons/numeric-4.svg",
              type: "image",
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "script.ir_yes_button_5",
              style: {
                "z-index": 2,
                width: "13.5%",
                filter: "invert(0.20)",
                height: "13.5%",
                "box-sizing": "border-box",
                top: "64%",
                "border-radius": "4px",
                "background-color": "rgba(255, 255, 255, 0.8)",
                left: "22%",
                padding: "10px",
              },
              image: "/assets/yosilevy/MediaRemoteIcons/numeric-5.svg",
              type: "image",
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "script.ir_yes_button_6",
              style: {
                "z-index": 2,
                width: "13.5%",
                filter: "invert(0.20)",
                height: "13.5%",
                "box-sizing": "border-box",
                top: "64%",
                "border-radius": "4px",
                "background-color": "rgba(255, 255, 255, 0.8)",
                left: "36%",
                padding: "10px",
              },
              image: "/assets/yosilevy/MediaRemoteIcons/numeric-6.svg",
              type: "image",
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "script.ir_yes_button_7",
              style: {
                "z-index": 2,
                width: "13.5%",
                filter: "invert(0.20)",
                height: "13.5%",
                "box-sizing": "border-box",
                top: "78%",
                "border-radius": "4px",
                "background-color": "rgba(255, 255, 255, 0.8)",
                left: "8%",
                padding: "10px",
              },
              image: "/assets/yosilevy/MediaRemoteIcons/numeric-7.svg",
              type: "image",
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "script.ir_yes_button_8",
              style: {
                "z-index": 2,
                width: "13.5%",
                filter: "invert(0.20)",
                height: "13.5%",
                "box-sizing": "border-box",
                top: "78%",
                "border-radius": "4px",
                "background-color": "rgba(255, 255, 255, 0.8)",
                left: "22%",
                padding: "10px",
              },
              image: "/assets/yosilevy/MediaRemoteIcons/numeric-8.svg",
              type: "image",
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "script.ir_yes_button_9",
              style: {
                "z-index": 2,
                width: "13.5%",
                filter: "invert(0.20)",
                height: "13.5%",
                "box-sizing": "border-box",
                top: "78%",
                "border-radius": "4px",
                "background-color": "rgba(255, 255, 255, 0.8)",
                left: "36%",
                padding: "10px",
              },
              image: "/assets/yosilevy/MediaRemoteIcons/numeric-9.svg",
              type: "image",
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "script.ir_yes_button_0",
              style: {
                "z-index": 2,
                width: "13.5%",
                filter: "invert(0.20)",
                height: "13.5%",
                "box-sizing": "border-box",
                top: "92%",
                "border-radius": "4px",
                "background-color": "rgba(255, 255, 255, 0.8)",
                left: "22%",
                padding: "10px",
              },
              image: "/assets/yosilevy/MediaRemoteIcons/numeric-0.svg",
              type: "image",
            },
            {
              tap_action: {
                action: "navigate",
              },
              style: {
                "z-index": 2,
                width: "13.5%",
                filter: "invert(0.20)",
                height: "13.5%",
                "box-sizing": "border-box",
                top: "8%",
                "border-radius": "4px",
                "background-color": "rgba(255, 255, 255, 0.8)",
                left: "92%",
                padding: "5px",
              },
              image: "/assets/yosilevy/MediaRemoteIcons/backspace.svg",
              navigation_path: "/lovelace/0",
              type: "image",
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "script.ir_yes_button_goback",
              style: {
                "z-index": 2,
                width: "13.5%",
                filter: "invert(0.20)",
                height: "13.5%",
                "box-sizing": "border-box",
                top: "8%",
                "border-radius": "4px",
                "background-color": "rgba(255, 255, 255, 0.8)",
                left: "64%",
                padding: "5px",
              },
              image: "/assets/yosilevy/MediaRemoteIcons/refresh.svg",
              type: "image",
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "script.ir_yes_button_up",
              style: {
                "z-index": 2,
                width: "13.5%",
                filter: "invert(0.20)",
                height: "13.5%",
                "box-sizing": "border-box",
                top: "29%",
                "border-radius": "4px",
                "background-color": "rgba(255, 255, 255, 0.8)",
                left: "78%",
                padding: "10px",
              },
              image:
                "/assets/yosilevy/MediaRemoteIcons/arrow-up-bold-outline.svg",
              type: "image",
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "script.ir_yes_button_left",
              style: {
                "z-index": 2,
                width: "13.5%",
                filter: "invert(0.20)",
                height: "13.5%",
                "box-sizing": "border-box",
                top: "43%",
                "border-radius": "4px",
                "background-color": "rgba(255, 255, 255, 0.8)",
                left: "64%",
                padding: "10px",
              },
              image:
                "/assets/yosilevy/MediaRemoteIcons/arrow-left-bold-outline.svg",
              type: "image",
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "script.ir_yes_button_yes",
              style: {
                "z-index": 2,
                width: "13.5%",
                filter: "invert(0.20)",
                height: "13.5%",
                "box-sizing": "border-box",
                top: "43%",
                "border-radius": "4px",
                "background-color": "rgba(255, 255, 255, 0.8)",
                left: "78%",
                padding: "20px 5px",
              },
              image: "/assets/yosilevy/MediaRemoteIcons/yes.png",
              type: "image",
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "script.ir_yes_button_right",
              style: {
                "z-index": 2,
                width: "13.5%",
                filter: "invert(0.20)",
                height: "13.5%",
                "box-sizing": "border-box",
                top: "43%",
                "border-radius": "4px",
                "background-color": "rgba(255, 255, 255, 0.8)",
                left: "92%",
                padding: "10px",
              },
              image:
                "/assets/yosilevy/MediaRemoteIcons/arrow-right-bold-outline.svg",
              type: "image",
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "script.ir_yes_button_down",
              style: {
                "z-index": 2,
                width: "13.5%",
                filter: "invert(0.20)",
                height: "13.5%",
                "box-sizing": "border-box",
                top: "57%",
                "border-radius": "4px",
                "background-color": "rgba(255, 255, 255, 0.8)",
                left: "78%",
                padding: "10px",
              },
              image:
                "/assets/yosilevy/MediaRemoteIcons/arrow-down-bold-outline.svg",
              type: "image",
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "script.ir_yes_button_backward",
              style: {
                "z-index": 2,
                width: "13.5%",
                filter: "invert(0.20)",
                height: "13.5%",
                "box-sizing": "border-box",
                top: "78%",
                "border-radius": "4px",
                "background-color": "rgba(255, 255, 255, 0.8)",
                left: "64%",
                padding: "10px",
              },
              image: "/assets/yosilevy/MediaRemoteIcons/rewind.svg",
              type: "image",
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "script.ir_yes_button_play",
              style: {
                "z-index": 2,
                width: "13.5%",
                filter: "invert(0.20)",
                height: "13.5%",
                "box-sizing": "border-box",
                top: "78%",
                "border-radius": "4px",
                "background-color": "rgba(255, 255, 255, 0.8)",
                left: "78%",
                padding: "10px",
              },
              image: "/assets/yosilevy/MediaRemoteIcons/play.svg",
              type: "image",
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "script.ir_yes_button_forward",
              style: {
                "z-index": 2,
                width: "13.5%",
                filter: "invert(0.20)",
                height: "13.5%",
                "box-sizing": "border-box",
                top: "78%",
                "border-radius": "4px",
                "background-color": "rgba(255, 255, 255, 0.8)",
                left: "92%",
                padding: "10px",
              },
              image: "/assets/yosilevy/MediaRemoteIcons/fast-forward.svg",
              type: "image",
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "script.ir_yes_button_record",
              style: {
                "z-index": 2,
                width: "13.5%",
                filter: "invert(0.20)",
                height: "13.5%",
                "box-sizing": "border-box",
                top: "92%",
                "border-radius": "4px",
                "background-color": "rgba(255, 255, 255, 0.8)",
                left: "64%",
                padding: "10px",
              },
              image: "/assets/yosilevy/MediaRemoteIcons/record.svg",
              type: "image",
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "script.ir_yes_button_stop",
              style: {
                "z-index": 2,
                width: "13.5%",
                filter: "invert(0.20)",
                height: "13.5%",
                "box-sizing": "border-box",
                top: "92%",
                "border-radius": "4px",
                "background-color": "rgba(255, 255, 255, 0.8)",
                left: "78%",
                padding: "10px",
              },
              image: "/assets/yosilevy/MediaRemoteIcons/stop.svg",
              type: "image",
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "script.ir_yes_button_pause",
              style: {
                "z-index": 2,
                width: "13.5%",
                filter: "invert(0.20)",
                height: "13.5%",
                "box-sizing": "border-box",
                top: "92%",
                "border-radius": "4px",
                "background-color": "rgba(255, 255, 255, 0.8)",
                left: "92%",
                padding: "10px",
              },
              image: "/assets/yosilevy/MediaRemoteIcons/pause.svg",
              type: "image",
            },
          ],
          image: "/assets/yosilevy/MediaRemoteIcons/remoteRect.png",
          type: "picture-elements",
        },
        {
          elements: [
            {
              tap_action: {
                action: "toggle",
              },
              entity: "script.living_room_tv_hdmi1",
              style: {
                "z-index": 2,
                width: "13.5%",
                filter: "invert(0.20)",
                height: "90%",
                "box-sizing": "border-box",
                top: "50%",
                "border-radius": "4px",
                "background-color": "rgba(255, 255, 255, 0.8)",
                left: "8%",
                padding: "10px",
              },
              image: "/assets/yosilevy/MediaRemoteIcons/hdmi1.png",
              type: "image",
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "script.living_room_tv_hdmi2",
              style: {
                "z-index": 2,
                width: "13.5%",
                filter: "invert(0.20)",
                height: "90%",
                "box-sizing": "border-box",
                top: "50%",
                "border-radius": "4px",
                "background-color": "rgba(255, 255, 255, 0.8)",
                left: "22%",
                padding: "10px",
              },
              image: "/assets/yosilevy/MediaRemoteIcons/hdmi2.png",
              type: "image",
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "script.living_room_tv_hdmi3",
              style: {
                "z-index": 2,
                width: "13.5%",
                filter: "invert(0.20)",
                height: "90%",
                "box-sizing": "border-box",
                top: "50%",
                "border-radius": "4px",
                "background-color": "rgba(255, 255, 255, 0.8)",
                left: "36%",
                padding: "10px",
              },
              image: "/assets/yosilevy/MediaRemoteIcons/hdmi3.png",
              type: "image",
            },
            {
              tap_action: {
                service: "rest_command.stop_youtube",
                action: "call-service",
              },
              style: {
                "z-index": 2,
                width: "13.5%",
                filter: "invert(0.20)",
                height: "90%",
                "box-sizing": "border-box",
                top: "50%",
                "border-radius": "4px",
                "background-color": "rgba(255, 255, 255, 0.8)",
                left: "92%",
                padding: "5px",
              },
              image: "/assets/yosilevy/MediaRemoteIcons/YouTubeStopBut.png",
              type: "image",
            },
            {
              tap_action: {
                service_data: {
                  key_code: "KEY_ENTER",
                },
                service: "media_player.send_key",
                action: "call-service",
              },
              entity: "media_player.living_room_samsung",
              style: {
                "z-index": 2,
                width: "13.5%",
                filter: "invert(0.20)",
                height: "90%",
                "box-sizing": "border-box",
                top: "50%",
                "border-radius": "4px",
                "background-color": "rgba(255, 255, 255, 0.8)",
                left: "78%",
                padding: "5px",
              },
              image: "/assets/yosilevy/MediaRemoteIcons/YouTubeEnterBut.png",
              type: "image",
            },
            {
              tap_action: {
                service_data: {
                  key_code: "KEY_RETURN",
                },
                service: "media_player.send_key",
                action: "call-service",
              },
              entity: "media_player.living_room_samsung",
              style: {
                "z-index": 2,
                width: "13.5%",
                filter: "invert(0.20)",
                height: "90%",
                "box-sizing": "border-box",
                top: "50%",
                "border-radius": "4px",
                "background-color": "rgba(255, 255, 255, 0.8)",
                left: "64%",
                padding: "5px",
              },
              image: "/assets/yosilevy/MediaRemoteIcons/YouTubeReturnBut.png",
              type: "image",
            },
          ],
          image: "/assets/yosilevy/MediaRemoteIcons/remoteRectSingle.png",
          type: "picture-elements",
        },
        {
          show_state: false,
          entities: [
            {
              tap_action: {
                action: "toggle",
              },
              entity: "script.alexa_kids_go_to_sleep",
              name: "ילדים לישון סלון",
              icon: "mdi:bell-sleep",
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "script.alexa_kids_quiet",
              name: "ילדים שקט סלון",
              icon: "mdi:music-note-off",
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "script.alexa_kids_stop_tv",
              name: "מספיק טלויזיה",
              icon: "mdi:music-note-off",
            },
          ],
          title: "Alexa",
          type: "glance",
        },
        {
          entity: "media_player.josephs_echo",
          type: "media-control",
        },
      ],
      icon: "mdi:television-box",
    },
    {
      title: "חדרים",
      cards: [
        {
          show_state: false,
          columns: 4,
          title: "חדרים - תאורה",
          entities: [
            {
              tap_action: {
                action: "toggle",
              },
              entity: "light.master_bathroom_light",
              name: "אמבטיה",
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "light.laundry_light",
              name: "חדר שרות",
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "light.master_bathroom_heater",
              name: "מפזר חום",
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "light.kidsroom_light",
              name: "חדר ילדים",
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "light.clinic_light",
              name: "קליניקה",
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "light.mamad_light",
              name: 'ממ"ד',
            },
            {
              tap_action: {
                action: "toggle",
              },
              entity: "light.playroom_light",
              name: "חדר משחקים",
            },
          ],
          type: "glance",
        },
        {
          entities: [
            "cover.master_bathroom_shutter",
            "cover.playroom_shutter",
            "cover.kidsroom_shutter",
            "cover.clinic_shutter",
          ],
          title: "חדרים - תריסים",
          show_header_toggle: false,
          type: "entities",
        },
        {
          cards: [
            {
              show_state: false,
              columns: 4,
              title: "חדר הורים",
              entities: [
                {
                  hold_action: {
                    action: "more-info",
                  },
                  tap_action: {
                    action: "toggle",
                  },
                  entity: "light.parents_main_light",
                  name: "ראשי",
                },
                {
                  hold_action: {
                    action: "more-info",
                  },
                  tap_action: {
                    action: "toggle",
                  },
                  entity: "light.closet_light",
                  name: "ארונות",
                },
                {
                  hold_action: {
                    action: "more-info",
                  },
                  tap_action: {
                    action: "toggle",
                  },
                  entity: "light.parents_dimmer_light",
                  name: "דימר",
                },
                {
                  hold_action: {
                    action: "more-info",
                  },
                  tap_action: {
                    action: "toggle",
                  },
                  entity: "light.parents_terrace_light",
                  name: "חוץ",
                },
                {
                  hold_action: {
                    action: "more-info",
                  },
                  tap_action: {
                    action: "toggle",
                  },
                  entity: "light.parents_bathroom_main_light",
                  name: "אמבטיה",
                },
                {
                  hold_action: {
                    action: "more-info",
                  },
                  tap_action: {
                    action: "toggle",
                  },
                  entity: "light.parents_bathroom_spot_light",
                  name: "ספוטים",
                },
                {
                  hold_action: {
                    action: "more-info",
                  },
                  tap_action: {
                    action: "toggle",
                  },
                  entity: "light.parents_heater",
                  name: "מפזר חום",
                },
              ],
              type: "glance",
            },
            {
              entities: [
                "cover.parents_terrace_shutter",
                "cover.parents_main_shutter",
                {
                  service: "scene.turn_on",
                  name: "הורים כיבוי כללי",
                  type: "call-service",
                  service_data: {
                    entity_id: "scene.parents_full_shutdown",
                  },
                  action_name: "כיבוי",
                  icon: "mdi:account-multiple",
                },
              ],
              show_header_toggle: false,
              type: "entities",
            },
          ],
          type: "vertical-stack",
        },
      ],
      icon: "mdi:hotel",
    },
    {
      title: "דוד חשמל",
      cards: [
        {
          entities: [
            "sensor.boiler_status",
            "switch.boiler",
            {
              type: "divider",
            },
            "input_boolean.boiler_auto_schedule",
            "sensor.next_boiler_time",
            "input_boolean.boiler_ignore_next_timeframe",
            {
              type: "divider",
            },
            "sensor.boiler_override_end_time",
            "input_boolean.boiler_override",
            "input_number.boiler_override_minutes",
          ],
          title: "דוד חשמל",
          show_header_toggle: false,
          type: "entities",
        },
        {
          entities: [
            "sensor.towel_heater_status",
            "switch.towel_heater",
            {
              type: "divider",
            },
            "input_boolean.towel_heater_auto_schedule",
            "sensor.next_towel_heater_time",
            "input_boolean.towel_heater_ignore_next_timeframe",
            {
              type: "divider",
            },
            "sensor.towel_heater_override_end_time",
            "input_boolean.towel_heater_override",
            "input_number.towel_heater_override_hours",
          ],
          title: "מחמם מגבות",
          show_header_toggle: false,
          type: "entities",
        },
        {
          entities: [
            {
              entity: "switch.towel_heater",
            },
            {
              entity: "switch.boiler",
            },
          ],
          title: "היסטוריה",
          type: "history-graph",
        },
        // {
        //   numberOfDays: 1,
        //   name: "תכנון יום",
        //   showProgressBar: false,
        //   entities: ["calendar.home_schedule"],
        //   type: "custom:calendar-card",
        // },
      ],
      icon: "mdi:oil-temperature",
    },
    {
      badges: [],
      title: "כללי",
      cards: [
        {
          entity: "weather.dark_sky",
          type: "weather-forecast",
        },
        {
          type: "horizontal-stack",
          cards: [
            {
              tap_action: {
                action: "toggle",
              },
              hold_action: {
                action: "more-info",
              },
              entity: "light.telephone",
              type: "entity-button",
            },
            {
              tap_action: {
                action: "toggle",
              },
              hold_action: {
                action: "more-info",
              },
              entity: "switch.panels_living_room_and_parents_main",
              name: "פנלים סלון",
              type: "entity-button",
            },
            {
              tap_action: {
                action: "toggle",
              },
              hold_action: {
                action: "more-info",
              },
              entity: "switch.panels_all_except_living_room_and_parents_main",
              name: "פנלים (שאר הבית)",
              type: "entity-button",
            },
          ],
        },
        {
          name: "גינה - מוליכות",
          type: "sensor",
          detail: 2,
          entity: "sensor.front_garden_conductivity",
          unit: "µS/cm",
          graph: "line",
        },
        {
          details: 2,
          name: "גינה - טמפרטורה",
          labels: true,
          entity: "sensor.front_garden_temperature",
          unit: "C",
          graph: "line",
          type: "sensor",
        },
        {
          details: 2,
          name: "גינה - לחות",
          type: "sensor",
          entity: "sensor.front_garden_moisture",
          unit: "%",
          graph: "line",
        },
      ],
      icon: "mdi:dots-horizontal",
    },
  ],
});
