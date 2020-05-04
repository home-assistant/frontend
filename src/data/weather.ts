import { HomeAssistant, WeatherEntity } from "../types";
import { SVGTemplateResult, svg, html, TemplateResult } from "lit-element";
import { styleMap } from "lit-html/directives/style-map";

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

const cloudyStates = [
  "partlycloudy",
  "cloudy",
  "fog",
  "windy",
  "windy-variant",
  "hail",
  "rainy",
  "snowy",
  "snowy-rainy",
  "pouring",
  "lightning",
  "lightning-rainy",
];

const rainStates = ["hail", "rainy", "pouring"];

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

const getWeatherStateSVG = (state: string): SVGTemplateResult => {
  // rain is 4 in the y view box tall
  return svg`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 17 17"
  >
  ${
    state === "partlycloudy"
      ? svg`
    <path
      fill="var(--weather-icon-sun-color, #fdd93c)"
      d="m14.981 4.2112c0 1.9244-1.56 3.4844-3.484 3.4844-1.9244 0-3.4844-1.56-3.4844-3.4844s1.56-3.484 3.4844-3.484c1.924 0 3.484 1.5596 3.484 3.484"
    />`
      : ""
  }
  ${
    cloudyStates.includes(state)
      ? svg`
    <path
      fill="var(--weather-icon-cloud-back-color, #d4d4d4)"
      d="m3.8863 5.035c-0.54892 0.16898-1.04 0.46637-1.4372 0.8636-0.63077 0.63041-1.0206 1.4933-1.0206 2.455 0 1.9251 1.5589 3.4682 3.4837 3.4682h6.9688c1.9251 0 3.484-1.5981 3.484-3.5232 0-1.9251-1.5589-3.5232-3.484-3.5232h-1.0834c-0.25294-1.6916-1.6986-2.9083-3.4463-2.9083-1.7995 0-3.2805 1.4153-3.465 3.1679"
    />
    <path
      fill="var(--weather-icon-cloud-front-color, #f9f9f9)"
      d="m4.1996 7.6995c-0.33902 0.10407-0.64276 0.28787-0.88794 0.5334-0.39017 0.38982-0.63147 0.92322-0.63147 1.5176 0 1.1896 0.96414 2.1431 2.1537 2.1431h4.3071c1.1896 0 2.153-0.98742 2.153-2.1777 0-1.1896-0.96344-2.1777-2.153-2.1777h-0.66992c-0.15593-1.0449-1.0499-1.7974-2.1297-1.7974-1.112 0-2.0274 0.87524-2.1417 1.9586"
    />`
      : ""
  }
  ${
    rainStates.includes(state)
      ? svg`
    <path
      fill="var(--weather-icon-rain-color, #30b3ff)"
      d="m5.2852 14.734c-0.22401 0.24765-0.57115 0.2988-0.77505 0.11395-0.20391-0.1845-0.18732-0.53481 0.036689-0.78281 0.14817-0.16298 0.59126-0.32914 0.87559-0.42369 0.12453-0.04092 0.22684 0.05186 0.19791 0.17956-0.065617 0.2921-0.18732 0.74965-0.33514 0.91299"
    />
    <path
      fill="var(--weather-icon-rain-color, #30b3ff)"
      d="m11.257 14.163c-0.22437 0.24765-0.57115 0.2988-0.77505 0.11395-0.2039-0.1845-0.18768-0.53481 0.03669-0.78281 0.14817-0.16298 0.59126-0.32914 0.8756-0.42369 0.12453-0.04092 0.22684 0.05186 0.19791 0.17956-0.06562 0.2921-0.18732 0.74965-0.33514 0.91299"
    />
    <path
      fill="var(--weather-icon-rain-color, #30b3ff)"
      d="m8.432 15.878c-0.15452 0.17039-0.3937 0.20567-0.53446 0.07867-0.14041-0.12735-0.12876-0.36865 0.025753-0.53975 0.10195-0.11218 0.40711-0.22684 0.60325-0.29175 0.085725-0.02858 0.15628 0.03563 0.13652 0.12382-0.045508 0.20108-0.12912 0.51647-0.23107 0.629"
    />
    <path
      fill="var(--weather-icon-rain-color, #30b3ff)"
      d="m7.9991 14.118c-0.19226 0.21237-0.49001 0.25612-0.66499 0.09737-0.17462-0.15804-0.16051-0.45861 0.03175-0.67098 0.12665-0.14005 0.50729-0.28293 0.75071-0.36336 0.10689-0.03563 0.19473 0.0441 0.17004 0.15346-0.056092 0.25082-0.16051 0.64347-0.28751 0.78352"
    />`
      : ""
  }
  ${
    state === "pouring"
      ? svg`
    <path
      fill="var(--weather-icon-rain-color, #30b3ff)"
      d="m10.648 16.448c-0.19226 0.21449-0.49001 0.25894-0.66499 0.09878-0.17498-0.16016-0.16087-0.4639 0.03175-0.67874 0.12665-0.14146 0.50694-0.2854 0.75071-0.36724 0.10689-0.03563 0.19473 0.0448 0.17004 0.15558-0.05645 0.25365-0.16051 0.65017-0.28751 0.79163"
    />
    <path
      fill="var(--weather-icon-rain-color, #30b3ff)"
      d="m5.9383 16.658c-0.22437 0.25012-0.5715 0.30162-0.77505 0.11501-0.20391-0.18627-0.18768-0.54046 0.036689-0.79093 0.14817-0.1651 0.59126-0.33267 0.87559-0.42827 0.12418-0.04127 0.22648 0.05221 0.19791 0.18168-0.065617 0.29528-0.18732 0.75741-0.33514 0.92251"
    />
    `
      : ""
  }
  ${
    ["windy", "windy-variant"].includes(state)
      ? svg`
    <path
      fill="var(--weather-icon-cloud-back-color, #d4d4d4)"
      d="m 13.59616,15.30968 c 0,0 -0.09137,-0.0071 -0.250472,-0.0187 -0.158045,-0.01235 -0.381353,-0.02893 -0.64382,-0.05715 -0.262466,-0.02716 -0.564444,-0.06385 -0.877358,-0.124531 -0.156986,-0.03034 -0.315383,-0.06844 -0.473781,-0.111478 -0.157691,-0.04551 -0.313266,-0.09842 -0.463902,-0.161219 l -0.267406,-0.0949 c -0.09984,-0.02646 -0.205669,-0.04904 -0.305153,-0.06738 -0.193322,-0.02716 -0.3838218,-0.03316 -0.5640912,-0.02011 -0.3626556,0.02611 -0.6847417,0.119239 -0.94615,0.226483 -0.2617611,0.108656 -0.4642556,0.230364 -0.600075,0.324203 -0.1358195,0.09419 -0.2049639,0.160514 -0.2049639,0.160514 0,0 0.089958,-0.01623 0.24765,-0.04445 0.1559278,-0.02575 0.3764139,-0.06174 0.6367639,-0.08714 0.2596444,-0.02646 0.5591527,-0.0441 0.8678333,-0.02328 0.076905,0.0035 0.1538111,0.01658 0.2321278,0.02293 0.077611,0.01058 0.1534581,0.02893 0.2314221,0.04022 0.07267,0.01834 0.1397,0.03986 0.213078,0.05644 l 0.238125,0.08925 c 0.09207,0.03281 0.183444,0.07055 0.275872,0.09878 0.09243,0.0261 0.185208,0.05327 0.277636,0.07161 0.184856,0.0388 0.367947,0.06174 0.543983,0.0702 0.353131,0.01905 0.678745,-0.01341 0.951442,-0.06456 0.27305,-0.05292 0.494595,-0.123119 0.646642,-0.181681 0.152047,-0.05785 0.234597,-0.104069 0.234597,-0.104069" />
    <path
      fill="var(--weather-icon-cloud-back-color, #d4d4d4)"
       d="m 4.7519154,13.905801 c 0,0 0.091369,-0.0032 0.2511778,-0.0092 0.1580444,-0.0064 0.3820583,-0.01446 0.6455833,-0.03281 0.2631722,-0.01729 0.5662083,-0.04269 0.8812389,-0.09137 0.1576916,-0.02434 0.3175,-0.05609 0.4776611,-0.09384 0.1591027,-0.03951 0.3167944,-0.08643 0.4699,-0.14358 l 0.2702277,-0.08467 c 0.1008945,-0.02222 0.2074334,-0.04127 0.3072695,-0.05574 0.1943805,-0.01976 0.3848805,-0.0187 0.5651499,0.0014 0.3608917,0.03951 0.67945,0.144639 0.936625,0.261761 0.2575278,0.118534 0.4554364,0.247297 0.5873754,0.346781 0.132291,0.09913 0.198966,0.168275 0.198966,0.168275 0,0 -0.08925,-0.01976 -0.245886,-0.05397 C 9.9423347,14.087088 9.7232597,14.042988 9.4639681,14.00736 9.2057347,13.97173 8.9072848,13.94245 8.5978986,13.95162 c -0.077258,7.06e-4 -0.1541638,0.01058 -0.2328333,0.01411 -0.077964,0.0078 -0.1545166,0.02328 -0.2331861,0.03175 -0.073025,0.01588 -0.1404055,0.03422 -0.2141361,0.04798 l -0.2420055,0.08008 c -0.093486,0.02963 -0.1859139,0.06421 -0.2794,0.0889 C 7.3028516,14.23666 7.2093653,14.2603 7.116232,14.27512 6.9303181,14.30722 6.7465209,14.3231 6.5697792,14.32486 6.2166487,14.33046 5.8924459,14.28605 5.6218654,14.224318 5.3505793,14.161565 5.1318571,14.082895 4.9822793,14.01869 4.8327015,13.95519 4.7519154,13.905801 4.7519154,13.905801" />
    `
      : ""
  }
  ${
    ["snowy", "snowy-rainy"].includes(state)
      ? svg`
    <path d="m 8.4319893,15.348341 c 0,0.257881 -0.209197,0.467079 -0.467078,0.467079 -0.258586,0 -0.46743,-0.209198 -0.46743,-0.467079 0,-0.258233 0.208844,-0.467431 0.46743,-0.467431 0.257881,0 0.467078,0.209198 0.467078,0.467431"/>
    <path d="m 11.263878,14.358553 c 0,0.364067 -0.295275,0.659694 -0.659695,0.659694 -0.364419,0 -0.6596937,-0.295627 -0.6596937,-0.659694 0,-0.364419 0.2952747,-0.659694 0.6596937,-0.659694 0.36442,0 0.659695,0.295275 0.659695,0.659694"/>
    <path d="m 5.3252173,13.69847 c 0,0.364419 -0.295275,0.660047 -0.659695,0.660047 -0.364067,0 -0.659694,-0.295628 -0.659694,-0.660047 0,-0.364067 0.295627,-0.659694 0.659694,-0.659694 0.36442,0 0.659695,0.295627 0.659695,0.659694"/>
    `
      : ""
  }
  </svg>`;
};

export const getWeatherStateIcon = (
  state: string,
  element: HTMLElement
): TemplateResult | undefined => {
  const userDefinedIcon = getComputedStyle(element).getPropertyValue(
    `--weather-icon-${state}`
  );

  if (userDefinedIcon) {
    return html`
      <div style=${styleMap({ "background-image": userDefinedIcon })}></div>
    `;
  }

  if (state in weatherImages) {
    return html`${getWeatherStateSVG(state)}`;
  }

  if (state in weatherIcons) {
    return html`
      <ha-icon class="weather-icon" .icon=${weatherIcons[state]}></ha-icon>
    `;
  }

  return undefined;
};
