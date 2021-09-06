import {
  LovelaceCardConfig,
  LovelaceConfig,
} from "../../../../src/data/lovelace";
import { castContext } from "../cast_context";

export const castDemoLovelace: () => LovelaceConfig = () => {
  const touchSupported =
    castContext.getDeviceCapabilities().touch_input_supported;
  return {
    views: [
      {
        path: "overview",
        cards: [
          {
            type: "markdown",
            title: "Home Assistant Cast",
            content: `With Home Assistant you can easily create interfaces (just like this one) which can be shown on Chromecast devices connected to TVs or Google Assistant devices with a screen.${
              touchSupported
                ? "\n\nYou are able to interact with this demo using the touch screen."
                : "\n\nOn a Google Nest Hub you are able to interact with Home Assistant Cast via the touch screen."
            }`,
          },
          {
            type: touchSupported ? "entities" : "glance",
            title: "Living Room",
            entities: [
              "light.reading_light",
              "light.ceiling",
              "light.standing_lamp",
              "input_number.harmonyvolume",
            ],
          },
          {
            cards: [
              {
                graph: "line",
                type: "sensor",
                entity: "sensor.temperature_inside",
              },
              {
                graph: "line",
                type: "sensor",
                entity: "sensor.temperature_outside",
              },
            ],
            type: "horizontal-stack",
          },
          {
            type: "map",
            entities: ["person.arsaboo", "person.melody", "zone.home"],
            aspect_ratio: touchSupported ? "16:9.3" : "16:11",
          },
          touchSupported && {
            type: "entities",
            entities: [
              {
                type: "weblink",
                url: "/lovelace/climate",
                name: "Climate controls",
                icon: "hass:arrow-right",
              },
            ],
          },
        ].filter(Boolean) as LovelaceCardConfig[],
      },
      {
        path: "climate",
        cards: [
          {
            type: "thermostat",
            entity: "climate.downstairs",
          },
          {
            type: "entities",
            entities: [
              {
                type: "weblink",
                url: "/lovelace/overview",
                name: "Back",
                icon: "hass:arrow-left",
              },
            ],
          },
          {
            type: "thermostat",
            entity: "climate.upstairs",
          },
        ],
      },
    ],
  };
};
