import { convertEntities } from "../../../../src/fake_data/entity";
import { DemoConfig } from "../types";

export const demoEntitiesJimpower: DemoConfig["entities"] = () =>
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
    "zone.powertec": {
      entity_id: "zone.powertec",
      state: "zoning",
      attributes: {
        hidden: true,
        radius: 50,
        friendly_name: "Powertec",
        icon: "mdi:briefcase",
      },
    },
    "zone.kindy": {
      entity_id: "zone.kindy",
      state: "zoning",
      attributes: {
        hidden: true,
        radius: 25,
        friendly_name: "Kindy",
        icon: "mdi:school",
      },
    },
    "zone.stocklands": {
      entity_id: "zone.stocklands",
      state: "zoning",
      attributes: {
        hidden: true,
        radius: 200,
        friendly_name: "Stocklands",
        icon: "mdi:cart",
      },
    },
    "zone.parlour": {
      entity_id: "zone.parlour",
      state: "zoning",
      attributes: {
        hidden: true,
        radius: 50,
        friendly_name: "Parlour",
        icon: "mdi:coffee",
      },
    },
    "zone.work_home_beacon_25mins": {
      entity_id: "zone.work_home_beacon_25mins",
      state: "zoning",
      attributes: {
        hidden: true,
        radius: 50,
        friendly_name: "Work Home Beacon 25mins",
        icon: "mdi:car",
      },
    },
    "zone.work_home_beacon_15mins": {
      entity_id: "zone.work_home_beacon_15mins",
      state: "zoning",
      attributes: {
        hidden: true,
        radius: 50,
        friendly_name: "Work Home Beacon 15mins",
        icon: "mdi:car",
      },
    },
    "zone.work_home_beacon_5mins": {
      entity_id: "zone.work_home_beacon_5mins",
      state: "zoning",
      attributes: {
        hidden: true,
        radius: 50,
        friendly_name: "Work Home Beacon 5mins",
        icon: "mdi:car",
      },
    },
    "zone.darwin": {
      entity_id: "zone.darwin",
      state: "zoning",
      attributes: {
        hidden: true,
        radius: 50000,
        friendly_name: "Darwin",
        icon: "mdi:airplane",
      },
    },
    "zone.brisbane": {
      entity_id: "zone.brisbane",
      state: "zoning",
      attributes: {
        hidden: true,
        radius: 50000,
        friendly_name: "Brisbane",
        icon: "mdi:car",
      },
    },
    "zone.sydney": {
      entity_id: "zone.sydney",
      state: "zoning",
      attributes: {
        hidden: true,
        radius: 50000,
        friendly_name: "Sydney",
        icon: "mdi:airplane",
      },
    },
    "zone.melbourne": {
      entity_id: "zone.melbourne",
      state: "zoning",
      attributes: {
        hidden: true,
        radius: 50000,
        friendly_name: "Melbourne",
        icon: "mdi:airplane",
      },
    },
    "zone.perth": {
      entity_id: "zone.perth",
      state: "zoning",
      attributes: {
        hidden: true,
        radius: 50000,
        friendly_name: "Perth",
        icon: "mdi:airplane",
      },
    },
    "zone.adelaide": {
      entity_id: "zone.adelaide",
      state: "zoning",
      attributes: {
        hidden: true,
        radius: 50000,
        friendly_name: "Adelaide",
        icon: "mdi:airplane",
      },
    },
    "zone.tasmania": {
      entity_id: "zone.tasmania",
      state: "zoning",
      attributes: {
        hidden: true,
        radius: 50000,
        friendly_name: "Tasmania",
        icon: "mdi:airplane",
      },
    },
    "zone.uk": {
      entity_id: "zone.uk",
      state: "zoning",
      attributes: {
        hidden: true,
        radius: 100000,
        friendly_name: "UK",
        icon: "mdi:earth",
      },
    },
    "zone.france": {
      entity_id: "zone.france",
      state: "zoning",
      attributes: {
        hidden: true,
        radius: 100000,
        friendly_name: "France",
        icon: "mdi:earth",
      },
    },
    "zone.netherlands": {
      entity_id: "zone.netherlands",
      state: "zoning",
      attributes: {
        hidden: true,
        radius: 100000,
        friendly_name: "Netherlands",
        icon: "mdi:earth",
      },
    },
    "zone.switzerland": {
      entity_id: "zone.switzerland",
      state: "zoning",
      attributes: {
        hidden: true,
        radius: 100000,
        friendly_name: "Switzerland",
        icon: "mdi:earth",
      },
    },
    "zone.italy": {
      entity_id: "zone.italy",
      state: "zoning",
      attributes: {
        hidden: true,
        radius: 100000,
        friendly_name: "Italy",
        icon: "mdi:earth",
      },
    },
    "zone.home": {
      entity_id: "zone.home",
      state: "zoning",
      attributes: {
        hidden: true,
        radius: 100,
        friendly_name: "Kingia Castle",
        icon: "mdi:home",
      },
    },
    "sensor.lower_temperature": {
      entity_id: "sensor.lower_temperature",
      state: "26.4",
      attributes: {
        count_sensors: 2,
        max_value: 27.2,
        mean: 26.4,
        min_value: 25.6,
        last: 27.2,
        unit_of_measurement: "\u00b0C",
        friendly_name: "Downstairs Temperature",
        icon: "mdi:sofa",
      },
    },
    "sensor.upstairs_temperature": {
      entity_id: "sensor.upstairs_temperature",
      state: "28.5",
      attributes: {
        count_sensors: 4,
        max_value: 29.5,
        mean: 28.5,
        min_value: 27.7,
        last: 27.7,
        unit_of_measurement: "\u00b0C",
        friendly_name: "Upstairs Temperature",
        icon: "mdi:hotel",
      },
    },
    "sensor.next_bus": {
      entity_id: "sensor.next_bus",
      state: "16",
      attributes: {
        unit_of_measurement: "min",
        friendly_name: "Time to Next Bus",
        icon: "mdi:bus-clock",
      },
    },
    "sensor.battery_tina": {
      entity_id: "sensor.battery_tina",
      state: "11",
      attributes: {
        unit_of_measurement: "%",
        friendly_name: "Battery Tina",
        icon: "mdi:battery-charging",
        device_class: "battery",
      },
    },
    "sensor.battery_james": {
      entity_id: "sensor.battery_james",
      state: "100",
      attributes: {
        unit_of_measurement: "%",
        friendly_name: "Battery James",
        icon: "",
        device_class: "battery",
      },
    },
    "sensor.james": {
      entity_id: "sensor.james",
      state: "Home",
      attributes: {
        friendly_name: "James",
        icon: "mdi:walk",
        entity_picture: "/local/james.jpg",
      },
    },
    "sensor.tina": {
      entity_id: "sensor.tina",
      state: "Home",
      attributes: {
        friendly_name: "Tina",
        icon: "mdi:walk",
        entity_picture: "/local/tina.jpg",
      },
    },
    "sensor.aqi": {
      entity_id: "sensor.aqi",
      state: "20",
      attributes: { friendly_name: "Air Quality Index" },
    },
    "sensor.bom_temp": {
      entity_id: "sensor.bom_temp",
      state: "21.9",
      attributes: {
        unit_of_measurement: "\u00b0C",
        friendly_name: "Gold Coast Temperature",
        device_class: "temperature",
      },
    },
    "sensor.forks": {
      entity_id: "sensor.forks",
      state: "32",
      attributes: { friendly_name: "forks" },
    },
    "sensor.stars_last_week": {
      entity_id: "sensor.stars_last_week",
      state: "0",
      attributes: { friendly_name: "Last Week" },
    },
    "sensor.issues": {
      entity_id: "sensor.issues",
      state: "26",
      attributes: { friendly_name: "issues" },
    },
    "sensor.stars": {
      entity_id: "sensor.stars",
      state: "282",
      attributes: { friendly_name: "stars" },
    },
    "sensor.stars_this_month": {
      entity_id: "sensor.stars_this_month",
      state: "12",
      attributes: { friendly_name: "This Month" },
    },
    "sensor.stars_last_month": {
      entity_id: "sensor.stars_last_month",
      state: "0",
      attributes: { friendly_name: "Last Month" },
    },
    "sensor.git_stars_next_dif": {
      entity_id: "sensor.git_stars_next_dif",
      state: "45",
      attributes: { friendly_name: "Next Target" },
    },
    "sensor.git_stars_last_dif": {
      entity_id: "sensor.git_stars_last_dif",
      state: "31",
      attributes: { friendly_name: "Next Target" },
    },
    "sensor.subscribers": {
      entity_id: "sensor.subscribers",
      state: "32",
      attributes: { friendly_name: "subscribers" },
    },
    "sensor.stars_this_week": {
      entity_id: "sensor.stars_this_week",
      state: "12",
      attributes: { friendly_name: "This Week" },
    },
    "sensor.git_stars_trend_dif": {
      entity_id: "sensor.git_stars_trend_dif",
      state: "1486",
      attributes: { friendly_name: "Trending Target" },
    },
    "binary_sensor.james_bag_status": {
      entity_id: "binary_sensor.james_bag_status",
      state: "off",
      attributes: {
        friendly_name: "James Bag",
        icon: "mdi:briefcase",
        device_class: "connectivity",
      },
    },
    "binary_sensor.tina_gps_status": {
      entity_id: "binary_sensor.tina_gps_status",
      state: "on",
      attributes: {
        friendly_name: "Tina GPS",
        icon: "mdi:crosshairs-gps",
        device_class: "connectivity",
      },
    },
    "binary_sensor.tina_ble_status": {
      entity_id: "binary_sensor.tina_ble_status",
      state: "on",
      attributes: {
        friendly_name: "Tina BLE",
        icon: "mdi:bluetooth-audio",
        device_class: "connectivity",
      },
    },
    "binary_sensor.james_car_status": {
      entity_id: "binary_sensor.james_car_status",
      state: "off",
      attributes: {
        friendly_name: "James Car",
        icon: "mdi:car-side",
        device_class: "connectivity",
      },
    },
    "binary_sensor.james_ble_status": {
      entity_id: "binary_sensor.james_ble_status",
      state: "off",
      attributes: {
        friendly_name: "James BLE",
        icon: "mdi:bluetooth-audio",
        device_class: "connectivity",
      },
    },
    "binary_sensor.tina_keys_status": {
      entity_id: "binary_sensor.tina_keys_status",
      state: "on",
      attributes: {
        friendly_name: "Tina Keys",
        icon: "mdi:key",
        device_class: "connectivity",
      },
    },
    "binary_sensor.james_keys_status": {
      entity_id: "binary_sensor.james_keys_status",
      state: "off",
      attributes: {
        friendly_name: "James Keys",
        icon: "mdi:key",
        device_class: "connectivity",
      },
    },
    "binary_sensor.james_gps_status": {
      entity_id: "binary_sensor.james_gps_status",
      state: "on",
      attributes: {
        friendly_name: "James GPS",
        icon: "mdi:crosshairs-gps",
        device_class: "connectivity",
      },
    },
    "binary_sensor.garage": {
      entity_id: "binary_sensor.garage",
      state: "off",
      attributes: {
        friendly_name: "Garage",
        icon: "mdi:garage",
        device_class: "door",
      },
    },
    "binary_sensor.recycle": {
      entity_id: "binary_sensor.recycle",
      state: "off",
      attributes: { friendly_name: "Recycle", icon: "mdi:recycle" },
    },
    "binary_sensor.trash": {
      entity_id: "binary_sensor.trash",
      state: "off",
      attributes: { friendly_name: "Trash", icon: "mdi:delete" },
    },
    "binary_sensor.alarm": {
      entity_id: "binary_sensor.alarm",
      state: "off",
      attributes: { friendly_name: "Alarm", icon: "mdi:security-home" },
    },
    "binary_sensor.windows": {
      entity_id: "binary_sensor.windows",
      state: "on",
      attributes: {
        friendly_name: "Windows",
        icon: "mdi:window-open",
        device_class: "window",
      },
    },
    "binary_sensor.doors": {
      entity_id: "binary_sensor.doors",
      state: "off",
      attributes: {
        friendly_name: "Doors",
        icon: "mdi:door-closed",
        device_class: "door",
      },
    },
    "binary_sensor.lights": {
      entity_id: "binary_sensor.lights",
      state: "on",
      attributes: {
        friendly_name: "Lights",
        icon: "mdi:lightbulb",
        device_class: "light",
      },
    },
    "alarm_control_panel.ha_alarm": {
      entity_id: "alarm_control_panel.ha_alarm",
      state: "disarmed",
      attributes: {
        code_format: null,
        changed_by: null,
        friendly_name: "HA Alarm",
        icon: "mdi:security-home",
      },
    },
    "binary_sensor.door_window_sensor_158d0001e73c09": {
      entity_id: "binary_sensor.door_window_sensor_158d0001e73c09",
      state: "off",
      attributes: {
        "Open since": 0,
        battery_level: 49,
        friendly_name: "Back Door Sensor",
        device_class: "door",
      },
    },
    "binary_sensor.door_window_sensor_158d0001e73af4": {
      entity_id: "binary_sensor.door_window_sensor_158d0001e73af4",
      state: "off",
      attributes: {
        "Open since": 0,
        battery_level: 49,
        friendly_name: "Kitchen Window",
        device_class: "window",
      },
    },
    "binary_sensor.motion_sensor_158d00022c2f21": {
      entity_id: "binary_sensor.motion_sensor_158d00022c2f21",
      state: "off",
      attributes: {
        "No motion since": "120",
        battery_level: 53,
        friendly_name: "Staircase Motion Sensor",
        device_class: "motion",
      },
    },
    "binary_sensor.door_window_sensor_158d0001e73a73": {
      entity_id: "binary_sensor.door_window_sensor_158d0001e73a73",
      state: "off",
      attributes: {
        "Open since": 0,
        battery_level: 49,
        friendly_name: "Jackson Window",
        device_class: "window",
      },
    },
    "binary_sensor.motion_sensor_158d000201351c": {
      entity_id: "binary_sensor.motion_sensor_158d000201351c",
      state: "off",
      attributes: {
        "No motion since": "180",
        battery_level: 53,
        friendly_name: "Jackson Room Motion Sensor",
        device_class: "motion",
      },
    },
    "binary_sensor.door_window_sensor_158d0001e73aad": {
      entity_id: "binary_sensor.door_window_sensor_158d0001e73aad",
      state: "off",
      attributes: {
        "Open since": 0,
        battery_level: 57,
        friendly_name: "Hudson Window",
        device_class: "window",
      },
    },
    "binary_sensor.motion_sensor_158d0002006d46": {
      entity_id: "binary_sensor.motion_sensor_158d0002006d46",
      state: "off",
      attributes: {
        "No motion since": "120",
        battery_level: 45,
        friendly_name: "Hudson Room Motion Sensor",
        device_class: "motion",
      },
    },
    "binary_sensor.door_window_sensor_158d0001e74875": {
      entity_id: "binary_sensor.door_window_sensor_158d0001e74875",
      state: "on",
      attributes: {
        "Open since": "300",
        battery_level: 47,
        friendly_name: "Bathroom Window",
        device_class: "window",
      },
    },
    "binary_sensor.motion_sensor_158d000200e4ab": {
      entity_id: "binary_sensor.motion_sensor_158d000200e4ab",
      state: "off",
      attributes: {
        "No motion since": "1800",
        battery_level: 45,
        friendly_name: "Bathroom Motion Sensor",
        device_class: "motion",
      },
    },
    "binary_sensor.motion_sensor_158d0001e5d118": {
      entity_id: "binary_sensor.motion_sensor_158d0001e5d118",
      state: "off",
      attributes: {
        "No motion since": "120",
        battery_level: 49,
        friendly_name: "Living Motion Sensor",
        device_class: "motion",
      },
    },
    "binary_sensor.motion_sensor_158d0001e63803": {
      entity_id: "binary_sensor.motion_sensor_158d0001e63803",
      state: "off",
      attributes: {
        "No motion since": "120",
        battery_level: 49,
        friendly_name: "Bedroom Motion Densor",
        device_class: "motion",
      },
    },
    "binary_sensor.door_window_sensor_158d0001f36741": {
      entity_id: "binary_sensor.door_window_sensor_158d0001f36741",
      state: "on",
      attributes: {
        "Open since": "300",
        battery_level: 45,
        friendly_name: "Bedroom Window",
        device_class: "window",
      },
    },
    "binary_sensor.motion_sensor_158d000200ea5b": {
      entity_id: "binary_sensor.motion_sensor_158d000200ea5b",
      state: "off",
      attributes: {
        "No motion since": "1200",
        battery_level: 49,
        friendly_name: "Patio Motion Sensor",
        device_class: "motion",
      },
    },
    "binary_sensor.water_leak_sensor_158d00026e26dc": {
      entity_id: "binary_sensor.water_leak_sensor_158d00026e26dc",
      state: "off",
      attributes: {
        battery_level: 47,
        friendly_name: "Kitchen Leak Sensor",
        device_class: "moisture",
      },
    },
    "binary_sensor.door_window_sensor_158d000225432d": {
      entity_id: "binary_sensor.door_window_sensor_158d000225432d",
      state: "off",
      attributes: {
        "Open since": 0,
        battery_level: 47,
        friendly_name: "Patio Door Sensor",
        device_class: "door",
      },
    },
    "binary_sensor.door_window_sensor_158d00022016b2": {
      entity_id: "binary_sensor.door_window_sensor_158d00022016b2",
      state: "off",
      attributes: {
        "Open since": 0,
        battery_level: 43,
        friendly_name: "Front Door Sensor",
        device_class: "door",
      },
    },
    "binary_sensor.motion_sensor_158d0001e5d147": {
      entity_id: "binary_sensor.motion_sensor_158d0001e5d147",
      state: "off",
      attributes: {
        "No motion since": "1800",
        battery_level: 51,
        friendly_name: "Entrance Motion Sensor",
        device_class: "motion",
      },
    },
    "binary_sensor.smoke_sensor_158d0001b8ddc7": {
      entity_id: "binary_sensor.smoke_sensor_158d0001b8ddc7",
      state: "off",
      attributes: {
        density: 0,
        battery_level: 59,
        friendly_name: "Downstairs Smoke Detector",
        device_class: "smoke",
      },
    },
    "binary_sensor.smoke_sensor_158d0001b8deba": {
      entity_id: "binary_sensor.smoke_sensor_158d0001b8deba",
      state: "off",
      attributes: {
        density: 0,
        battery_level: 65,
        friendly_name: "Upstairs Smoke Detector",
        device_class: "smoke",
      },
    },
    "binary_sensor.motion_sensor_158d0001e5cf11": {
      entity_id: "binary_sensor.motion_sensor_158d0001e5cf11",
      state: "off",
      attributes: {
        "No motion since": "300",
        battery_level: 47,
        friendly_name: "Playroom Motion Sensor",
        device_class: "motion",
      },
    },
    "binary_sensor.water_leak_sensor_158d0002338651": {
      entity_id: "binary_sensor.water_leak_sensor_158d0002338651",
      state: "off",
      attributes: {
        battery_level: 47,
        friendly_name: "Bathroom Leak Sensor",
        device_class: "moisture",
      },
    },
    "sensor.us_air_pollution_level_2": {
      entity_id: "sensor.us_air_pollution_level_2",
      state: "Good",
      attributes: {
        attribution: "Data provided by AirVisual",
        lati: -27.96724,
        long: 153.39796,
        friendly_name: "U.S. Air Pollution Level",
        icon: "mdi:emoticon-excited",
      },
    },
    "sensor.us_main_pollutant_2": {
      entity_id: "sensor.us_main_pollutant_2",
      state: "PM2.5",
      attributes: {
        attribution: "Data provided by AirVisual",
        pollutant_symbol: "p2",
        pollutant_unit: "\u00b5g/m3",
        lati: -27.96724,
        long: 153.39796,
        friendly_name: "U.S. Main Pollutant",
        icon: "mdi:chemical-weapon",
      },
    },
  });
