import "../../../cards/ha-media_player-card";

import LegacyWrapperCard from "./hui-legacy-wrapper-card";

class HuiMediaControlCard extends LegacyWrapperCard {
  static async getConfigElement() {
    await import(
      /* webpackChunkName: "hui-media-control-card-editor" */ "../editor/config-elements/hui-media-control-card-editor"
    );
    return document.createElement("hui-media-control-card-editor");
  }

  static getStubConfig() {
    return { entity: "" };
  }

  constructor() {
    super("ha-media_player-card", "media_player");
  }
}

customElements.define("hui-media-control-card", HuiMediaControlCard);
