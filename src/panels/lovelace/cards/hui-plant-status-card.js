import "../../../cards/ha-plant-card.js";

import LegacyWrapperCard from "./hui-legacy-wrapper-card.js";

class HuiPlantStatusCard extends LegacyWrapperCard {
  constructor() {
    super("ha-plant-card", "plant");
  }
}

customElements.define("hui-plant-status-card", HuiPlantStatusCard);
