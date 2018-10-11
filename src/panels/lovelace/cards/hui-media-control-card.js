import "../../../cards/ha-media_player-card.js";

import LegacyWrapperCard from "./hui-legacy-wrapper-card.js";

class HuiMediaControlCard extends LegacyWrapperCard {
  constructor() {
    super("ha-media_player-card", "media_player");
  }
}

customElements.define("hui-media-control-card", HuiMediaControlCard);
