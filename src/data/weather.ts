import { HomeAssistant, WeatherEntity } from "../types";

export const weatherImages = {
  "clear-night": "/static/images/weather/night.png",
  cloudy: "/static/images/weather/cloudy.png",
  fog: "/static/images/weather/cloudy.png",
  lightning: "/static/images/weather/lightning.png",
  "lightning-rainy": "/static/images/weather/lightning-rainy.png",
  partlycloudy: "/static/images/weather/partly-cloudy.png",
  pouring: "/static/images/weather/pouring.png",
  rainy: "/static/images/weather/rainy.png",
  hail: "/static/images/weather/rainy.png",
  snowy: "/static/images/weather/snowy.png",
  "snowy-rainy": "/static/images/weather/snowy.png",
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
    // eslint-disable-next-line no-bitwise
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

export const getSecondaryWeatherAttribute = (
  hass: HomeAssistant,
  stateObj: WeatherEntity
): string | undefined => {
  const extrema = getWeatherExtrema(hass, stateObj);

  if (extrema) {
    return extrema;
  }

  let value: number;
  let attribute: string;

  if (
    stateObj.attributes.forecast?.length &&
    stateObj.attributes.forecast[0].precipitation !== undefined &&
    stateObj.attributes.forecast[0].precipitation !== null
  ) {
    value = stateObj.attributes.forecast[0].precipitation!;
    attribute = "precipitation";
  } else if ("humidity" in stateObj.attributes) {
    value = stateObj.attributes.humidity!;
    attribute = "humidity";
  } else {
    return undefined;
  }

  return `
    ${hass!.localize(
      `ui.card.weather.attributes.${attribute}`
    )} ${value} ${getWeatherUnit(hass!, attribute)}
  `;
};

const getWeatherExtrema = (
  hass: HomeAssistant,
  stateObj: WeatherEntity
): string | undefined => {
  if (!stateObj.attributes.forecast?.length) {
    return undefined;
  }

  let tempLow: number | undefined;
  let tempHigh: number | undefined;
  const today = new Date().getDate();

  for (const forecast of stateObj.attributes.forecast!) {
    if (new Date(forecast.datetime).getDate() !== today) {
      break;
    }
    if (!tempHigh || forecast.temperature > tempHigh) {
      tempHigh = forecast.temperature;
    }
    if (!tempLow || (forecast.templow && forecast.templow < tempLow)) {
      tempLow = forecast.templow;
    }
    if (!forecast.templow && (!tempLow || forecast.temperature < tempLow)) {
      tempLow = forecast.temperature;
    }
  }

  if (!tempLow && !tempHigh) {
    return undefined;
  }

  const unit = getWeatherUnit(hass!, "temperature");

  return `
    ${
      tempHigh
        ? `
            ${tempHigh} ${unit}
          `
        : ""
    }
    ${tempLow && tempHigh ? " / " : ""}
    ${
      tempLow
        ? `
          ${tempLow} ${unit}
        `
        : ""
    }
  `;
};
