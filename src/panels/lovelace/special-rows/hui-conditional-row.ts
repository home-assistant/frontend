import { customElement } from "lit/decorators";
import type { EntityCardConfig } from "../cards/types";
import { HuiConditionalBase } from "../components/hui-conditional-base";
import { createRowElement } from "../create-element/create-row-element";
import type {
  ConditionalRowConfig,
  EntityConfig,
  LovelaceRow,
} from "../entity-rows/types";
import { fireEvent } from "../../../common/dom/fire_event";

declare global {
  interface HASSDomEvents {
    "row-visibility-changed": { value: boolean };
  }
}
@customElement("hui-conditional-row")
class HuiConditionalRow extends HuiConditionalBase implements LovelaceRow {
  public setConfig(config: ConditionalRowConfig): void {
    this.validateConfig(config);

    if (!config.row) {
      throw new Error("No row configured");
    }

    this._element = createRowElement(
      (config as EntityCardConfig).state_color
        ? ({
            state_color: true,
            ...(config.row as EntityConfig),
          } as EntityConfig)
        : config.row
    ) as LovelaceRow;
  }

  protected setVisibility(conditionMet: boolean): void {
    const visible = this.preview || conditionMet;
    const previouslyHidden = this.hidden;
    super.setVisibility(conditionMet);
    if (previouslyHidden !== this.hidden) {
      fireEvent(this, "row-visibility-changed", { value: visible });
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-conditional-row": HuiConditionalRow;
  }
}
