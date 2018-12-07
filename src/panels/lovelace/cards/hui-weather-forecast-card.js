import "../../../cards/ha-weather-card";

import LegacyWrapperCard from "./hui-legacy-wrapper-card";

class HuiWeatherForecastCard extends LegacyWrapperCard {
  constructor() {
    super("ha-weather-card", "weather");
  }

  getCardSize() {
    return 4;
  }
}

customElements.define("hui-weather-forecast-card", HuiWeatherForecastCard);
