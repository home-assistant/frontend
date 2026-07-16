import { customElement } from "lit/decorators";
import type { EntitiesCardEntityConfig } from "../cards/types";
import { migrateStateColorConfig } from "../common/migrate-state-color-config";
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
    "row-visibility-changed": { row: LovelaceRow; value: boolean };
  }
}
@customElement("hui-conditional-row")
class HuiConditionalRow extends HuiConditionalBase implements LovelaceRow {
  public setConfig(config: ConditionalRowConfig): void {
    this.validateConfig(config);

    if (!config.row) {
      throw new Error("No row configured");
    }

    const { color } = migrateStateColorConfig(
      config as EntitiesCardEntityConfig
    );
    const row = config.row as EntitiesCardEntityConfig;

    this._element = createRowElement(
      color !== undefined &&
        row.color === undefined &&
        row.state_color === undefined
        ? ({ ...row, color } as EntityConfig)
        : config.row
    ) as LovelaceRow;
  }

  protected setVisibility(conditionMet: boolean): void {
    const visible = this.preview || conditionMet;
    const previouslyHidden = this.hidden;
    super.setVisibility(conditionMet);
    if (previouslyHidden !== this.hidden) {
      fireEvent(this, "row-visibility-changed", { row: this, value: visible });
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-conditional-row": HuiConditionalRow;
  }
}
