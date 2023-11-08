import { convertEntities } from "../../../../src/fake_data/entity";
import { DemoConfig } from "../types";

export const demoEntitiesTeachingbirds: DemoConfig["entities"] = () =>
  convertEntities({
    "todo.shopping_list": {
      entity_id: "todo.shopping_list",
      state: "2",
      attributes: {
        supported_features: 15,
        friendly_name: "Shopping List",
        icon: "mdi:cart",
      },
    },
    "sensor.pollen_grabo": {
      entity_id: "sensor.pollen_grabo",
      state: "",
      attributes: {
        friendly_name: "Mugwort",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'no levels') return [0, 0]; else if (state === 'low levels') return [50, 70]; else if (state === 'low-moderate levels') return [40, 70]; else if (state === 'moderate levels') return [30, 70]; else if (state === 'moderate-high levels') return [20, 85]; else if (state === 'high levels') return [10, 65]; else if (state === 'very high levels') return [0, 85];",
        },
        icon: "mdi:flower",
      },
    },
    "sensor.pollen_bjork": {
      entity_id: "sensor.pollen_bjork",
      state: "",
      attributes: {
        friendly_name: "Birch",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'no levels') return [0, 0]; else if (state === 'low levels') return [50, 70]; else if (state === 'low-moderate levels') return [40, 70]; else if (state === 'moderate levels') return [30, 70]; else if (state === 'moderate-high levels') return [20, 85]; else if (state === 'high levels') return [10, 65]; else if (state === 'very high levels') return [0, 85];",
        },
        icon: "mdi:leaf",
      },
    },
    "sensor.pollen_gras": {
      entity_id: "sensor.pollen_gras",
      state: "",
      attributes: {
        friendly_name: "Grass",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'no levels') return [0, 0]; else if (state === 'low levels') return [50, 70]; else if (state === 'low-moderate levels') return [40, 70]; else if (state === 'moderate levels') return [30, 70]; else if (state === 'moderate-high levels') return [20, 85]; else if (state === 'high levels') return [10, 65]; else if (state === 'very high levels') return [0, 85];",
        },
        icon: "mdi:flower",
      },
    },
    "sensor.front_door": {
      entity_id: "sensor.front_door",
      state: "Unknown",
      attributes: {
        friendly_name: "Front Door",
        icon: "mdi:comment-question-outline",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Closed') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Open') return [0, 85];",
        },
        hs_color: [40, 70],
      },
    },
    "sensor.yard_door": {
      entity_id: "sensor.yard_door",
      state: "Closed",
      attributes: {
        friendly_name: "Yard Door",
        icon: "mdi:door",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Closed') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Open') return [0, 85];",
        },
        hs_color: [0, 0],
      },
    },
    "sensor.balcony_door": {
      entity_id: "sensor.balcony_door",
      state: "Closed",
      attributes: {
        friendly_name: "Balcony Door",
        icon: "mdi:door",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Closed') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Open') return [0, 85];",
        },
        hs_color: [0, 0],
      },
    },
    "sensor.back_door": {
      entity_id: "sensor.back_door",
      state: "Closed",
      attributes: {
        friendly_name: "Back Door",
        icon: "mdi:door",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Closed') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Open') return [0, 85];",
        },
        hs_color: [0, 0],
      },
    },
    "sensor.system_stefan_laptop": {
      entity_id: "sensor.system_stefan_laptop",
      state: "Offline",
      attributes: {
        friendly_name: "Stefan laptop",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Online') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Offline') return [0, 85];",
        },
        icon: "mdi:laptop-windows",
        hs_color: [0, 85],
      },
    },
    "sensor.system_isa_computer": {
      entity_id: "sensor.system_isa_computer",
      state: "Offline",
      attributes: {
        friendly_name: "Isas computer",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Online') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Offline') return [0, 85];",
        },
        icon: "mdi:monitor",
        hs_color: [0, 85],
      },
    },
    "sensor.system_isa_laptop": {
      entity_id: "sensor.system_isa_laptop",
      state: "Offline",
      attributes: {
        friendly_name: "Isas old laptop",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Online') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Offline') return [0, 85];",
        },
        icon: "mdi:laptop-windows",
        hs_color: [0, 85],
      },
    },
    "sensor.system_isa_dell_xps": {
      entity_id: "sensor.system_isa_dell_xps",
      state: "Online",
      attributes: {
        friendly_name: "Isa Dell XPS",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Online') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Offline') return [0, 85];",
        },
        icon: "mdi:laptop-windows",
        hs_color: [0, 0],
      },
    },
    "sensor.system_printer": {
      entity_id: "sensor.system_printer",
      state: "Online",
      attributes: {
        friendly_name: "HP Printer",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Online') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Offline') return [0, 85];",
        },
        icon: "mdi:printer",
        hs_color: [0, 0],
      },
    },
    "sensor.system_ipad": {
      entity_id: "sensor.system_ipad",
      state: "Online",
      attributes: {
        friendly_name: "iPad",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Online') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Offline') return [0, 85];",
        },
        icon: "mdi:tablet-ipad",
        hs_color: [0, 0],
      },
    },
    "sensor.system_asus_router": {
      entity_id: "sensor.system_asus_router",
      state: "Online",
      attributes: {
        friendly_name: "Asus Router",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Online') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Offline') return [0, 85];",
        },
        icon: "mdi:wifi",
        hs_color: [0, 0],
      },
    },
    "sensor.system_ip_camera": {
      entity_id: "sensor.system_ip_camera",
      state: "Online",
      attributes: {
        friendly_name: "Sannce Camera",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Online') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Offline') return [0, 85];",
        },
        icon: "mdi:webcam",
        hs_color: [0, 0],
      },
    },
    "sensor.system_ir_blaster": {
      entity_id: "sensor.system_ir_blaster",
      state: "Online",
      attributes: {
        friendly_name: "Broadlink IR Blaster Hallway",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Online') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Offline') return [0, 85];",
        },
        icon: "mdi:remote",
        hs_color: [0, 0],
      },
    },
    "sensor.system_milight_hub": {
      entity_id: "sensor.system_milight_hub",
      state: "Online",
      attributes: {
        friendly_name: "Milight Hub",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Online') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Offline') return [0, 85];",
        },
        icon: "mdi:google-keep",
        hs_color: [0, 0],
      },
    },
    "sensor.system_ir_blaster_bedroom": {
      entity_id: "sensor.system_ir_blaster_bedroom",
      state: "Online",
      attributes: {
        friendly_name: "Broadlink IR Blaster Bedroom",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Online') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Offline') return [0, 85];",
        },
        icon: "mdi:remote",
        hs_color: [0, 0],
      },
    },
    "sensor.system_ir_blaster_living_room": {
      entity_id: "sensor.system_ir_blaster_living_room",
      state: "Online",
      attributes: {
        friendly_name: "Broadlink IR Blaster Living Room",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Online') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Offline') return [0, 85];",
        },
        icon: "mdi:remote",
        hs_color: [0, 0],
      },
    },
    "sensor.system_xiaomi_gateway": {
      entity_id: "sensor.system_xiaomi_gateway",
      state: "Online",
      attributes: {
        friendly_name: "Xiaomi Gateway",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Online') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Offline') return [0, 85];",
        },
        icon: "mdi:circle-outline",
        hs_color: [0, 0],
      },
    },
    "sensor.system_sonos": {
      entity_id: "sensor.system_sonos",
      state: "Online",
      attributes: {
        friendly_name: "Sonos",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Online') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Offline') return [0, 85];",
        },
        hs_color: [0, 0],
      },
    },
    "sensor.system_magic_mirror_rpi": {
      entity_id: "sensor.system_magic_mirror_rpi",
      state: "Online",
      attributes: {
        friendly_name: "Dashboard RPi",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Online') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Offline') return [0, 85];",
        },
        icon: "mdi:raspberrypi",
        hs_color: [0, 0],
      },
    },
    "sensor.system_nas": {
      entity_id: "sensor.system_nas",
      state: "Online",
      attributes: {
        friendly_name: "Synology NAS",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Online') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Offline') return [0, 85];",
        },
        icon: "mdi:server",
        hs_color: [0, 0],
      },
    },
    "sensor.system_hass_rpi": {
      entity_id: "sensor.system_hass_rpi",
      state: "Online",
      attributes: {
        friendly_name: "Hass RPi",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Online') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Offline') return [0, 85];",
        },
        icon: "mdi:home-assistant",
        hs_color: [0, 0],
      },
    },
    "sensor.system_samsung65": {
      entity_id: "sensor.system_samsung65",
      state: "Offline",
      attributes: {
        friendly_name: "Living Room TV",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Online') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Offline') return [0, 85];",
        },
        icon: "mdi:television",
        hs_color: [0, 85],
      },
    },
    "sensor.system_dashboard_rpi": {
      entity_id: "sensor.system_dashboard_rpi",
      state: "Offline",
      attributes: {
        friendly_name: '7" Dashboard RPi',
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Online') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Offline') return [0, 85];",
        },
        icon: "mdi:raspberrypi",
        hs_color: [0, 85],
      },
    },
    "sensor.system_samsung49": {
      entity_id: "sensor.system_samsung49",
      state: "Offline",
      attributes: {
        friendly_name: "Bedroom TV",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Online') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Offline') return [0, 85];",
        },
        icon: "mdi:television",
        hs_color: [0, 85],
      },
    },
    "sensor.system_rpi_zero": {
      entity_id: "sensor.system_rpi_zero",
      state: "Online",
      attributes: {
        friendly_name: "RPi Zero",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Online') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Offline') return [0, 85];",
        },
        icon: "mdi:raspberrypi",
        hs_color: [0, 0],
      },
    },
    "sensor.system_movie_system": {
      entity_id: "sensor.system_movie_system",
      state: "Offline",
      attributes: {
        friendly_name: "Living Room Movie System",
        custom_ui_state_card: "state-card-custom-ui",
        hidden: true,
        templates: {
          hs_color:
            "if (state === 'Online') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Offline') return [0, 85];",
        },
        icon: "mdi:speaker",
        hs_color: [0, 85],
      },
    },
    "sensor.system_ring_doorbell": {
      entity_id: "sensor.system_ring_doorbell",
      state: "Offline",
      attributes: {
        friendly_name: "Ring",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Online') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Offline') return [0, 85];",
        },
        icon: "mdi:doorbell-video",
        hs_color: [0, 85],
      },
    },
    "sensor.system_netgear_router": {
      entity_id: "sensor.system_netgear_router",
      state: "Online",
      attributes: {
        friendly_name: "Netgear Router",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Online') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Offline') return [0, 85];",
        },
        icon: "mdi:wifi",
        hs_color: [0, 0],
      },
    },
    "sensor.system_ring_chime_pro": {
      entity_id: "sensor.system_ring_chime_pro",
      state: "Offline",
      attributes: {
        friendly_name: "Ring Chime Pro",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Online') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Offline') return [0, 85];",
        },
        icon: "mdi:wifi",
        hs_color: [0, 85],
      },
    },
    "sensor.system_shield": {
      entity_id: "sensor.system_shield",
      state: "Online",
      attributes: {
        friendly_name: "NVidia Shield",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Online') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Offline') return [0, 85];",
        },
        icon: "mdi:android",
        hs_color: [0, 0],
      },
    },
    "sensor.system_ring_chime": {
      entity_id: "sensor.system_ring_chime",
      state: "Offline",
      attributes: {
        friendly_name: "Ring Chime Pro",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Online') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Offline') return [0, 85];",
        },
        icon: "mdi:bell-outline",
        hs_color: [0, 85],
      },
    },
    "sensor.system_chromecast_bedroom": {
      entity_id: "sensor.system_chromecast_bedroom",
      state: "Online",
      attributes: {
        friendly_name: "Chromecast Bedroom",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Online') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Offline') return [0, 85];",
        },
        icon: "mdi:cast",
        hs_color: [0, 0],
      },
    },
    "sensor.system_dafang": {
      entity_id: "sensor.system_dafang",
      state: "Online",
      attributes: {
        friendly_name: "Dafang",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Online') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Offline') return [0, 85];",
        },
        hs_color: [0, 0],
      },
    },
    "sensor.system_stefan_computer": {
      entity_id: "sensor.system_stefan_computer",
      state: "Online",
      attributes: {
        friendly_name: "Stefan computer",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Online') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Offline') return [0, 85];",
        },
        icon: "mdi:monitor",
        hs_color: [0, 0],
      },
    },
    "sensor.unlocked_by": {
      entity_id: "sensor.unlocked_by",
      state: "Stefan",
      attributes: {
        friendly_name: "Unlocked by",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Locked') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Unlocked') return [0, 85];",
        },
      },
    },
    "sensor.greenhouse_temperature": {
      entity_id: "sensor.greenhouse_temperature",
      state: "21.3",
      attributes: {
        count_sensors: 3,
        max_value: 21.3,
        mean: 21.3,
        min_value: 21.3,
        last: 21.3,
        unit_of_measurement: "\u00b0C",
        friendly_name: "Greenhouse temperature",
        icon: "mdi:calculator",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state < 23) return [0, 0]; else if (state > 23) return [40, 70]; else if (state > 25) return [0, 85];",
        },
        hs_color: [0, 0],
      },
    },
    "sensor.dining_area_window": {
      entity_id: "sensor.dining_area_window",
      state: "Closed",
      attributes: {
        friendly_name: "Dining area window",
        icon: "mdi:window-closed",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Closed') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Open') return [0, 85];",
        },
        hs_color: [0, 0],
      },
    },
    "sensor.bedroom_window": {
      entity_id: "sensor.bedroom_window",
      state: "Closed",
      attributes: {
        friendly_name: "Bedroom window",
        icon: "mdi:window-closed",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Closed') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Open') return [0, 85];",
        },
        hs_color: [0, 0],
      },
    },
    "sensor.passage_movement": {
      entity_id: "sensor.passage_movement",
      state: "No movement",
      attributes: {
        friendly_name: "Passage Movement",
        icon: "mdi:sleep",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "sensor.upstairs_hallway_movement": {
      entity_id: "sensor.upstairs_hallway_movement",
      state: "No movement",
      attributes: {
        friendly_name: "Upstairs Hallway Movement",
        icon: "mdi:sleep",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "sensor.trash_status": {
      entity_id: "sensor.trash_status",
      state: "Put out",
      attributes: {
        friendly_name: "Trash",
        custom_ui_state_card: "state-card-custom-ui",
        icon: "mdi:delete",
      },
    },
    "sensor.herbs_moisture": {
      entity_id: "sensor.herbs_moisture",
      state: "39",
      attributes: {
        unit_of_measurement: "%",
        friendly_name: "Herbs moisture",
        custom_ui_state_card: "state-card-custom-ui",
        icon: "mdi:water-percent",
      },
    },
    "sensor.monitor": {
      entity_id: "sensor.monitor",
      state: "unknown",
      attributes: {
        friendly_name: "Monitor",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "sensor.speedtest_ping": {
      entity_id: "sensor.speedtest_ping",
      state: "6.859",
      attributes: {
        attribution: "Data retrieved from Speedtest by Ookla",
        bytes_received: 286845795,
        bytes_sent: 146800640,
        server_country: "Sweden",
        server_id: "10256",
        latency: 6.859,
        server_name: "Stockholm",
        unit_of_measurement: "ms",
        friendly_name: "Speedtest Ping",
        icon: "mdi:speedometer",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "sensor.speedtest_upload": {
      entity_id: "sensor.speedtest_upload",
      state: "169.8",
      attributes: {
        attribution: "Data retrieved from Speedtest by Ookla",
        bytes_received: 286845795,
        bytes_sent: 146800640,
        server_country: "Sweden",
        server_id: "10256",
        latency: 6.859,
        server_name: "Stockholm",
        unit_of_measurement: "Mbit/s",
        friendly_name: "Speedtest Upload",
        icon: "mdi:speedometer",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "sensor.speedtest_download": {
      entity_id: "sensor.speedtest_download",
      state: "229.23",
      attributes: {
        attribution: "Data retrieved from Speedtest by Ookla",
        bytes_received: 286845795,
        bytes_sent: 146800640,
        server_country: "Sweden",
        server_id: "10256",
        latency: 6.859,
        server_name: "Stockholm",
        unit_of_measurement: "Mbit/s",
        friendly_name: "Speedtest Download",
        icon: "mdi:speedometer",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "sensor.big_chili_moisture": {
      entity_id: "sensor.big_chili_moisture",
      state: "36",
      attributes: {
        unit_of_measurement: "%",
        friendly_name: "Big chili moisture",
        custom_ui_state_card: "state-card-custom-ui",
        icon: "mdi:water-percent",
      },
    },
    "sensor.memory_use_percent": {
      entity_id: "sensor.memory_use_percent",
      state: "19.4",
      attributes: {
        unit_of_measurement: "%",
        friendly_name: "Memory use (percent)",
        icon: "mdi:memory",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "sensor.small_chili_moisture": {
      entity_id: "sensor.small_chili_moisture",
      state: "34",
      attributes: {
        unit_of_measurement: "%",
        friendly_name: "Small chili moisture",
        custom_ui_state_card: "state-card-custom-ui",
        icon: "mdi:water-percent",
      },
    },
    "sensor.processor_use": {
      entity_id: "sensor.processor_use",
      state: "37",
      attributes: {
        unit_of_measurement: "%",
        friendly_name: "Processor use",
        icon: "mdi:memory",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "sensor.last_boot": {
      entity_id: "sensor.last_boot",
      state: "2019-01-10T16:56:44+01:00",
      attributes: {
        unit_of_measurement: "",
        friendly_name: "Last boot",
        icon: "mdi:clock",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "sensor.disk_use_percent_": {
      entity_id: "sensor.disk_use_percent_",
      state: "28.7",
      attributes: {
        unit_of_measurement: "%",
        friendly_name: "Disk use (percent) /",
        icon: "mdi:harddisk",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "sensor.isabellas_iphone_x_bt": {
      entity_id: "sensor.isabellas_iphone_x_bt",
      state: "unknown",
      attributes: {
        friendly_name: "isabellas_iphone_x_bt",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "sensor.stefan_iphone_7_bt": {
      entity_id: "sensor.stefan_iphone_7_bt",
      state: "unknown",
      attributes: {
        friendly_name: "stefan_iphone_7_bt",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "sensor.ring_front_door_last_motion": {
      entity_id: "sensor.ring_front_door_last_motion",
      state: "13:07",
      attributes: {
        attribution: "Data provided by Ring.com",
        device_id: "50338bebd4c6",
        firmware: "Up to Date",
        kind: "doorbell_v4",
        timezone: "Europe/Stockholm",
        type: "doorbots",
        wifi_name: "RingOfSecurity-T4UPC6C8n",
        created_at: "2019-01-19T13:07:40+01:00",
        answered: false,
        recording_status: "ready",
        category: "motion",
        friendly_name: "Front Door Last Motion",
        icon: "mdi:history",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state === 'Closed') return [0, 0]; else if (state === 'Unknown') return [40, 70]; else if (state === 'Open') return [0, 85];",
        },
      },
    },
    "switch.livingroom_movie_system": {
      entity_id: "switch.livingroom_movie_system",
      state: "on",
      attributes: {
        friendly_name: "livingroom_movie_system",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "switch.livingroom_tv": {
      entity_id: "switch.livingroom_tv",
      state: "on",
      attributes: {
        friendly_name: "livingroom_tv",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "switch.stefan_radiator_3": {
      entity_id: "switch.stefan_radiator_3",
      state: "off",
      attributes: {
        friendly_name: "Stefan Radiator",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "zone.store": {
      entity_id: "zone.store",
      state: "zoning",
      attributes: {
        hidden: true,
        radius: 300,
        friendly_name: "Store",
        icon: "mdi:cart",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "zone.work_s": {
      entity_id: "zone.work_s",
      state: "zoning",
      attributes: {
        hidden: true,
        radius: 300,
        friendly_name: "Work S",
        icon: "mdi:code-braces",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "zone.work_solna": {
      entity_id: "zone.work_solna",
      state: "zoning",
      attributes: {
        hidden: true,
        radius: 300,
        friendly_name: "Work Solna",
        icon: "mdi:code-braces",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "zone.work_i": {
      entity_id: "zone.work_i",
      state: "zoning",
      attributes: {
        hidden: true,
        radius: 300,
        friendly_name: "Work I",
        icon: "mdi:code-braces",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "zone.golf": {
      entity_id: "zone.golf",
      state: "zoning",
      attributes: {
        hidden: true,
        radius: 800,
        friendly_name: "Golf",
        icon: "mdi:golf",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "zone.johannes_och_tessie": {
      entity_id: "zone.johannes_och_tessie",
      state: "zoning",
      attributes: {
        hidden: true,
        radius: 300,
        friendly_name: "Johannes och Tessie",
        icon: "mdi:account-multiple",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "zone.brulle_och_saara": {
      entity_id: "zone.brulle_och_saara",
      state: "zoning",
      attributes: {
        hidden: true,
        radius: 300,
        friendly_name: "Brulle och Saara",
        icon: "mdi:account-multiple",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "zone.emelie": {
      entity_id: "zone.emelie",
      state: "zoning",
      attributes: {
        hidden: true,
        radius: 300,
        friendly_name: "Emelie",
        icon: "mdi:account-multiple",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "zone.isa_mamma": {
      entity_id: "zone.isa_mamma",
      state: "zoning",
      attributes: {
        hidden: true,
        radius: 300,
        friendly_name: "Isa mamma",
        icon: "mdi:account-multiple",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "zone.fagelbro": {
      entity_id: "zone.fagelbro",
      state: "zoning",
      attributes: {
        hidden: true,
        radius: 1000,
        friendly_name: "Fagelbro",
        icon: "mdi:golf",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "zone.home": {
      entity_id: "zone.home",
      state: "zoning",
      attributes: {
        hidden: true,
        radius: 100,
        friendly_name: "Home",
        icon: "mdi:home",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "script.air_cleaner_quiet": {
      entity_id: "script.air_cleaner_quiet",
      state: "off",
      attributes: {
        last_triggered: null,
        friendly_name: "air_cleaner_quiet",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "script.air_cleaner_auto": {
      entity_id: "script.air_cleaner_auto",
      state: "off",
      attributes: {
        last_triggered: null,
        friendly_name: "air_cleaner_auto",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "script.air_cleaner_turbo": {
      entity_id: "script.air_cleaner_turbo",
      state: "off",
      attributes: {
        last_triggered: null,
        friendly_name: "air_cleaner_turbo",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "script.ac_off": {
      entity_id: "script.ac_off",
      state: "off",
      attributes: {
        last_triggered: null,
        friendly_name: "ac_off",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "script.ac_on": {
      entity_id: "script.ac_on",
      state: "off",
      attributes: {
        last_triggered: null,
        friendly_name: "ac_on",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "input_boolean.vacation_mode": {
      entity_id: "input_boolean.vacation_mode",
      state: "off",
      attributes: {
        friendly_name: "Vacation Mode",
        icon: "mdi:beach",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "input_boolean.isa_mode": {
      entity_id: "input_boolean.isa_mode",
      state: "off",
      attributes: {
        friendly_name: "Isabella Mode",
        icon: "mdi:account-off",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          icon: "if (state === 'on') return 'mdi:account'; else if (state === 'off') return 'mdi:account-off';\n",
          icon_color:
            "if (state === 'on') return 'rgb(56, 150, 56)'; else if (state === 'off') return 'rgb(249, 251, 255)';\n",
        },
        icon_color: "rgb(249, 251, 255)",
      },
    },
    "input_boolean.cleaning_day": {
      entity_id: "input_boolean.cleaning_day",
      state: "off",
      attributes: {
        friendly_name: "Cleaning Day",
        icon: "mdi:broom",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "input_boolean.guest_mode": {
      entity_id: "input_boolean.guest_mode",
      state: "off",
      attributes: {
        friendly_name: "Guest Mode",
        icon: "mdi:account-multiple-minus",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          icon: "if (state === 'on') return 'mdi:account-group'; else if (state === 'off') return 'mdi:account-multiple-minus';\n",
          icon_color:
            "if (state === 'on') return 'rgb(56, 150, 56)'; else if (state === 'off') return 'rgb(249, 251, 255)';\n",
        },
        icon_color: "rgb(249, 251, 255)",
      },
    },
    "counter.litterbox_downstairs_visits": {
      entity_id: "counter.litterbox_downstairs_visits",
      state: "3",
      attributes: {
        initial: 0,
        step: 1,
        friendly_name: "Downstairs Litterbox Visits",
        custom_ui_state_card: "state-card-custom-ui",
        icon: "mdi:emoticon-poop",
      },
    },
    "counter.litterbox_upstairs_visits": {
      entity_id: "counter.litterbox_upstairs_visits",
      state: "1",
      attributes: {
        initial: 0,
        step: 1,
        friendly_name: "Upstairs Litterbox Visits",
        custom_ui_state_card: "state-card-custom-ui",
        icon: "mdi:emoticon-poop",
      },
    },
    "scene.movie_time": {
      entity_id: "scene.movie_time",
      state: "scening",
      attributes: {
        entity_id: [
          "light.living_room_spotlights_level",
          "light.passage_ceiling_spotlights_level",
          "light.kitchen_ceiling_spotlights_level",
          "light.dining_area_ceiling_light_level",
          "light.floorlamp_reading_light",
          "light.floorlamp_uplight",
          "light.isa_ceiling_light",
          "light.living_room_ceiling_light_level",
          "light.stairs_lights",
          "light.upstairs_hallway_ceiling_light_level",
        ],
        friendly_name: "Movie Time",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "scene.morning_lights": {
      entity_id: "scene.morning_lights",
      state: "scening",
      attributes: {
        entity_id: [
          "light.living_room_ceiling_light_level",
          "light.kitchen_ceiling_spotlights_level",
          "light.passage_ceiling_spotlights_level",
          "light.upstairs_hallway_ceiling_light_level",
          "light.floorlamp_uplight",
          "light.stairs_lights",
        ],
        friendly_name: "Morning Lights",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "input_select.dryer_status": {
      entity_id: "input_select.dryer_status",
      state: "Idle",
      attributes: {
        options: ["Idle", "Running", "Clean"],
        friendly_name: "Dryer Status",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "input_select.roomba_mode": {
      entity_id: "input_select.roomba_mode",
      state: "Vacuuming",
      attributes: {
        options: [
          "Waiting",
          "Vacuum Now",
          "Vacuuming",
          "Has Vacuumed",
          "Dock",
          "Not Today",
        ],
        friendly_name: "Roomba",
        icon: "mdi:robot-vacuum",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "input_select.washing_machine_status": {
      entity_id: "input_select.washing_machine_status",
      state: "Running",
      attributes: {
        options: ["Idle", "Running", "Clean"],
        friendly_name: "Washing Machine Status",
        custom_ui_state_card: "state-card-custom-ui",
        icon: "mdi:washing-machine",
      },
    },
    "light.upstairs_lights": {
      entity_id: "light.upstairs_lights",
      state: "on",
      attributes: {
        min_mireds: 153,
        max_mireds: 500,
        brightness: 63,
        color_temp: 200,
        supported_color_modes: ["brightness", "color_temp", "rgb"],
        color_mode: "color_temp",
        friendly_name: "Upstairs lights",
        supported_features: 63,
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "light.walk_in_closet_lights": {
      entity_id: "light.walk_in_closet_lights",
      state: "unavailable",
      attributes: {
        friendly_name: "Walk in closet lights",
        supported_features: 41,
        supported_color_modes: ["brightness", "color_temp"],
        custom_ui_state_card: "state-card-custom-ui",
        icon: "mdi:wall-sconce",
      },
    },
    "light.outdoor_lights": {
      entity_id: "light.outdoor_lights",
      state: "on",
      attributes: {
        brightness: 254,
        friendly_name: "Outdoor lights",
        supported_features: 41,
        supported_color_modes: ["brightness"],
        color_mode: "brightness",
        custom_ui_state_card: "state-card-custom-ui",
        icon: "mdi:wall-sconce",
      },
    },
    "light.downstairs_lights": {
      entity_id: "light.downstairs_lights",
      state: "on",
      attributes: {
        min_mireds: 153,
        max_mireds: 500,
        brightness: 128,
        color_temp: 366,
        supported_color_modes: ["brightness", "color_temp", "rgb"],
        color_mode: "color_temp",
        effect_list: ["colorloop"],
        friendly_name: "Downstairs lights",
        supported_features: 63,
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "light.outdoor_yard_light_net": {
      entity_id: "light.outdoor_yard_light_net",
      state: "off",
      attributes: {
        friendly_name: "Outdoor yard light net",
        assumed_state: true,
        supported_features: 1,
        custom_ui_state_card: "state-card-custom-ui",
        icon: "mdi:lightbulb",
      },
    },
    "light.outdoor_hanging_lights": {
      entity_id: "light.outdoor_hanging_lights",
      state: "off",
      attributes: {
        friendly_name: "Outdoor hanging lights",
        assumed_state: true,
        supported_features: 1,
        custom_ui_state_card: "state-card-custom-ui",
        icon: "mdi:lightbulb",
      },
    },
    "light.outdoor_front_hanging_lights": {
      entity_id: "light.outdoor_front_hanging_lights",
      state: "off",
      attributes: {
        friendly_name: "Outdoor front hanging lights",
        assumed_state: true,
        supported_features: 1,
        custom_ui_state_card: "state-card-custom-ui",
        icon: "mdi:lightbulb",
      },
    },
    "binary_sensor.stefans_room_motion": {
      entity_id: "binary_sensor.stefans_room_motion",
      state: "off",
      attributes: {
        battery_level: 100,
        on: true,
        friendly_name: "Stefans Room Motion",
        device_class: "motion",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "sensor.temperature_stefan": {
      entity_id: "sensor.temperature_stefan",
      state: "26.2",
      attributes: {
        battery_level: 95,
        on: true,
        unit_of_measurement: "\u00b0C",
        friendly_name: "Stefans Room",
        icon: "mdi:thermometer",
        device_class: "temperature",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state < 23) return [0, 0]; else if (state > 23) return [40, 70]; else if (state > 25) return [0, 85];",
        },
        hs_color: [40, 70],
      },
    },
    "sensor.temperature_downstairs_bathroom": {
      entity_id: "sensor.temperature_downstairs_bathroom",
      state: "23.1",
      attributes: {
        battery_level: 85,
        on: true,
        unit_of_measurement: "\u00b0C",
        friendly_name: "Downstairs Bathroom",
        icon: "mdi:thermometer",
        device_class: "temperature",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state < 23) return [0, 0]; else if (state > 23) return [40, 70]; else if (state > 25) return [0, 85];",
        },
        hs_color: [40, 70],
      },
    },
    "sensor.temperature_bedroom": {
      entity_id: "sensor.temperature_bedroom",
      state: "22.7",
      attributes: {
        battery_level: 78,
        on: true,
        unit_of_measurement: "\u00b0C",
        friendly_name: "Bedroom",
        icon: "mdi:thermometer",
        device_class: "temperature",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state < 23) return [0, 0]; else if (state > 23) return [40, 70]; else if (state > 25) return [0, 85];",
        },
        hs_color: [0, 0],
      },
    },
    "sensor.temperature_storage": {
      entity_id: "sensor.temperature_storage",
      state: "-3.8",
      attributes: {
        battery_level: 75,
        on: true,
        unit_of_measurement: "\u00b0C",
        friendly_name: "Storage",
        icon: "mdi:thermometer",
        device_class: "temperature",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state < 23) return [0, 0]; else if (state > 23) return [40, 70]; else if (state > 25) return [0, 85];",
        },
        hs_color: [0, 0],
      },
    },
    "sensor.refrigerator": {
      entity_id: "sensor.refrigerator",
      state: "6.1",
      attributes: {
        battery_level: 78,
        on: true,
        unit_of_measurement: "\u00b0C",
        friendly_name: "Refrigerator",
        icon: "mdi:thermometer",
        device_class: "temperature",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "sensor.temperature_passage": {
      entity_id: "sensor.temperature_passage",
      state: "23.7",
      attributes: {
        battery_level: 85,
        on: true,
        unit_of_measurement: "\u00b0C",
        friendly_name: "Passage",
        icon: "mdi:thermometer",
        device_class: "temperature",
        custom_ui_state_card: "state-card-custom-ui",
        templates: {
          hs_color:
            "if (state < 23) return [0, 0]; else if (state > 23) return [40, 70]; else if (state > 25) return [0, 85];",
        },
        hs_color: [40, 70],
      },
    },
    "light.bedside_lamp": {
      entity_id: "light.bedside_lamp",
      state: "off",
      attributes: {
        min_mireds: 153,
        max_mireds: 500,
        supported_color_modes: ["brightness", "color_temp"],
        is_deconz_group: false,
        friendly_name: "Bedside Lamp",
        supported_features: 63,
        custom_ui_state_card: "state-card-custom-ui",
        icon: "mdi:lamp",
      },
    },
    "light.floorlamp_reading_light": {
      entity_id: "light.floorlamp_reading_light",
      state: "off",
      attributes: {
        min_mireds: 153,
        max_mireds: 500,
        supported_color_modes: ["brightness", "color_temp"],
        is_deconz_group: false,
        friendly_name: "Floorlamp Reading Light",
        supported_features: 43,
        custom_ui_state_card: "state-card-custom-ui",
        icon: "mdi:lamp",
      },
    },
    "light.hallway_window_light": {
      entity_id: "light.hallway_window_light",
      state: "on",
      attributes: {
        min_mireds: 153,
        max_mireds: 500,
        brightness: 128,
        color_temp: 366,
        supported_color_modes: ["brightness", "color_temp", "rgb"],
        color_mode: "color_temp",
        effect_list: ["colorloop"],
        is_deconz_group: false,
        friendly_name: "Hallway window light",
        supported_features: 63,
        custom_ui_state_card: "state-card-custom-ui",
        icon: "mdi:lamp",
      },
    },
    "light.isa_ceiling_light": {
      entity_id: "light.isa_ceiling_light",
      state: "on",
      attributes: {
        brightness: 77,
        is_deconz_group: false,
        supported_color_modes: ["brightness"],
        friendly_name: "Isa Ceiling Light",
        supported_features: 41,
        custom_ui_state_card: "state-card-custom-ui",
        icon: "mdi:ceiling-light",
      },
    },
    "light.floorlamp_uplight": {
      entity_id: "light.floorlamp_uplight",
      state: "on",
      attributes: {
        min_mireds: 153,
        max_mireds: 500,
        brightness: 150,
        color_temp: 366,
        supported_color_modes: ["brightness", "color_temp"],
        color_mode: "color_temp",
        effect_list: ["colorloop"],
        is_deconz_group: false,
        friendly_name: "Floorlamp",
        supported_features: 63,
        custom_ui_state_card: "state-card-custom-ui",
        icon: "mdi:floor-lamp",
      },
    },
    "light.bedroom_ceiling_light": {
      entity_id: "light.bedroom_ceiling_light",
      state: "unavailable",
      attributes: {
        friendly_name: "Bedroom Ceiling Light",
        supported_features: 41,
        supported_color_modes: ["brightness"],
        custom_ui_state_card: "state-card-custom-ui",
        icon: "mdi:ceiling-light",
      },
    },
    "light.gateway_light_34ce008bfc4b": {
      entity_id: "light.gateway_light_34ce008bfc4b",
      state: "off",
      attributes: {
        friendly_name: "Nightlight",
        supported_features: 17,
        supported_color_modes: ["brightness"],
        custom_ui_state_card: "state-card-custom-ui",
        icon: "mdi:lamp",
      },
    },
    "alarm_control_panel.house": {
      entity_id: "alarm_control_panel.house",
      state: "disarmed",
      attributes: {
        allsensors: [
          "binary_sensor.bedroom_door",
          "binary_sensor.balcony_door",
          "binary_sensor.yard_door",
          "binary_sensor.dining_area_window_sensor_sensor",
          "binary_sensor.stefans_room_motion",
          "binary_sensor.window_bedroom",
          "binary_sensor.passage_pir_sensor",
          "binary_sensor.upstairs_hallway_pir_sensor",
          "binary_sensor.front_door_sensor",
          "binary_sensor.back_door",
        ],
        arm_state: "disarmed",
        bwalarm_version: "1.1.3",
        changed_by: "",
        changedbyuser: null,
        code_format: ".+",
        code_to_arm: false,
        custom_ui_state_card: "state-card-custom-ui",
        delayed: [],
        enable_log: true,
        enable_perimeter_mode: true,
        enable_persistence: true,
        friendly_name: "House",
        ignored: [
          "binary_sensor.bedroom_door",
          "binary_sensor.balcony_door",
          "binary_sensor.yard_door",
          "binary_sensor.dining_area_window_sensor_sensor",
          "binary_sensor.stefans_room_motion",
          "binary_sensor.window_bedroom",
          "binary_sensor.passage_pir_sensor",
          "binary_sensor.upstairs_hallway_pir_sensor",
          "binary_sensor.front_door_sensor",
          "binary_sensor.back_door",
        ],
        immediate: [],
        log_size: 10,
        logs: [
          [1547622758.6694887, "HA", 4, null],
          [1547640268.7761662, "HA", 0, null],
          [1547709066.5300405, "HA", 4, null],
          [1547740592.7153869, "HA", 0, null],
          [1547741192.2297237, "HA", 4, null],
          [1547741215.1390853, "HA", 0, null],
          [1547794463.5533135, "HA", 4, null],
          [1547832780.5026634, "HA", 0, null],
          [1547984318.5977461, "HA", 4, null],
          [1547994826.273574, "HA", 0, null],
        ],
        mqtt: {
          command_topic: "home/alarm/set",
          enable_mqtt: false,
          override_code: false,
          payload_arm_away: "ARM_AWAY",
          payload_arm_home: "ARM_HOME",
          payload_arm_night: "ARM_NIGHT",
          payload_disarm: "DISARM",
          pending_on_warning: false,
          qos: 0,
          state_topic: "home/alarm",
        },
        panel: {
          camera_update_interval: "",
          cameras: ["camera.back_door", "camera.front_door", "camera.upstairs"],
          enable_camera_panel: "False",
          enable_clock: "True",
          enable_floorplan_panel: "False",
          enable_sensors_panel: "False",
          enable_serif_font: "False",
          enable_weather: "True",
          hide_passcode: "True",
          hide_sidebar: "True",
          panel_title: "",
          round_buttons: "True",
          shadow_effect: "False",
        },
        panel_locked: false,
        panic_mode: "deactivated",
        passcode_attempts: 3,
        passcode_attempts_timeout: 900,
        py_version: [3, 6, 6, "final", 0],
        states: {
          armed_away: {
            delayed: [
              "binary_sensor.yard_door",
              "binary_sensor.front_door_sensor",
              "binary_sensor.passage_pir_sensor",
            ],
            immediate: [
              "binary_sensor.upstairs_hallway_pir_sensor",
              "binary_sensor.balcony_door",
              "binary_sensor.back_door",
              "binary_sensor.bedroom_door",
              "binary_sensor.stefans_room_motion",
              "binary_sensor.dining_area_window_sensor_sensor",
              "binary_sensor.passage_pir_sensor",
            ],
            override: ["binary_sensor.window_bedroom"],
            pending_time: 25,
            trigger_time: 300,
            warning_time: 60,
          },
          armed_home: {
            delayed: [],
            immediate: [
              "binary_sensor.front_door_sensor",
              "binary_sensor.balcony_door",
              "binary_sensor.yard_door",
            ],
            override: [],
            pending_time: 10,
            trigger_time: 300,
            warning_time: 0,
          },
          armed_perimeter: {
            delayed: [],
            immediate: [
              "binary_sensor.back_door",
              "binary_sensor.balcony_door",
              "binary_sensor.front_door_sensor",
              "binary_sensor.yard_door",
              "binary_sensor.window_bedroom",
              "binary_sensor.dining_area_window_sensor_sensor",
            ],
            override: [],
            pending_time: 0,
            trigger_time: 600,
            warning_time: 0,
          },
        },
        supported_statuses_off: [
          "off",
          "false",
          "locked",
          "closed",
          "undetected",
          "no_motion",
          "standby",
        ],
        supported_statuses_on: [
          "on",
          "true",
          "unlocked",
          "open",
          "detected",
          "motion",
          "motion_detected",
          "motion detected",
        ],
        templates: {
          hs_color:
            "if (state === 'disarmed') return [0, 0]; else if (state === 'triggered') return [0, 85]; else return [40, 70];",
          icon_color:
            "if (state === 'disarmed') return [0, 0]; else if (state === 'triggered') return [0, 85]; else return [40, 70];",
        },
        updateUI: false,
        users: [
          {
            code: "****",
            disable_animations: false,
            enabled: false,
            id: "ded82243c49f41adbdb0ea11cca1b7b1",
            name: "Hass.io",
            picture: "/local/images/ha.png",
          },
          {
            code: "****",
            disable_animations: false,
            enabled: false,
            id: "abc561cfafcf410a86ca25a0d9460533",
            name: "Hass.io",
            picture: "/local/images/ha.png",
          },
          {
            code: "****",
            disable_animations: false,
            enabled: false,
            id: "24dad8f9c2d24d5b8bffaa06cbba55fc",
            name: "Isa",
            picture: "/local/images/ha.png",
          },
          {
            code: "****",
            disable_animations: false,
            enabled: false,
            id: "39426ba732604d71a5176c1e695710c9",
            name: "Stefan",
            picture: "/local/images/ha.png",
          },
          {
            code: "****",
            disable_animations: false,
            enabled: false,
            id: "52ff3b9ce9a14a9bb3c33212bcffe936",
            name: "homeassistant",
            picture: "/local/images/ha.png",
          },
          {
            code: "****",
            disable_animations: false,
            enabled: false,
            id: "439178e213a348fabf87f06da546fb1d",
            name: "dashboard",
            picture: "/local/images/ha.png",
          },
          {
            code: "****",
            disable_animations: false,
            enabled: false,
            id: "650d785326e04e8aba8f449f469c7d17",
            name: "Isabella",
            picture: "/local/images/ha.png",
          },
        ],
        hs_color: [0, 0],
        icon_color: [0, 0],
      },
    },
    "device_tracker.stefan_iphone_7": {
      entity_id: "device_tracker.stefan_iphone_7",
      state: "home",
      attributes: {
        source_type: "gps",
        gps_accuracy: 20,
        battery: 64,
        vertical_accuracy: 2.2522367885123806,
        timestamp: "2019-01-20T18:37:02.072+0100",
        altitude: 29.493962323560066,
        speed: -1,
        course: -1,
        trigger: "Background Fetch",
        friendly_name: "stefan iphone 7",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "device_tracker.stefan_iphone_7_wifi": {
      entity_id: "device_tracker.stefan_iphone_7_wifi",
      state: "home",
      attributes: {
        source_type: "router",
        gps_accuracy: 0,
        scanner: "NmapDeviceScanner",
        ip: "192.168.1.36",
        friendly_name: "Stefan iPhone wifi",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "device_tracker.isabellas_iphone_x": {
      entity_id: "device_tracker.isabellas_iphone_x",
      state: "home",
      attributes: {
        source_type: "gps",
        gps_accuracy: 65,
        battery: 83,
        speed: -1,
        course: -1,
        vertical_accuracy: 10,
        altitude: 28.99994659423828,
        timestamp: "2019-01-20T18:20:35.164+0100",
        trigger: "Background Fetch",
        friendly_name: "isabellas iphone x",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "device_tracker.isabellas_iphone_x_wifi": {
      entity_id: "device_tracker.isabellas_iphone_x_wifi",
      state: "home",
      attributes: {
        source_type: "router",
        gps_accuracy: 0,
        scanner: "NmapDeviceScanner",
        ip: "192.168.1.91",
        friendly_name: "Isabellas iPhone X Wifi",
        custom_ui_state_card: "state-card-custom-ui",
        icon: "mdi:cellphone-iphone",
      },
    },
    "proximity.home_isa": {
      entity_id: "proximity.home_isa",
      state: "0",
      attributes: {
        dir_of_travel: "stationary",
        nearest: "isabellas iphone x",
        unit_of_measurement: "km",
        friendly_name: "home_isa",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "proximity.home_stefan": {
      entity_id: "proximity.home_stefan",
      state: "0",
      attributes: {
        dir_of_travel: "stationary",
        nearest: "stefan iphone 7",
        unit_of_measurement: "km",
        friendly_name: "home_stefan",
        custom_ui_state_card: "state-card-custom-ui",
      },
    },
    "sensor.presence_isa": {
      entity_id: "sensor.presence_isa",
      state: "Home",
      attributes: {
        battery: 83,
        friendly_name: "Isa",
        source_type: "gps",
        speed: -1,
      },
    },
    "sensor.presence_stefan": {
      entity_id: "sensor.presence_stefan",
      state: "Home",
      attributes: {
        battery: 64,
        friendly_name: "Stefan",
        source_type: "gps",
        gps_accuracy: 20,
        speed: -1,
      },
    },
    "light.living_room_ceiling_light_level": {
      entity_id: "light.living_room_ceiling_light_level",
      state: "on",
      attributes: {
        brightness: 59,
        node_id: 9,
        value_index: 0,
        value_instance: 1,
        value_id: "72057594193739777",
        power_consumption: 2.7,
        friendly_name: "Living Room Light",
        supported_features: 33,
        custom_ui_state_card: "state-card-custom-ui",
        icon: "mdi:ceiling-light",
      },
    },
    "sensor.mailbox": {
      entity_id: "sensor.mailbox",
      state: "Empty",
      attributes: {
        icon: "mdi:dots-horizontal",
        latest_emptied: "Unknown",
        latest_mail: "Unknown",
      },
    },
    "light.upstairs_hallway_ceiling_light_level": {
      entity_id: "light.upstairs_hallway_ceiling_light_level",
      state: "on",
      attributes: {
        brightness: 49,
        node_id: 10,
        value_index: 0,
        value_instance: 1,
        value_id: "72057594210516993",
        power_consumption: 2.2,
        friendly_name: "Upstairs Hallway Light",
        supported_features: 33,
        supported_color_modes: ["brightness"],
        custom_ui_state_card: "state-card-custom-ui",
        icon: "mdi:ceiling-light",
      },
    },
    "light.dining_area_ceiling_light_level": {
      entity_id: "light.dining_area_ceiling_light_level",
      state: "off",
      attributes: {
        node_id: 11,
        value_index: 0,
        value_instance: 1,
        value_id: "72057594227294209",
        power_consumption: 0,
        friendly_name: "Dining Room Light",
        supported_features: 33,
        supported_color_modes: ["brightness"],
        custom_ui_state_card: "state-card-custom-ui",
        icon: "mdi:ceiling-light",
      },
    },
    "light.living_room_spotlights_level": {
      entity_id: "light.living_room_spotlights_level",
      state: "off",
      attributes: {
        node_id: 12,
        value_index: 0,
        value_instance: 1,
        value_id: "72057594244071425",
        power_consumption: 0,
        friendly_name: "Living room Spotlights",
        supported_features: 33,
        supported_color_modes: ["brightness"],
        custom_ui_state_card: "state-card-custom-ui",
        icon: "mdi:track-light",
      },
    },
    "light.passage_ceiling_spotlights_level": {
      entity_id: "light.passage_ceiling_spotlights_level",
      state: "on",
      attributes: {
        brightness: 49,
        node_id: 13,
        value_index: 0,
        value_instance: 1,
        value_id: "72057594260848641",
        power_consumption: 2.5,
        friendly_name: "Passage Lights",
        supported_features: 33,
        supported_color_modes: ["brightness"],
        custom_ui_state_card: "state-card-custom-ui",
        icon: "mdi:track-light",
      },
    },
    "sensor.passage_pir_luminance": {
      entity_id: "sensor.passage_pir_luminance",
      state: "3.0",
      attributes: {
        node_id: 18,
        value_index: 3,
        value_instance: 1,
        value_id: "72057594344914994",
        unit_of_measurement: "lux",
        friendly_name: "Passage Lux",
        custom_ui_state_card: "state-card-custom-ui",
        icon: "mdi:theme-light-dark",
      },
    },
    "sensor.upstairs_hallway_pir_luminance": {
      entity_id: "sensor.upstairs_hallway_pir_luminance",
      state: "3.0",
      attributes: {
        node_id: 22,
        value_index: 3,
        value_instance: 1,
        value_id: "72057594412023858",
        unit_of_measurement: "lux",
        friendly_name: "Upstairs Hallway Lux",
        custom_ui_state_card: "state-card-custom-ui",
        icon: "mdi:theme-light-dark",
      },
    },
    "light.kitchen_ceiling_spotlights_level": {
      entity_id: "light.kitchen_ceiling_spotlights_level",
      state: "on",
      attributes: {
        brightness: 255,
        node_id: 23,
        value_index: 0,
        value_instance: 1,
        value_id: "72057594428620801",
        power_consumption: 37.4,
        friendly_name: "Kitchen Lights",
        supported_features: 33,
        supported_color_modes: ["brightness"],
        custom_ui_state_card: "state-card-custom-ui",
        icon: "mdi:track-light",
      },
    },
  });
