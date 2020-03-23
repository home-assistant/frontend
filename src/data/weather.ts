import { HomeAssistant } from "../types";

export const weatherIcons = {
  "clear-night": "/static/images/weather/night.png",
  cloudy: "hass:weather-cloudy",
  exceptional: "hass:alert-circle-outline",
  fog: "hass:weather-fog",
  hail: "hass:weather-hail",
  lightning: "hass:weather-lightning",
  "lightning-rainy": "hass:weather-lightning-rainy",
  partlycloudy: "hass:weather-partly-cloudy",
  pouring: "hass:weather-pouring",
  rainy: "hass:weather-rainy",
  snowy: "hass:weather-snowy",
  "snowy-rainy": "hass:weather-snowy-rainy",
  sunny: "hass:weather-sunny",
  windy: "hass:weather-windy",
  "windy-variant": "hass:weather-windy-variant",
};

export const cardinalDirections = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
  "N",
];

const getWindBearingText = (degree: string): string => {
  const degreenum = parseInt(degree, 10);
  if (isFinite(degreenum)) {
    // tslint:disable-next-line: no-bitwise
    return cardinalDirections[(((degreenum + 11.25) / 22.5) | 0) % 16];
  }
  return degree;
};

export const getWindBearing = (bearing: string): string => {
  if (bearing != null) {
    return getWindBearingText(bearing);
  }
  return "";
};

export const getWeatherUnit = (
  hass: HomeAssistant,
  measure: string
): string => {
  const lengthUnit = hass.config.unit_system.length || "";
  switch (measure) {
    case "pressure":
      return lengthUnit === "km" ? "hPa" : "inHg";
    case "wind_speed":
      return `${lengthUnit}/h`;
    case "length":
      return lengthUnit;
    case "precipitation":
      return lengthUnit === "km" ? "mm" : "in";
    case "humidity":
    case "precipitation_probability":
      return "%";
    default:
      return hass.config.unit_system[measure] || "";
  }
};
