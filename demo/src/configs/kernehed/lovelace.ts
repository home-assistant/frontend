import { LovelaceConfig } from "../../../../src/data/lovelace";

export const demoLovelaceKernehed: () => LovelaceConfig = () => ({
  name: "Hem",
  resources: [
    // {
    //   url: "/local/custom-lovelace/monster-card.js",
    //   type: "js",
    // },
    // {
    //   url: "/local/custom-lovelace/mini-media-player-bundle.js?v=0.9.8",
    //   type: "module",
    // },
    // {
    //   url: "/local/custom-lovelace/slideshow-card.js?=1.1.0",
    //   type: "js",
    // },
    // {
    //   url: "/local/custom-lovelace/fold-entity-row.js?v=3ae2c4",
    //   type: "js",
    // },
    // {
    //   url: "/local/custom-lovelace/swipe-card/swipe-card.js?v=2.0.0",
    //   type: "module",
    // },
    // {
    //   url: "/local/custom-lovelace/upcoming-media-card/upcoming-media-card.js",
    //   type: "js",
    // },
    // {
    //   url: "/local/custom-lovelace/tracker-card.js?v=0.1.5",
    //   type: "js",
    // },
    // {
    //   url: "/local/custom-lovelace/card-tools.js?v=6ce5d0",
    //   type: "js",
    // },
    // {
    //   url: "/local/custom-lovelace/krisinfo.js?=0.0.1",
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
                  image: "/assets/kernehed/oscar.jpg",
                  elements: [
                    {
                      style: {
                        color: "white",
                        top: "93%",
                        left: "20%",
                      },
                      type: "state-label",
                      entity: "sensor.oskar_devices",
                    },
                    {
                      style: {
                        color: "white",
                        top: "93%",
                        left: "90%",
                      },
                      type: "state-label",
                      entity: "sensor.battery_oskar",
                    },
                    {
                      style: {
                        color: "white",
                        top: "93%",
                        left: "55%",
                      },
                      type: "state-label",
                      entity: "sensor.oskar_tid_till_hem",
                    },
                  ],
                  type: "picture-elements",
                },
                {
                  image: "/assets/kernehed/bella.jpg",
                  elements: [
                    {
                      style: {
                        color: "white",
                        top: "92%",
                        left: "20%",
                      },
                      type: "state-label",
                      entity: "sensor.bella_devices",
                    },
                    {
                      style: {
                        color: "white",
                        top: "92%",
                        left: "90%",
                      },
                      type: "state-label",
                      entity: "sensor.battery_bella",
                    },
                    {
                      style: {
                        color: "white",
                        top: "92%",
                        left: "55%",
                      },
                      type: "state-label",
                      entity: "sensor.bella_tid_till_hem",
                    },
                  ],
                  type: "picture-elements",
                },
              ],
              type: "horizontal-stack",
            },
          ],
          type: "vertical-stack",
          id: "4db5c4664f0a4458949aec3651e4d7a6",
        },
        {
          entities: [
            "lock.polycontrol_danalock_v3_btze_locked",
            "sensor.zwave_battery_front_door",
            "alarm_control_panel.kernehed_manison",
            "binary_sensor.dorrklockan",
          ],
          show_header_toggle: false,
          type: "entities",
          id: "37279816181f442eac853b03c0473101",
          title: "Lock",
        },
        // {
        //   filter: {
        //     exclude: [
        //       {
        //         state: "not_home",
        //       },
        //     ],
        //     include: [
        //       {
        //         entity_id: "device_tracker.annasiphone",
        //       },
        //       {
        //         entity_id: "device_tracker.iphone_2",
        //       },
        //     ],
        //   },
        //   type: "custom:monster-card",
        //   id: "6d4744d14a7c42668633cedbe655ba08",
        //   card: {
        //     show_header_toggle: false,
        //     type: "entities",
        //     title: "G\u00e4ster",
        //   },
        //   show_empty: false,
        // },
        // {
        //   filter: {
        //     exclude: [
        //       {
        //         state: "Inget",
        //       },
        //       {
        //         state: "i.u.",
        //       },
        //     ],
        //     include: [
        //       {
        //         entity_id: "sensor.pollen_al",
        //       },
        //       {
        //         entity_id: "sensor.pollen_alm",
        //       },
        //       {
        //         entity_id: "sensor.pollen_salg_vide",
        //       },
        //       {
        //         entity_id: "sensor.pollen_bjork",
        //       },
        //       {
        //         entity_id: "sensor.pollen_bok",
        //       },
        //       {
        //         entity_id: "sensor.pollen_ek",
        //       },
        //       {
        //         entity_id: "sensor.pollen_grabo",
        //       },
        //       {
        //         entity_id: "sensor.pollen_gras",
        //       },
        //       {
        //         entity_id: "sensor.pollen_hassel",
        //       },
        //     ],
        //   },
        //   type: "custom:monster-card",
        //   id: "7ecee83212d340b0901f63ac9ec24328",
        //   card: {
        //     show_header_toggle: false,
        //     type: "entities",
        //     title: "Pollenniv\u00e5er",
        //   },
        //   show_empty: false,
        // },
        {
          cards: [
            {
              entities: [
                "switch.rest_julbelysning",
                "binary_sensor.front_door_sensor",
                "binary_sensor.unifi_camera",
                "binary_sensor.back_door_sensor",
              ],
              image: "/assets/kernehed/camera.entre.jpg",
              type: "picture-glance",
              title: "Entrance camera",
            },
            {
              entities: [
                "input_select.christmas_pattern",
                "input_select.christmas_palette",
              ],
              type: "entities",
            },
          ],
          type: "vertical-stack",
          id: "fc8abcaade0e4087a10a5602f3bdb4d4",
        },
        // {
        //   url: "https://embed.windy.com/embed2.html",
        //   type: "iframe",
        //   id: "3870fdc794274f17b84dd6ced631b737",
        // },
        {
          entities: [
            {
              name: "Laundry sensor",
              entity: "binary_sensor.tvattstugan_motion_sensor",
            },
            {
              name: "Pantry sensor",
              entity: "binary_sensor.skafferiet_motion_sensor",
            },
            {
              name: "Basement sensor",
              entity: "binary_sensor.kallaren_motion_sensor",
            },
            {
              name: "Stair sensor",
              entity: "binary_sensor.trapp_motion_sensor",
            },
            {
              name: "Bench sensor",
              entity: "binary_sensor.banksensor",
            },
            {
              name: "Porch sensor",
              entity: "binary_sensor.altan_motion_sensor",
            },
            {
              name: "Bathroom sensor",
              entity: "binary_sensor.badrumssensor",
            },
          ],
          type: "glance",
          id: "fac4c51ac1914e3a897da643077e15f3",
          show_state: false,
        },
        {
          entities: ["sensor.oskar_bluetooth"],
          show_header_toggle: false,
          type: "entities",
          id: "37279816181f442eac853b132142141",
          title: "Occupancy",
        },
        // {
        //   filter: {
        //     exclude: [
        //       {
        //         state: false,
        //       },
        //     ],
        //     include: [
        //       {
        //         entity_id:
        //           "binary_sensor.fibaro_system_unknown_type0c02_id1003_sensor_2",
        //       },
        //       {
        //         entity_id:
        //           "binary_sensor.fibaro_system_unknown_type0c02_id1003_sensor_3",
        //       },
        //     ],
        //   },
        //   type: "custom:monster-card",
        //   id: "2a440c2701824fdb9d5ebc9827c0917b",
        //   card: {
        //     show_header_toggle: false,
        //     type: "entities",
        //     title: "Brandvarnare",
        //   },
        //   show_empty: false,
        // },
        {
          type: "weather-forecast",
          id: "2bf8ccbc1f664c23b10b6533ae82f7e2",
          entity: "weather.smhi_vader",
        },
        // {
        //   cards: [
        //     {
        //       max: 50,
        //       min: -50,
        //       type: "gauge",
        //       title: "\u00d6verv\u00e5ning",
        //       entity:
        //         "sensor.fibaro_system_unknown_type0c02_id1003_temperature",
        //     },
        //     {
        //       max: 50,
        //       min: -50,
        //       type: "gauge",
        //       title: "Entr\u00e9n",
        //       entity:
        //         "sensor.fibaro_system_unknown_type0c02_id1003_temperature_2",
        //     },
        //     {
        //       max: 50,
        //       min: -50,
        //       type: "gauge",
        //       title: "K\u00e4llaren",
        //       entity:
        //         "sensor.philio_technology_corporation_phpat02beu_multisensor_2in1_temperature",
        //     },
        //   ],
        //   type: "custom:slideshow-card",
        //   arrow_color: "var(--primary-text-color)",
        //   arrow_opacity: 0.7,
        // },
      ],
      title: "Home",
      id: "hem",
      icon: "mdi:home",
    },
    {
      cards: [
        {
          entities: [
            "sensor.processor_use",
            "sensor.memory_free",
            "sensor.disk_free_home",
            "sensor.last_boot",
            "sensor.db_size",
          ],
          show_header_toggle: false,
          type: "entities",
          id: "7c92cd52219548b6a6a6d5ee6088e071",
          title: "System",
        },
        {
          entities: [
            "sensor.pi_hole_dns_queries_today",
            "sensor.pi_hole_ads_blocked_today",
            "sensor.pi_hole_dns_unique_clients",
          ],
          show_header_toggle: false,
          type: "entities",
          id: 123123123123213123,
          title: "Pi-Hole",
        },
        {
          entities: [
            "sensor.plex",
            "binary_sensor.gaming_pc",
            "binary_sensor.server_1",
            "binary_sensor.server_2",
            "binary_sensor.windows_server",
            "binary_sensor.teamspeak",
            "binary_sensor.harmony_hub",
            {
              style: {
                height: "1px",
                width: "85%",
                "margin-left": "auto",
                background: "#62717b",
                "margin-right": "auto",
              },
              type: "divider",
            },
            // {
            //   items: ["sensor.uptime_router", "sensor.installerad_routeros"],
            //   head: {
            //     entity: "binary_sensor.router",
            //   },
            //   type: "custom:fold-entity-row",
            //   group_config: {
            //     icon: "mdi:router",
            //   },
            // },
            // {
            //   items: [
            //     "sensor.uptime_router_server",
            //     "sensor.installerad_routeros_server",
            //   ],
            //   head: {
            //     entity: "binary_sensor.router_server",
            //   },
            //   type: "custom:fold-entity-row",
            //   group_config: {
            //     icon: "mdi:router",
            //   },
            // },
          ],
          show_header_toggle: false,
          type: "entities",
          id: "3e18f63e2c6640d185bf0486a9c4c03f",
          title: "Network",
        },
        {
          entities: [
            "binary_sensor.ubiquiti_controller",
            "binary_sensor.ubiquiti_switch",
            "binary_sensor.ubiquiti_nvr",
            "binary_sensor.entre_kamera",
            // {
            //   items: ["sensor.uptime_ap_1"],
            //   head: {
            //     entity: "binary_sensor.accesspunkt_1",
            //   },
            //   type: "custom:fold-entity-row",
            //   group_config: {
            //     icon: "router-wireless",
            //   },
            // },
            // {
            //   items: ["sensor.uptime_ap_2"],
            //   head: {
            //     entity: "binary_sensor.accesspunkt_2",
            //   },
            //   type: "custom:fold-entity-row",
            //   group_config: {
            //     icon: "router-wireless",
            //   },
            // },
            "sensor.total_clients_wireless",
          ],
          show_header_toggle: false,
          type: "entities",
          id: "b8e18e8750224f58b404d0f2e644529a",
          title: "Ubiquiti",
        },
        {
          entities: [
            "sensor.qbittorrent_up_speed",
            "sensor.qbittorrent_down_speed",
            "sensor.qbittorrent_status",
          ],
          show_header_toggle: false,
          type: "entities",
          id: "af8fb9251ce7453ca90c710722b4625b",
          title: "Bittorrent",
        },
        {
          entities: [
            "sensor.speedtest_download",
            "sensor.speedtest_upload",
            "sensor.speedtest_ping",
          ],
          show_header_toggle: false,
          type: "entities",
          id: 12312412,
          title: "Bandbredd",
        },
        // {
        //   title: "Updater",
        //   type: "custom:tracker-card",
        //   trackers: [
        //     "sensor.custom_card_tracker",
        //     "sensor.custom_component_tracker",
        //   ],
        // },
      ],
      title: "System & Network",
      id: "system_natverk",
      icon: "mdi:server-network",
    },
  ],
});
