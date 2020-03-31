import { HomeAssistant } from "../types";

export const weatherImages = {
  "clear-night": "/static/images/weather/night.png",
  cloudy: "/static/images/weather/cloudy.png",
  fog: "/static/images/weather/cloudy.png",
  hail: "/static/images/weather/rainy.png",
  lightning: "/static/images/weather/lightning.png",
  "lightning-rainy": "/static/images/weather/lightning-rainy.png",
  partlycloudy: "/static/images/weather/partly-cloudy.png",
  pouring: "/static/images/weather/pouring.png",
  rainy: "/static/images/weather/rainy.png",
  snowy: "/static/images/weather/snowy.png",
  "snowy-rainy": "/static/images/weather/rainy.png",
  sunny: "/static/images/weather/sunny.png",
  windy: "/static/images/weather/windy.png",
  "windy-variant": "/static/images/weather/windy.png",
};

export const weatherIcons = {
  exceptional: "hass:alert-circle-outline",
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
