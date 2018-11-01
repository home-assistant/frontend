import "../../../cards/ha-plant-card";

import LegacyWrapperCard from "./hui-legacy-wrapper-card";

class HuiPlantStatusCard extends LegacyWrapperCard {
  constructor() {
    super("ha-plant-card", "plant");
  }
}

customElements.define("hui-plant-status-card", HuiPlantStatusCard);
