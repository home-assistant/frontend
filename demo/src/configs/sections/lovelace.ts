import { isFrontpageEmbed } from "../../util/is_frontpage";
import { DemoConfig } from "../types";

export const demoLovelaceSections: DemoConfig["lovelace"] = (localize) => ({
  title: "Home Assistant Demo",
  views: [
    {
      type: "sections",
      title: isFrontpageEmbed ? "Home Assistant" : "Demo",
      path: "home",
      icon: "mdi:home-assistant",
      badges: [
        {
          type: "entity",
          entity: "sensor.outdoor_temperature",
          color: "red",
        },
        {
          type: "entity",
          entity: "sensor.outdoor_humidity",
          color: "indigo",
        },
        {
          type: "entity",
          entity: "device_tracker.car",
        },
      ],
      sections: [
        ...(isFrontpageEmbed
          ? []
          : [
              {
                cards: [
                  {
                    type: "heading",
                    heading: `${localize("ui.panel.page-demo.config.sections.titles.welcome")} 👋`,
                  },
                  { type: "custom:ha-demo-card" },
                ],
              },
            ]),
        {
          cards: [
            {
              type: "heading",
              heading: localize(
                "ui.panel.page-demo.config.sections.titles.living_room"
              ),
              icon: "mdi:sofa",
              badges: [
                {
                  type: "entity",
                  entity: "sensor.living_room_temperature",
                  color: "red",
                },
                {
                  type: "entity",
                  entity: "sensor.living_room_humidity",
                  color: "indigo",
                },
              ],
            },
            {
              type: "tile",
              entity: "light.floor_lamp",
            },
            {
              type: "tile",
              entity: "light.living_room_spotlights",
              name: "Spotlights",
              features: [
                {
                  type: "light-brightness",
                },
              ],
            },
            {
              type: "tile",
              entity: "light.bar_lamp",
            },
            {
              type: "tile",
              entity: "cover.living_room_garden_shutter",
              name: "Blinds",
            },
            {
              type: "tile",
              entity: "media_player.living_room_nest_mini",
            },
          ],
        },
        {
          type: "grid",
          cards: [
            {
              type: "heading",
              heading: localize(
                "ui.panel.page-demo.config.sections.titles.kitchen"
              ),
              icon: "mdi:fridge",
              badges: [
                {
                  type: "entity",
                  entity: "binary_sensor.kitchen_motion",
                  show_state: false,
                  color: "blue",
                },
              ],
            },
            {
              type: "tile",
              entity: "cover.kitchen_shutter",
              name: "Shutter",
            },
            {
              type: "tile",
              entity: "light.kitchen_spotlights",
              name: "Spotlights",
              features: [
                {
                  type: "light-brightness",
                },
              ],
            },
            {
              type: "tile",
              entity: "light.worktop_spotlights",
              name: "Worktop",
            },
            {
              type: "tile",
              entity: "binary_sensor.fridge_door",
              name: "Fridge",
            },
            {
              type: "tile",
              entity: "media_player.kitchen_nest_audio",
            },
          ],
        },
        {
          type: "grid",
          cards: [
            {
              type: "heading",
              heading: localize(
                "ui.panel.page-demo.config.sections.titles.energy"
              ),
              icon: "mdi:transmission-tower",
            },
            {
              type: "tile",
              entity: "binary_sensor.tesla_wall_connector_vehicle_connected",
              name: "EV",
              icon: "mdi:car",
            },
            {
              type: "tile",
              entity: "sensor.tesla_wall_connector_session_energy",
              name: "Last charge",
              color: "green",
            },
            {
              type: "tile",
              entity: "sensor.electric_meter_power",
              color: "deep-orange",
              name: "Home power",
            },
            {
              type: "tile",
              entity: "sensor.eletric_meter_voltage",
              name: "Voltage",
              color: "deep-orange",
            },
            {
              type: "tile",
              entity: "sensor.electricity_maps_grid_fossil_fuel_percentage",
              name: "Fossil fuel",
              color: "brown",
            },
            {
              type: "tile",
              entity: "sensor.electricity_maps_co2_intensity",
              name: "CO2 Intensity",
              color: "dark-grey",
            },
          ],
        },
        {
          type: "grid",
          cards: [
            {
              type: "heading",
              heading: localize(
                "ui.panel.page-demo.config.sections.titles.climate"
              ),
              icon: "mdi:thermometer",
            },
            {
              type: "tile",
              entity: "sun.sun",
            },
            {
              type: "tile",
              entity: "sensor.rain",
              color: "blue",
            },
            {
              features: [
                {
                  type: "target-temperature",
                },
              ],
              type: "tile",
              name: "Downstairs",
              entity: "climate.ground_floor",
              state_content: ["preset_mode", "current_temperature"],
            },
            {
              features: [
                {
                  type: "target-temperature",
                },
              ],
              type: "tile",
              name: "Upstairs",
              entity: "climate.first_floor",
              state_content: ["preset_mode", "current_temperature"],
            },
          ],
        },
        {
          type: "grid",
          cards: [
            {
              type: "heading",
              heading: localize(
                "ui.panel.page-demo.config.sections.titles.study"
              ),
              icon: "mdi:desk-lamp",
              badges: [
                {
                  type: "entity",
                  entity: "switch.in_meeting",
                  state: "on",
                  state_content: "name",
                  visibility: [
                    {
                      condition: "state",
                      state: "on",
                      entity: "switch.in_meeting",
                    },
                  ],
                },
              ],
            },
            {
              type: "tile",
              entity: "cover.study_shutter",
              name: "Shutter",
            },

            {
              type: "tile",
              entity: "light.study_spotlights",
              name: "Spotlights",
            },
            {
              type: "tile",
              entity: "media_player.study_nest_hub",
            },
            {
              type: "tile",
              entity: "sensor.standing_desk_height",
              name: "Desk",
              color: "brown",
              icon: "mdi:desk",
            },
            {
              type: "tile",
              entity: "switch.in_meeting",
              name: "Meeting mode",
            },
          ],
        },
        {
          type: "grid",
          cards: [
            {
              type: "heading",
              heading: localize(
                "ui.panel.page-demo.config.sections.titles.outdoor"
              ),
              icon: "mdi:tree",
            },
            {
              type: "tile",
              entity: "light.outdoor_light",
              name: "Door light",
            },
            {
              type: "tile",
              entity: "light.flood_light",
            },
            {
              graph: "line",
              type: "sensor",
              entity: "sensor.outdoor_motion_sensor_temperature",
              detail: 1,
              name: "Temperature",
            },
            {
              type: "tile",
              entity: "binary_sensor.outdoor_motion_sensor_motion",
              name: "Motion",
              color: "blue",
            },
            {
              type: "tile",
              entity: "sensor.outdoor_motion_sensor_illuminance",
              color: "amber",
              name: "Illuminance",
            },
          ],
        },
        {
          type: "grid",
          cards: [
            {
              type: "heading",
              heading: localize(
                "ui.panel.page-demo.config.sections.titles.updates"
              ),
              icon: "mdi:update",
            },
            {
              type: "tile",
              entity: "automation.home_assistant_auto_update",
              name: "Auto-update",
              color: "green",
            },
            {
              type: "tile",
              entity: "update.home_assistant_operating_system_update",
              name: "OS",
              icon: "mdi:home-assistant",
            },
            {
              type: "tile",
              entity: "update.home_assistant_supervisor_update",
              icon: "mdi:home-assistant",
              name: "Supervisor",
            },
            {
              type: "tile",
              entity: "update.home_assistant_core_update",
              name: "Core",
              icon: "mdi:home-assistant",
            },
          ],
        },
      ],
    },
  ],
});
