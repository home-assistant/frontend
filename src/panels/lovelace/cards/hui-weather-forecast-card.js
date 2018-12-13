import "../../../cards/ha-weather-card";

import LegacyWrapperCard from "./hui-legacy-wrapper-card";

export const Config = {
  entity: "",
  name: "",
};

class HuiWeatherForecastCard extends LegacyWrapperCard {
  static async getConfigElement() {
    await import("../editor/config-elements/hui-weather-forecast-card-editor");
    return document.createElement("hui-weather-forecast-card-editor");
  }

  static getStubConfig() {
    return {};
  }

  constructor() {
    super("ha-weather-card", "weather");
  }

  getCardSize() {
    return 4;
  }
}

customElements.define("hui-weather-forecast-card", HuiWeatherForecastCard);
