import { LovelaceCard } from "../types";
import { LovelaceCardConfig, Condition } from "../../../data/lovelace";
import { computeCardSize } from "../common/compute-card-size";
import { HuiConditional } from "../components/hui-conditional";

interface Config extends LovelaceCardConfig {
  card: LovelaceCardConfig;
  conditions: Condition[];
}

class HuiConditionalCard extends HuiConditional implements LovelaceCard {
  public isPanel?: boolean;

  public setConfig(config) {
    // todo: artifically using the above config but it's still important to distinguish between card config and the internal hui-conditional implementation config
    super.setConditionalConfig(config as Config);
  }

  public getCardSize() {
    return computeCardSize(this._card!);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-conditional-card": HuiConditionalCard;
  }
}

customElements.define("hui-conditional-card", HuiConditionalCard);
