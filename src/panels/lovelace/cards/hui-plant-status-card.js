import "../../../cards/ha-plant-card";

import LegacyWrapperCard from "./hui-legacy-wrapper-card";

// should be interface when converted to TS
export const Config = {
  name: "",
  entity: "",
};

class HuiPlantStatusCard extends LegacyWrapperCard {
  static async getConfigElement() {
    await import("../editor/config-elements/hui-plant-status-card-editor");
    return document.createElement("hui-plant-status-card-editor");
  }

  static getStubConfig() {
    return {};
  }

  constructor() {
    super("ha-plant-card", "plant");
  }
}

customElements.define("hui-plant-status-card", HuiPlantStatusCard);
