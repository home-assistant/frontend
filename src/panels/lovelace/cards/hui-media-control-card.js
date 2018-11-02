import "../../../cards/ha-media_player-card";

import LegacyWrapperCard from "./hui-legacy-wrapper-card";

class HuiMediaControlCard extends LegacyWrapperCard {
  constructor() {
    super("ha-media_player-card", "media_player");
  }
}

customElements.define("hui-media-control-card", HuiMediaControlCard);
