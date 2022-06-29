import { DemoConfig } from "../types";

export const demoLovelaceKernehed: DemoConfig["lovelace"] = () => ({
  name: "Hem",
  resources: [],
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
                        left: "85%",
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
                        top: "93%",
                        left: "20%",
                      },
                      type: "state-label",
                      entity: "sensor.bella_devices",
                    },
                    {
                      style: {
                        color: "white",
                        top: "93%",
                        left: "85%",
                      },
                      type: "state-label",
                      entity: "sensor.battery_bella",
                    },
                    {
                      style: {
                        color: "white",
                        top: "93%",
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
          title: "Lock",
        },
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
        },
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
          show_state: false,
          columns: 4,
        },
        {
          entities: ["sensor.oskar_bluetooth"],
          show_header_toggle: false,
          type: "entities",
          title: "Occupancy",
        },
        {
          type: "weather-forecast",
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
      path: "home",
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
          title: "System",
        },
        {
          entities: [
            {
              entity: "sensor.pi_hole_dns_queries_today",
              name: "DNS Queries Today",
            },
            {
              entity: "sensor.pi_hole_ads_blocked_today",
              name: "Ads Blocked Today",
            },
            {
              entity: "sensor.pi_hole_dns_unique_clients",
              name: "DNS Unique Clients",
            },
          ],
          show_header_toggle: false,
          type: "entities",
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
          ],
          show_header_toggle: false,
          state_color: true,
          type: "entities",
          title: "Network",
        },
        {
          entities: [
            "binary_sensor.ubiquiti_controller",
            "binary_sensor.ubiquiti_switch",
            "binary_sensor.ubiquiti_nvr",
            "binary_sensor.entre_kamera",
            "sensor.total_clients_wireless",
          ],
          show_header_toggle: false,
          state_color: true,
          type: "entities",
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
          title: "Bandwidth",
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
      path: "system_network",
      icon: "mdi:server-network",
    },
  ],
});
