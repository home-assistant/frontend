import { customElement } from "lit/decorators";
import { HuiConditionalBase } from "../components/hui-conditional-base";
import { createRowElement } from "../create-element/create-row-element";
import type {
  ConditionalRowConfig,
  EntityConfig,
  LovelaceRow,
} from "../entity-rows/types";
import { fireEvent } from "../../../common/dom/fire_event";

type ConditionalColorConfig = ConditionalRowConfig & {
  color?: string;
  state_color?: boolean;
};

type EntityColorConfig = EntityConfig & {
  color?: string;
  state_color?: boolean;
};

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

    const inheritedConfig = config as ConditionalColorConfig;
    const rowConfig = config.row as EntityColorConfig;
    const hasInheritedColorConfig =
      inheritedConfig.state_color !== undefined ||
      inheritedConfig.color !== undefined;
    const hasRowColorConfig =
      rowConfig.state_color !== undefined || rowConfig.color !== undefined;

    this._element = createRowElement(
      hasInheritedColorConfig && !hasRowColorConfig
        ? ({
            ...rowConfig,
            ...(inheritedConfig.color !== undefined
              ? { color: inheritedConfig.color }
              : {}),
            ...(inheritedConfig.state_color !== undefined
              ? { state_color: inheritedConfig.state_color }
              : {}),
          } as EntityConfig)
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
