import "../../custom-cards/card-modder";
import { DemoConfig } from "../types";

export const demoLovelaceJimpower: DemoConfig["lovelace"] = () => ({
  name: "Kingia Castle",
  resources: [
    // {
    //   url: "/local/custom_ui/dark-sky-weather-card.js?v=4",
    //   type: "js",
    // },
    // {
    //   url: "/local/custom_ui/mini-media-player-bundle.js?v=0.9.8",
    //   type: "module",
    // },
    // {
    //   url: "/local/custom_ui/tracker-card.js?v=0.1.5",
    //   type: "js",
    // },
    // {
    //   url: "/local/custom_ui/surveillance-card.js?v=0.0.1",
    //   type: "module",
    // },
    // {
    //   url: "/local/custom_ui/mini-graph-card-bundle.js?v=0.1.0",
    //   type: "module",
    // },
    // {
    //   url: "/local/custom_ui/slider-entity-row.js?v=d6da75",
    //   type: "js",
    // },
    // {
    //   url:
    //     "/local/custom_ui/compact-custom-header/compact-custom-header.js?v=0.2.7",
    //   type: "js",
    // },
    // {
    //   url: "/local/custom_ui/waze-card.js?v=1.1.1",
    //   type: "js",
    // },
    // {
    //   url: "/local/custom_ui/circle-sensor-card.js?v=1.2.0",
    //   type: "module",
    // },
    // {
    //   url: "/local/custom_ui/monster-card.js?v=0.2.3",
    //   type: "js",
    // },
  ],
  views: [
    {
      cards: [
        { type: "custom:ha-demo-card" },
        {
          cards: [
            {
              cards: [
                {
                  style: {
                    "border-radius": "20px",
                    "box-shadow": "3px 3px rgba(0,0,0,0.4)",
                    border: "solid 1px rgba(100,100,100,0.3)",
                    overflow: "hidden",
                  },
                  type: "custom:card-modder",
                  card: {
                    image: "/assets/jimpower/home/james_10.jpg",
                    elements: [
                      {
                        prefix: "James -- ",
                        type: "state-label",
                        style: {
                          color: "white",
                          top: "90%",
                          left: "30%",
                        },
                        entity: "sensor.james",
                      },
                      {
                        style: {
                          color: "white",
                          top: "90%",
                          left: "73%",
                        },
                        type: "state-icon",
                        tap_action: "more_info",
                        entity: "sensor.battery_james",
                      },
                      {
                        style: {
                          color: "white",
                          top: "91%",
                          left: "87%",
                        },
                        type: "state-label",
                        entity: "sensor.battery_james",
                      },
                      {
                        style: {
                          color: "white",
                          top: "10%",
                          left: "92%",
                        },
                        type: "state-icon",
                        entity: "binary_sensor.james_gps_status",
                      },
                      {
                        style: {
                          color: "white",
                          top: "25%",
                          left: "92%",
                        },
                        type: "state-icon",
                        entity: "binary_sensor.james_ble_status",
                      },
                      {
                        style: {
                          color: "white",
                          top: "40%",
                          left: "92%",
                        },
                        type: "state-icon",
                        entity: "binary_sensor.james_keys_status",
                      },
                      {
                        style: {
                          color: "white",
                          top: "55%",
                          left: "92%",
                        },
                        type: "state-icon",
                        entity: "binary_sensor.james_bag_status",
                      },
                      {
                        style: {
                          color: "white",
                          top: "70%",
                          left: "92%",
                        },
                        type: "state-icon",
                        entity: "binary_sensor.james_car_status",
                      },
                    ],
                    type: "picture-elements",
                  },
                },
                {
                  style: {
                    "border-radius": "20px",
                    "box-shadow": "3px 3px rgba(0,0,0,0.4)",
                    border: "solid 1px rgba(100,100,100,0.3)",
                    overflow: "hidden",
                  },
                  type: "custom:card-modder",
                  card: {
                    image: "/assets/jimpower/home/tina_4.jpg",
                    elements: [
                      {
                        prefix: "Tina -- ",
                        type: "state-label",
                        style: {
                          color: "white",
                          top: "89%",
                          left: "27%",
                        },
                        entity: "sensor.tina",
                      },
                      {
                        style: {
                          color: "white",
                          top: "89%",
                          left: "73%",
                        },
                        type: "state-icon",
                        entity: "sensor.battery_tina",
                      },
                      {
                        style: {
                          color: "white",
                          top: "90%",
                          left: "87%",
                        },
                        type: "state-label",
                        entity: "sensor.battery_tina",
                      },
                      {
                        style: {
                          color: "white",
                          top: "10%",
                          left: "92%",
                        },
                        type: "state-icon",
                        entity: "binary_sensor.tina_gps_status",
                      },
                      {
                        style: {
                          color: "white",
                          top: "25%",
                          left: "92%",
                        },
                        type: "state-icon",
                        entity: "binary_sensor.tina_ble_status",
                      },
                      {
                        style: {
                          color: "white",
                          top: "40%",
                          left: "92%",
                        },
                        type: "state-icon",
                        entity: "binary_sensor.tina_keys_status",
                      },
                    ],
                    type: "picture-elements",
                  },
                },
              ],
              type: "horizontal-stack",
            },
            {
              style: {
                "border-radius": "20px",
                "box-shadow": "3px 3px rgba(0,0,0,0.4)",
                border: "solid 1px rgba(100,100,100,0.3)",
                overflow: "hidden",
              },
              type: "custom:card-modder",
              card: {
                image: "/assets/jimpower/home/house_4.png",
                elements: [
                  {
                    style: {
                      color: "white",
                      top: "88%",
                      left: "52%",
                    },
                    type: "state-icon",
                    tap_action: {
                      action: "call-service",
                      service_data: {
                        entity_id: "group.downstairs_lights",
                      },
                      service: "homeassistant.toggle",
                    },
                    entity: "binary_sensor.lights",
                  },
                  {
                    style: {
                      color: "white",
                      top: "88%",
                      left: "5%",
                    },
                    type: "state-icon",
                    entity: "binary_sensor.alarm",
                  },
                  {
                    style: {
                      color: "white",
                      top: "88%",
                      left: "14%",
                    },
                    type: "state-icon",
                    entity: "binary_sensor.doors",
                  },
                  {
                    style: {
                      color: "white",
                      top: "88%",
                      left: "23%",
                    },
                    type: "state-icon",
                    entity: "binary_sensor.windows",
                  },
                  {
                    style: {
                      color: "white",
                      top: "88%",
                      left: "32%",
                    },
                    type: "state-icon",
                    entity: "binary_sensor.trash",
                  },
                  {
                    style: {
                      color: "white",
                      top: "88%",
                      left: "41%",
                    },
                    type: "state-icon",
                    entity: "binary_sensor.recycle",
                  },
                  {
                    style: {
                      color: "white",
                      top: "82%",
                      left: "72%",
                    },
                    type: "state-icon",
                    tap_action: "more-info",
                    entity: "sensor.lower_temperature",
                  },
                  {
                    style: {
                      color: "white",
                      top: "95%",
                      left: "72%",
                    },
                    type: "state-label",
                    entity: "sensor.lower_temperature",
                  },
                  {
                    style: {
                      color: "white",
                      top: "82%",
                      left: "87%",
                    },
                    type: "state-icon",
                    tap_action: "more-info",
                    entity: "sensor.upstairs_temperature",
                  },
                  {
                    style: {
                      color: "white",
                      top: "95%",
                      left: "87%",
                    },
                    type: "state-label",
                    entity: "sensor.upstairs_temperature",
                  },
                  {
                    style: {
                      color: "white",
                      top: "56%",
                      left: "78%",
                    },
                    type: "state-icon",
                    entity: "binary_sensor.smoke_sensor_158d0001b8ddc7",
                  },
                  {
                    style: {
                      color: "white",
                      top: "20%",
                      left: "78%",
                    },
                    type: "state-icon",
                    entity: "binary_sensor.smoke_sensor_158d0001b8deba",
                  },
                  {
                    style: {
                      color: "white",
                      top: "61%",
                      left: "24%",
                    },
                    type: "state-icon",
                    entity: "binary_sensor.garage",
                  },
                  {
                    style: {
                      color: "white",
                      top: "12%",
                      left: "9%",
                    },
                    type: "state-label",
                    entity: "sensor.bom_temp",
                  },
                ],
                type: "picture-elements",
              },
            },
          ],
          type: "vertical-stack",
        },
        {
          style: {
            "border-radius": "20px",
            "box-shadow": "3px 3px rgba(0,0,0,0.4)",
            border: "solid 1px rgba(100,100,100,0.3)",
            overflow: "hidden",
          },
          type: "custom:card-modder",
          card: {
            image: "/assets/jimpower/home/git.png",
            elements: [
              {
                style: {
                  color: "white",
                  top: "10%",
                  "font-size": "120%",
                  left: "13%",
                },
                type: "service-button",
                service: "python_script.github_scaper",
                title: "Stargazers",
              },
              {
                style: {
                  color: "white",
                  top: "10%",
                  "font-size": "120%",
                  left: "28%",
                },
                type: "state-label",
                entity: "sensor.stars",
              },
              {
                style: {
                  color: "white",
                  top: "10%",
                  "font-size": "120%",
                  left: "45%",
                },
                type: "service-button",
                service: "python_script.github_scaper",
                title: "Subscribers",
              },
              {
                style: {
                  color: "white",
                  top: "10%",
                  "font-size": "120%",
                  left: "59%",
                },
                type: "state-label",
                entity: "sensor.subscribers",
              },
              {
                style: {
                  color: "white",
                  top: "10%",
                  "font-size": "120%",
                  left: "69%",
                },
                type: "service-button",
                service: "python_script.github_scaper",
                title: "Forks",
              },
              {
                style: {
                  color: "white",
                  top: "10%",
                  "font-size": "120%",
                  left: "78%",
                },
                type: "state-label",
                entity: "sensor.forks",
              },
              {
                style: {
                  color: "white",
                  top: "10%",
                  "font-size": "120%",
                  left: "88%",
                },
                type: "service-button",
                service: "python_script.github_scaper",
                title: "Issues",
              },
              {
                style: {
                  color: "white",
                  top: "10%",
                  "font-size": "120%",
                  left: "97%",
                },
                type: "state-label",
                entity: "sensor.issues",
              },
              {
                style: {
                  color: "white",
                  top: "25%",
                  left: "12%",
                },
                type: "service-button",
                service: "python_script.github_scaper",
                title: "Next Target",
              },
              {
                style: {
                  color: "white",
                  top: "25%",
                  left: "25%",
                },
                type: "state-label",
                entity: "sensor.git_stars_next_dif",
              },
              {
                style: {
                  color: "white",
                  top: "35%",
                  left: "12%",
                },
                type: "service-button",
                service: "python_script.github_scaper",
                title: "Last Target",
              },
              {
                style: {
                  color: "white",
                  top: "35%",
                  left: "25%",
                },
                type: "state-label",
                entity: "sensor.git_stars_last_dif",
              },
              {
                style: {
                  color: "white",
                  top: "45%",
                  left: "10%",
                },
                type: "service-button",
                service: "python_script.github_scaper",
                title: "Trending",
              },
              {
                style: {
                  color: "white",
                  top: "45%",
                  left: "25%",
                },
                type: "state-label",
                entity: "sensor.git_stars_trend_dif",
              },
              {
                style: {
                  color: "white",
                  top: "25%",
                  left: "82%",
                },
                type: "service-button",
                service: "python_script.github_scaper",
                title: "This Month",
              },
              {
                style: {
                  color: "white",
                  top: "25%",
                  left: "95%",
                },
                type: "state-label",
                entity: "sensor.stars_this_month",
              },
              {
                style: {
                  color: "white",
                  top: "35%",
                  left: "82%",
                },
                type: "service-button",
                service: "python_script.github_scaper",
                title: "Last Month",
              },
              {
                style: {
                  color: "white",
                  top: "35%",
                  left: "95%",
                },
                type: "state-label",
                entity: "sensor.stars_last_month",
              },
              {
                style: {
                  color: "white",
                  top: "45%",
                  left: "83%",
                },
                type: "service-button",
                service: "python_script.github_scaper",
                title: "This Week",
              },
              {
                style: {
                  color: "white",
                  top: "45%",
                  left: "95%",
                },
                type: "state-label",
                entity: "sensor.stars_this_week",
              },
              {
                style: {
                  color: "white",
                  top: "55%",
                  left: "83%",
                },
                type: "service-button",
                service: "python_script.github_scaper",
                title: "Last Week",
              },
              {
                style: {
                  color: "white",
                  top: "55%",
                  left: "95%",
                },
                type: "state-label",
                entity: "sensor.stars_last_week",
              },
            ],
            type: "picture-elements",
          },
        },
        {
          cards: [
            // {
            //   style: {
            //     "background-image": 'url("/assets/jimpower/cardbackK.png")',
            //     "background-size": "100% 400px",
            //     "box-shadow": "3px 3px rgba(0,0,0,0.4)",
            //     "background-repeat": "no-repeat",
            //     color: "#999999",
            //     "border-radius": "20px",
            //     border: "solid 1px rgba(100,100,100,0.3)",
            //     "background-color": "rgba(50,50,50,0.3)",
            //   },
            //   type: "custom:card-modder",
            //   card: {
            //     entity_visibility: "sensor.dark_sky_visibility",
            //     entity_sun: "sun.sun",
            //     entity_daily_summary:
            //       "sensor.bom_gc_forecast_detailed_summary_0",
            //     entity_temperature: "sensor.bom_temp",
            //     entity_forecast_high_temp_3:
            //       "sensor.bom_gc_forecast_max_temp_c_3",
            //     entity_forecast_high_temp_2:
            //       "sensor.bom_gc_forecast_max_temp_c_2",
            //     entity_forecast_high_temp_5:
            //       "sensor.bom_gc_forecast_max_temp_c_5",
            //     entity_forecast_high_temp_4:
            //       "sensor.bom_gc_forecast_max_temp_c_4",
            //     entity_wind_speed: "sensor.bom_wind_sp",
            //     entity_forecast_icon_4: "sensor.dark_sky_icon_4",
            //     entity_forecast_icon_5: "sensor.dark_sky_icon_5",
            //     entity_forecast_icon_2: "sensor.dark_sky_icon_2",
            //     entity_forecast_icon_3: "sensor.dark_sky_icon_3",
            //     entity_forecast_icon_1: "sensor.dark_sky_icon_1",
            //     entity_forecast_high_temp_1:
            //       "sensor.bom_gc_forecast_max_temp_c_1",
            //     entity_wind_bearing: "sensor.bom_wind_bear",
            //     entity_forecast_low_temp_2:
            //       "sensor.bom_gc_forecast_min_temp_c_2",
            //     entity_forecast_low_temp_3:
            //       "sensor.bom_gc_forecast_min_temp_c_3",
            //     entity_pressure: "sensor.bom_pres",
            //     entity_forecast_low_temp_1:
            //       "sensor.bom_gc_forecast_min_temp_c_1",
            //     entity_forecast_low_temp_4:
            //       "sensor.bom_gc_forecast_min_temp_c_4",
            //     entity_forecast_low_temp_5:
            //       "sensor.bom_gc_forecast_min_temp_c_5",
            //     entity_humidity: "sensor.bom_humd",
            //     type: "custom:dark-sky-weather-card",
            //     entity_current_conditions: "sensor.dark_sky_icon",
            //   },
            // },
            // {
            //   style: {
            //     "background-image": 'url("/assets/jimpower/home/waze_5.png")',
            //     "background-size": "100% 400px",
            //     "box-shadow": "3px 3px rgba(0,0,0,0.4)",
            //     "background-repeat": "no-repeat",
            //     "border-radius": "20px",
            //     border: "solid 1px rgba(100,100,100,0.3)",
            //     "background-color": "rgba(50,50,50,0.3)",
            //   },
            //   type: "custom:card-modder",
            //   card: {
            //     entities: [
            //       {
            //         name: "James",
            //         zone: "zone.home",
            //         entity: "sensor.james_to_home",
            //       },
            //       {
            //         name: "Tina",
            //         zone: "zone.home",
            //         entity: "sensor.tina_to_home",
            //       },
            //       {
            //         name: "Work",
            //         zone: "zone.powertec",
            //         entity: "sensor.commute_to_work",
            //       },
            //     ],
            //     type: "custom:waze-card",
            //   },
            // },
            {
              style: {
                "border-radius": "20px",
                "box-shadow": "3px 3px rgba(0,0,0,0.4)",
                border: "solid 1px rgba(100,100,100,0.3)",
                overflow: "hidden",
              },
              type: "custom:card-modder",
              card: {
                image: "/assets/jimpower/home/bus_10.jpg",
                elements: [
                  {
                    style: {
                      color: "white",
                      top: "16px",
                      left: "23px",
                    },
                    type: "state-icon",
                    entity: "sensor.next_bus",
                  },
                  {
                    style: {
                      color: "white",
                      top: "22px",
                      left: "59px",
                    },
                    type: "state-label",
                    entity: "sensor.next_bus",
                  },
                ],
                type: "picture-elements",
              },
            },
          ],
          type: "vertical-stack",
        },
        // {
        //   cards: [
        //     {
        //       style: {
        //         "border-radius": "20px",
        //         color: "#999999",
        //         "box-shadow": "3px 3px rgba(0,0,0,0.4)",
        //         border: "solid 1px rgba(100,100,100,0.3)",
        //       },
        //       type: "custom:card-modder",
        //       card: {
        //         type: "picture-entity",
        //         entity: "camera.bom_radar",
        //       },
        //     },
        //     // {
        //     //   style: {
        //     //     "background-image": 'url("/assets/jimpower/cardbackK.png")',
        //     //     "background-size": "100% 525px",
        //     //     "box-shadow": "3px 3px rgba(0,0,0,0.4)",
        //     //     "background-repeat": "no-repeat",
        //     //     color: "#999999",
        //     //     "border-radius": "20px",
        //     //     border: "solid 1px rgba(100,100,100,0.3)",
        //     //     "background-color": "rgba(50,50,50,0.3)",
        //     //   },
        //     //   type: "custom:card-modder",
        //     //   card: {
        //     //     title: null,
        //     //     type: "custom:tracker-card",
        //     //     trackers: [
        //     //       "sensor.custom_card_tracker",
        //     //       "sensor.custom_component_tracker",
        //     //     ],
        //     //   },
        //     // },
        //   ],
        //   type: "vertical-stack",
        // },
      ],
      icon: "mdi:castle",
      name: "Home",
      background:
        'center / cover no-repeat url("/assets/jimpower/background-15.jpg") fixed',
    },
    {
      cards: [
        {
          cards: [
            {
              style: {
                "background-image": 'url("/assets/jimpower/cardbackK.png")',
                "background-size": "100% 68px",
                "box-shadow": "3px 3px rgba(0,0,0,0.4)",
                "background-repeat": "no-repeat",
                "border-radius": "20px",
                overflow: "hidden",
                border: "solid 1px rgba(100,100,100,0.3)",
                "background-color": "rgba(50,50,50,0.3)",
              },
              type: "custom:card-modder",
              card: {
                image: "/assets/jimpower/security/alarm_3.jpg",
                elements: [
                  {
                    style: {
                      color: "white",
                      top: "88%",
                      left: "15%",
                    },
                    type: "state-icon",
                    entity: "alarm_control_panel.ha_alarm",
                  },
                  {
                    prefix: "Alarm: ",
                    type: "state-label",
                    style: {
                      color: "white",
                      top: "88%",
                      left: "32%",
                    },
                    entity: "alarm_control_panel.ha_alarm",
                  },
                ],
                type: "picture-elements",
              },
            },
            {
              style: {
                "background-image": 'url("/assets/jimpower/cardbackK.png")',
                "background-size": "100% 68px",
                "box-shadow": "3px 3px rgba(0,0,0,0.4)",
                "background-repeat": "no-repeat",
                "border-radius": "20px",
                overflow: "hidden",
                border: "solid 1px rgba(100,100,100,0.3)",
                "background-color": "rgba(50,50,50,0.3)",
              },
              type: "custom:card-modder",
              card: {
                image: "/assets/jimpower/security/smoke_4.jpg",
                elements: [
                  {
                    style: {
                      color: "white",
                      top: "88%",
                      left: "15%",
                    },
                    type: "state-icon",
                    entity: "binary_sensor.smoke_sensor_158d0001b8ddc7",
                  },
                  {
                    prefix: "Downstairs: ",
                    type: "state-label",
                    style: {
                      color: "white",
                      top: "89%",
                      left: "32%",
                    },
                    entity: "binary_sensor.smoke_sensor_158d0001b8ddc7",
                  },
                  {
                    style: {
                      color: "white",
                      top: "88%",
                      left: "60%",
                    },
                    type: "state-icon",
                    entity: "binary_sensor.smoke_sensor_158d0001b8deba",
                  },
                  {
                    prefix: "Upstairs: ",
                    type: "state-label",
                    style: {
                      color: "white",
                      top: "89%",
                      left: "77%",
                    },
                    entity: "binary_sensor.smoke_sensor_158d0001b8deba",
                  },
                ],
                type: "picture-elements",
              },
            },
            {
              style: {
                "background-image": 'url("/assets/jimpower/cardbackK.png")',
                "background-size": "100% 68px",
                "box-shadow": "3px 3px rgba(0,0,0,0.4)",
                "background-repeat": "no-repeat",
                "border-radius": "20px",
                overflow: "hidden",
                border: "solid 1px rgba(100,100,100,0.3)",
                "background-color": "rgba(50,50,50,0.3)",
              },
              type: "custom:card-modder",
              card: {
                image: "/assets/jimpower/security/air_8.jpg",
                elements: [
                  {
                    image:
                      "https://www.airvisual.com/assets/aqi/ic-face-1-green.svg",
                    type: "image",
                    style: {
                      width: "80px",
                      top: "30%",
                      left: "12%",
                      transform: "none",
                      height: "80px",
                    },
                    entity: "sensor.us_air_pollution_level_2",
                  },
                  {
                    style: {
                      color: "hsl(120, 41%, 39%)",
                      top: "50%",
                      "font-weight": 600,
                      "font-size": "20px",
                      left: "44%",
                    },
                    type: "state-label",
                    entity: "sensor.us_air_pollution_level_2",
                  },
                  {
                    style: {
                      color: "hsl(120, 41%, 39%)",
                      top: "50%",
                      "line-height": "50px",
                      "font-size": "104px",
                      left: "70%",
                    },
                    type: "state-label",
                    entity: "sensor.aqi",
                  },
                  {
                    style: {
                      color: "white",
                      top: "80%",
                      left: "52%",
                    },
                    type: "state-icon",
                    entity: "sensor.us_main_pollutant_2",
                  },
                  {
                    style: {
                      color: "white",
                      top: "81%",
                      "font-weight": 500,
                      "font-size": "18px",
                      left: "72%",
                    },
                    type: "state-label",
                    suffix: " | 7.2 ug/m3",
                    entity: "sensor.us_main_pollutant_2",
                  },
                ],
                type: "picture-elements",
              },
            },
          ],
          type: "vertical-stack",
        },
        {
          cards: [
            {
              style: {
                "background-image": 'url("/assets/jimpower/cardbackK.png")',
                "background-size": "100% 68px",
                "box-shadow": "3px 3px rgba(0,0,0,0.4)",
                "background-repeat": "no-repeat",
                "border-radius": "20px",
                overflow: "hidden",
                border: "solid 1px rgba(100,100,100,0.3)",
                "background-color": "rgba(50,50,50,0.3)",
              },
              type: "custom:card-modder",
              card: {
                image: "/assets/jimpower/security/door_3.png",
                elements: [
                  {
                    style: {
                      color: "white",
                      top: "82%",
                      left: "15%",
                    },
                    type: "state-icon",
                    entity: "binary_sensor.door_window_sensor_158d00022016b2",
                  },
                  {
                    prefix: "Front: ",
                    type: "state-label",
                    style: {
                      color: "white",
                      top: "92%",
                      left: "15%",
                    },
                    entity: "binary_sensor.door_window_sensor_158d00022016b2",
                  },
                  {
                    style: {
                      color: "white",
                      top: "82%",
                      left: "38%",
                    },
                    type: "state-icon",
                    entity: "binary_sensor.door_window_sensor_158d000225432d",
                  },
                  {
                    prefix: "Patio: ",
                    type: "state-label",
                    style: {
                      color: "white",
                      top: "92%",
                      left: "38%",
                    },
                    entity: "binary_sensor.door_window_sensor_158d000225432d",
                  },
                  {
                    style: {
                      color: "white",
                      top: "82%",
                      left: "61%",
                    },
                    type: "state-icon",
                    entity: "binary_sensor.door_window_sensor_158d0001e73c09",
                  },
                  {
                    prefix: "Back: ",
                    type: "state-label",
                    style: {
                      color: "white",
                      top: "92%",
                      left: "61%",
                    },
                    entity: "binary_sensor.door_window_sensor_158d0001e73c09",
                  },
                  {
                    style: {
                      color: "white",
                      top: "82%",
                      left: "85%",
                    },
                    type: "state-icon",
                    entity: "binary_sensor.garage",
                  },
                  {
                    prefix: "Garage: ",
                    type: "state-label",
                    style: {
                      color: "white",
                      top: "92%",
                      left: "85%",
                    },
                    entity: "binary_sensor.garage",
                  },
                ],
                type: "picture-elements",
              },
            },
            {
              style: {
                "background-image": 'url("/assets/jimpower/cardbackK.png")',
                "background-size": "100% 68px",
                "box-shadow": "3px 3px rgba(0,0,0,0.4)",
                "background-repeat": "no-repeat",
                "border-radius": "20px",
                overflow: "hidden",
                border: "solid 1px rgba(100,100,100,0.3)",
                "background-color": "rgba(50,50,50,0.3)",
              },
              type: "custom:card-modder",
              card: {
                image: "/assets/jimpower/security/window_2.jpg",
                elements: [
                  {
                    style: {
                      color: "white",
                      top: "82%",
                      left: "25%",
                    },
                    type: "state-icon",
                    entity: "binary_sensor.door_window_sensor_158d0001e73af4",
                  },
                  {
                    prefix: "Kitchen: ",
                    type: "state-label",
                    style: {
                      color: "white",
                      top: "92%",
                      left: "25%",
                    },
                    entity: "binary_sensor.door_window_sensor_158d0001e73af4",
                  },
                  {
                    style: {
                      color: "white",
                      top: "8%",
                      left: "50%",
                    },
                    type: "state-icon",
                    entity: "binary_sensor.door_window_sensor_158d0001e73a73",
                  },
                  {
                    prefix: "Jackson: ",
                    type: "state-label",
                    style: {
                      color: "white",
                      top: "18%",
                      left: "50%",
                    },
                    entity: "binary_sensor.door_window_sensor_158d0001e73a73",
                  },
                  {
                    style: {
                      color: "white",
                      top: "8%",
                      left: "75%",
                    },
                    type: "state-icon",
                    entity: "binary_sensor.door_window_sensor_158d0001e73aad",
                  },
                  {
                    prefix: "Hudson: ",
                    type: "state-label",
                    style: {
                      color: "white",
                      top: "18%",
                      left: "75%",
                    },
                    entity: "binary_sensor.door_window_sensor_158d0001e73aad",
                  },
                  {
                    style: {
                      color: "white",
                      top: "82%",
                      left: "75%",
                    },
                    type: "state-icon",
                    entity: "binary_sensor.door_window_sensor_158d0001e74875",
                  },
                  {
                    prefix: "Bathroom: ",
                    type: "state-label",
                    style: {
                      color: "white",
                      top: "92%",
                      left: "75%",
                    },
                    entity: "binary_sensor.door_window_sensor_158d0001e74875",
                  },
                  {
                    style: {
                      color: "white",
                      top: "8%",
                      left: "25%",
                    },
                    type: "state-icon",
                    entity: "binary_sensor.door_window_sensor_158d0001f36741",
                  },
                  {
                    prefix: "Bedroom: ",
                    type: "state-label",
                    style: {
                      color: "white",
                      top: "18%",
                      left: "25%",
                    },
                    entity: "binary_sensor.door_window_sensor_158d0001f36741",
                  },
                ],
                type: "picture-elements",
              },
            },
          ],
          type: "vertical-stack",
        },
        {
          cards: [
            {
              style: {
                "background-image": 'url("/assets/jimpower/cardbackK.png")',
                "background-size": "100% 68px",
                "box-shadow": "3px 3px rgba(0,0,0,0.4)",
                "background-repeat": "no-repeat",
                "border-radius": "20px",
                overflow: "hidden",
                border: "solid 1px rgba(100,100,100,0.3)",
                "background-color": "rgba(50,50,50,0.3)",
              },
              type: "custom:card-modder",
              card: {
                image: "/assets/jimpower/security/motion_3.jpg",
                elements: [
                  {
                    style: {
                      color: "white",
                      top: "82%",
                      left: "25%",
                    },
                    type: "state-icon",
                    entity: "binary_sensor.motion_sensor_158d0001e5d118",
                  },
                  {
                    prefix: "Living: ",
                    type: "state-label",
                    style: {
                      color: "white",
                      top: "92%",
                      left: "25%",
                    },
                    entity: "binary_sensor.motion_sensor_158d0001e5d118",
                  },
                  {
                    style: {
                      color: "white",
                      top: "82%",
                      left: "50%",
                    },
                    type: "state-icon",
                    entity: "binary_sensor.motion_sensor_158d0001e5cf11",
                  },
                  {
                    prefix: "Playroom: ",
                    type: "state-label",
                    style: {
                      color: "white",
                      top: "92%",
                      left: "50%",
                    },
                    entity: "binary_sensor.motion_sensor_158d0001e5cf11",
                  },
                  {
                    style: {
                      color: "white",
                      top: "45%",
                      left: "25%",
                    },
                    type: "state-icon",
                    entity: "binary_sensor.motion_sensor_158d0001e5d147",
                  },
                  {
                    prefix: "Entrance: ",
                    type: "state-label",
                    style: {
                      color: "white",
                      top: "55%",
                      left: "25%",
                    },
                    entity: "binary_sensor.motion_sensor_158d0001e5d147",
                  },
                  {
                    style: {
                      color: "white",
                      top: "45%",
                      left: "50%",
                    },
                    type: "state-icon",
                    entity: "binary_sensor.motion_sensor_158d000200ea5b",
                  },
                  {
                    prefix: "Patio: ",
                    type: "state-label",
                    style: {
                      color: "white",
                      top: "55%",
                      left: "50%",
                    },
                    entity: "binary_sensor.motion_sensor_158d000200ea5b",
                  },
                  {
                    style: {
                      color: "white",
                      top: "8%",
                      left: "25%",
                    },
                    type: "state-icon",
                    entity: "binary_sensor.motion_sensor_158d000201351c",
                  },
                  {
                    prefix: "Jackson: ",
                    type: "state-label",
                    style: {
                      color: "white",
                      top: "18%",
                      left: "25%",
                    },
                    entity: "binary_sensor.motion_sensor_158d000201351c",
                  },
                  {
                    style: {
                      color: "white",
                      top: "8%",
                      left: "50%",
                    },
                    type: "state-icon",
                    entity: "binary_sensor.motion_sensor_158d0002006d46",
                  },
                  {
                    prefix: "Hudson: ",
                    type: "state-label",
                    style: {
                      color: "white",
                      top: "18%",
                      left: "50%",
                    },
                    entity: "binary_sensor.motion_sensor_158d0002006d46",
                  },
                  {
                    style: {
                      color: "white",
                      top: "8%",
                      left: "75%",
                    },
                    type: "state-icon",
                    entity: "binary_sensor.motion_sensor_158d0001e63803",
                  },
                  {
                    prefix: "Bedroom: ",
                    type: "state-label",
                    style: {
                      color: "white",
                      top: "18%",
                      left: "75%",
                    },
                    entity: "binary_sensor.motion_sensor_158d0001e63803",
                  },
                  {
                    style: {
                      color: "white",
                      top: "82%",
                      left: "75%",
                    },
                    type: "state-icon",
                    entity: "binary_sensor.motion_sensor_158d000200e4ab",
                  },
                  {
                    prefix: "Bathroom: ",
                    type: "state-label",
                    style: {
                      color: "white",
                      top: "92%",
                      left: "75%",
                    },
                    entity: "binary_sensor.motion_sensor_158d000200e4ab",
                  },
                  {
                    style: {
                      color: "white",
                      top: "45%",
                      left: "75%",
                    },
                    type: "state-icon",
                    entity: "binary_sensor.motion_sensor_158d00022c2f21",
                  },
                  {
                    prefix: "Staircase: ",
                    type: "state-label",
                    style: {
                      color: "white",
                      top: "55%",
                      left: "75%",
                    },
                    entity: "binary_sensor.motion_sensor_158d00022c2f21",
                  },
                ],
                type: "picture-elements",
              },
            },
            {
              style: {
                "background-image": 'url("/assets/jimpower/cardbackK.png")',
                "background-size": "100% 68px",
                "box-shadow": "3px 3px rgba(0,0,0,0.4)",
                "background-repeat": "no-repeat",
                "border-radius": "20px",
                overflow: "hidden",
                border: "solid 1px rgba(100,100,100,0.3)",
                "background-color": "rgba(50,50,50,0.3)",
              },
              type: "custom:card-modder",
              card: {
                image: "/assets/jimpower/security/leak_2.png",
                elements: [
                  {
                    style: {
                      color: "white",
                      top: "88%",
                      left: "15%",
                    },
                    type: "state-icon",
                    entity: "binary_sensor.water_leak_sensor_158d0002338651",
                  },
                  {
                    prefix: "Kitchen: ",
                    type: "state-label",
                    style: {
                      color: "white",
                      top: "89%",
                      left: "32%",
                    },
                    entity: "binary_sensor.water_leak_sensor_158d0002338651",
                  },
                  {
                    style: {
                      color: "white",
                      top: "88%",
                      left: "60%",
                    },
                    type: "state-icon",
                    entity: "binary_sensor.water_leak_sensor_158d00026e26dc",
                  },
                  {
                    prefix: "Bathroom: ",
                    type: "state-label",
                    style: {
                      color: "white",
                      top: "89%",
                      left: "77%",
                    },
                    entity: "binary_sensor.water_leak_sensor_158d00026e26dc",
                  },
                ],
                type: "picture-elements",
              },
            },
          ],
          type: "vertical-stack",
        },
      ],
      icon: "hass:shield-home",
      name: "Security",
      background:
        'center / cover no-repeat url("/assets/jimpower/background-15.jpg") fixed',
    },
  ],
});
